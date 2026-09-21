import { pgTable, text, timestamp, boolean, uuid, integer, bigint, numeric, jsonb, index, uniqueIndex, pgEnum, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { NaoConformidade, ResultadoAnalise } from '@/types/analise-tipos';
import { PORTES_EMPRESA, type RepresentanteLegal, type IdentidadeVisual, type ImpedimentoSancao } from '@/types/empresa-tipos';
import { ESTADOS_PARTICIPACAO, ESFERAS } from '@/types/participacao-tipos';
import { TIPOS_EXIGENCIA, SITUACOES_EXIGENCIA, RISCOS_EXIGENCIA, CONFIANCAS_LEITURA } from '@/types/edital-tipos';
import { ORIGENS_RECURSO, INSTRUMENTOS_RECURSO, SITUACOES_RECURSO, SEMAFOROS_RECURSO, type DotacaoOrcamentaria, type FatorSemaforo } from '@/types/recurso-tipos';
import { TIPOS_DOCUMENTO_DOSSIE, SITUACOES_CHECKLIST, STATUS_ACESSORIA, type DadosBalancoPatrimonial } from '@/types/documento-tipos';
import { FORMAS_GARANTIA, type ResultadoViabilidade } from '@/types/viabilidade-tipos';

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('user'),
    plano: text('plano').notNull().default('gratis'),
    trialExpiresAt: timestamp('trial_expires_at'),
    razaoSocial: text('razao_social'),
    cnpj: text('cnpj'),
    endereco: text('endereco'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Contadores de rate limit do Better Auth. Persistidos no banco (e não em
// memória) porque em serverless cada instância teria seu próprio contador,
// o que permitiria estourar a cota de e-mails do Resend.
export const rateLimit = pgTable('rate_limit', {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    count: integer('count').notNull(),
    lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

export const verification = pgTable('verification', {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// Cache global (entre usuários) das não conformidades já encontradas para um
// mesmo par de documentos (edital + proposta do concorrente), identificado
// pelo hash do conteúdo dos dois PDFs. Evita rechamar a Groq para reanalisar
// documentos idênticos já vistos — o recurso/mensagem final continua sendo
// gerado sempre na hora, pois depende dos dados cadastrais de cada usuário.
export const analiseCache = pgTable('analise_cache', {
    id: uuid('id').primaryKey().defaultRandom(),
    hash: text('hash').notNull().unique(),
    resumo: text('resumo').notNull(),
    naoConformidades: jsonb('nao_conformidades').$type<NaoConformidade[]>().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const analise = pgTable('analise', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    nomeEdital: text('nome_edital').notNull(),
    nomeProposta: text('nome_proposta').notNull(),
    resumo: text('resumo').notNull(),
    totalIrregularidades: integer('total_irregularidades').notNull(),
    totalMaterial: integer('total_material').notNull(),
    totalSanavel: integer('total_sanavel').notNull(),
    resultado: jsonb('resultado').$type<ResultadoAnalise>().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('analise_user_id_idx').on(t.userId),
    index('analise_created_at_idx').on(t.createdAt),
]);

// ── Fundação do LicitPro Análise (Fase 0) ──────────────────────────────────
// Cadastro único de empresa (Regra de ouro do produto) e participação com a
// máquina de 22 estados fechados. Ver LicitPro_Analise_Ferramentas.md, Anexos.

export const porteEmpresaEnum = pgEnum('porte_empresa', PORTES_EMPRESA);
export const esferaEnum = pgEnum('esfera', ESFERAS);
export const estadoParticipacaoEnum = pgEnum('estado_participacao', ESTADOS_PARTICIPACAO);

// Cadastro da empresa. Por ora, um usuário dono por empresa (doneUserId
// único) — suficiente para as ferramentas 1 a 3. Multiusuário por empresa
// (Regra Geral 8, isolamento por organização) fica para quando alguma
// ferramenta exigir de fato mais de um operador por empresa.
export const empresa = pgTable('empresa', {
    id: uuid('id').primaryKey().defaultRandom(),
    donoUserId: text('dono_user_id')
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: 'cascade' }),

    // Identificação
    razaoSocial: text('razao_social'),
    nomeFantasia: text('nome_fantasia'),
    cnpj: text('cnpj'),
    cnaePrincipal: text('cnae_principal'),
    cnaesSecundarios: text('cnaes_secundarios').array(),
    porte: porteEmpresaEnum('porte'),
    elegibilidadeTratamentoFavorecido: boolean('elegibilidade_tratamento_favorecido'),
    regimeTributario: text('regime_tributario'),

    // Documental
    endereco: text('endereco'),
    certificadoIcpBrasilValido: boolean('certificado_icp_brasil_valido'),
    representanteLegal: jsonb('representante_legal').$type<RepresentanteLegal>(),
    identidadeVisual: jsonb('identidade_visual').$type<IdentidadeVisual>(),

    // Elegibilidade
    impedimentosSancoes: jsonb('impedimentos_sancoes').$type<ImpedimentoSancao[]>(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Participação num certame — o "objeto" central que todas as 17 ferramentas
// vão anexar dado. Campos aqui cobrem só o necessário para a Ferramenta 1
// (Radar de Editais); os demais crescem fase a fase.
export const participacao = pgTable('participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
        .notNull()
        .references(() => empresa.id, { onDelete: 'cascade' }),
    criadoPorUserId: text('criado_por_user_id')
        .notNull()
        .references(() => user.id),

    estado: estadoParticipacaoEnum('estado').notNull().default('identificada'),

    // Dados vindos do PNCP (ou de importação manual) na Ferramenta 1
    numeroControlePncp: text('numero_controle_pncp'),
    orgao: text('orgao').notNull(),
    municipio: text('municipio'),
    uf: text('uf'),
    esfera: esferaEnum('esfera'),
    objeto: text('objeto').notNull(),
    modalidade: text('modalidade'),
    numeroProcesso: text('numero_processo'),
    plataforma: text('plataforma'),
    valorEstimado: numeric('valor_estimado', { precision: 14, scale: 2 }),
    dataSessaoEm: timestamp('data_sessao_em', { withTimezone: true }),
    fusoEdital: text('fuso_edital'),
    linkEdital: text('link_edital'),
    linkPortalOrigem: text('link_portal_origem'),

    // "O que fica guardado": quem clicou em analisar a fundo, e quando.
    analisadoPorUserId: text('analisado_por_user_id').references(() => user.id),
    analisadoEm: timestamp('analisado_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('participacao_empresa_id_idx').on(t.empresaId),
    index('participacao_estado_idx').on(t.estado),
    index('participacao_data_sessao_idx').on(t.dataSessaoEm),
    uniqueIndex('participacao_empresa_pncp_unique').on(t.empresaId, t.numeroControlePncp),
]);

// ── Ferramenta 1, Radar de Editais ─────────────────────────────────────────

// Tabela mantida pela Arumã (não por empresa) — o que buscar e o que não
// trazer, na linguagem que o órgão usa no edital, por CNAE.
export const cnaePorObjeto = pgTable('cnae_por_objeto', {
    id: uuid('id').primaryKey().defaultRandom(),
    cnae: text('cnae').notNull().unique(),
    descricao: text('descricao'),
    busca: text('busca').array().notNull(),
    naoTraz: text('nao_traz').array().notNull(),
    // false quando a linha foi gerada automaticamente (a partir da descrição
    // e das atividades do IBGE), na primeira vez que alguém ativou o radar
    // com aquele CNAE — ainda sem revisão humana. true para o que a Arumã
    // cadastrou/revisou à mão (ex: os exemplos hortifruti e obras).
    curadoManualmente: boolean('curado_manualmente').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 3, Leitura do Edital ────────────────────────────────────────

export const tipoExigenciaEnum = pgEnum('tipo_exigencia', TIPOS_EXIGENCIA);
export const situacaoExigenciaEnum = pgEnum('situacao_exigencia', SITUACOES_EXIGENCIA);
export const riscoExigenciaEnum = pgEnum('risco_exigencia', RISCOS_EXIGENCIA);
export const confiancaLeituraEnum = pgEnum('confianca_leitura', CONFIANCAS_LEITURA);

// Um edital por participação — o texto extraído (com marcação [[PÁGINA N]])
// fica guardado para permitir reprocessar/conferir sem pedir upload de novo.
export const edital = pgTable('edital', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),
    enviadoPorUserId: text('enviado_por_user_id')
        .notNull()
        .references(() => user.id),

    nomeArquivo: text('nome_arquivo').notNull(),
    hash: text('hash').notNull(),
    numPaginas: integer('num_paginas').notNull(),
    textoExtraido: text('texto_extraido').notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Uma linha por exigência da matriz de conformidade (Ferramenta 3). A IA
// extrai a exigência; ela NUNCA conclui sozinha se a empresa atende — por
// isso `situacao` nasce em 'a_verificar' e só muda por ação humana
// (conferidoPorUserId/conferidoEm), mesmo quando a confiança da leitura é alta.
export const exigenciaEdital = pgTable('exigencia_edital', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    ordem: integer('ordem').notNull(),
    titulo: text('titulo').notNull(),
    tipo: tipoExigenciaEnum('tipo').notNull(),
    obrigatorio: boolean('obrigatorio').notNull().default(true),
    oQueExige: text('o_que_exige').notNull(),
    criterioAceitacao: text('criterio_aceitacao'),
    trecho: text('trecho').notNull(),
    pagina: integer('pagina'),
    clausula: text('clausula'),

    risco: riscoExigenciaEnum('risco').notNull(),
    confianca: confiancaLeituraEnum('confianca').notNull(),
    requerVerificacaoManual: boolean('requer_verificacao_manual').notNull().default(false),

    situacao: situacaoExigenciaEnum('situacao').notNull().default('a_verificar'),
    conferidoPorUserId: text('conferido_por_user_id').references(() => user.id),
    conferidoEm: timestamp('conferido_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('exigencia_edital_participacao_id_idx').on(t.participacaoId),
    index('exigencia_edital_risco_idx').on(t.risco),
]);

// ── Ferramenta 2, Ficha do Recurso ─────────────────────────────────────────

export const origemRecursoEnum = pgEnum('origem_recurso', ORIGENS_RECURSO);
export const instrumentoRecursoEnum = pgEnum('instrumento_recurso', INSTRUMENTOS_RECURSO);
export const situacaoRecursoEnum = pgEnum('situacao_recurso', SITUACOES_RECURSO);
export const semaforoRecursoEnum = pgEnum('semaforo_recurso', SEMAFOROS_RECURSO);

// Uma ficha por participação. `dotacaoOrcamentaria` nasce da IA lendo o
// edital (lib/extrair-dotacao.ts); os demais campos são sempre preenchidos
// pelo operador — o semáforo nunca bloqueia, só avisa (Regra da Ferramenta 2).
export const fichaRecurso = pgTable('ficha_recurso', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    dotacaoOrcamentaria: jsonb('dotacao_orcamentaria').$type<DotacaoOrcamentaria>(),

    origem: origemRecursoEnum('origem'),
    origemPercentuais: jsonb('origem_percentuais').$type<Record<string, number>>(),
    instrumento: instrumentoRecursoEnum('instrumento'),
    situacao: situacaoRecursoEnum('situacao'),
    numeroInstrumento: text('numero_instrumento'),
    valorRecurso: numeric('valor_recurso', { precision: 14, scale: 2 }),
    vigenciaEm: timestamp('vigencia_em', { withTimezone: true }),
    prazoEstimadoPagamentoEm: timestamp('prazo_estimado_pagamento_em', { withTimezone: true }),
    // Sem infraestrutura de arquivo/blob no projeto (mesma limitação já
    // documentada na Leitura do Edital) — evidência aceita link ou descrição
    // em texto, não upload de arquivo.
    evidencia: text('evidencia'),

    semaforo: semaforoRecursoEnum('semaforo'),
    semaforoFatores: jsonb('semaforo_fatores').$type<FatorSemaforo[]>(),

    cienciaConfirmada: boolean('ciencia_confirmada').notNull().default(false),
    cienciaConfirmadaPorUserId: text('ciencia_confirmada_por_user_id').references(() => user.id),
    cienciaConfirmadaEm: timestamp('ciencia_confirmada_em', { withTimezone: true }),
    cienciaSemaforo: semaforoRecursoEnum('ciencia_semaforo'),
    cienciaFatores: jsonb('ciencia_fatores').$type<FatorSemaforo[]>(),

    anotacaoOperador: text('anotacao_operador'),
    anotacaoAutorId: text('anotacao_autor_id').references(() => user.id),
    anotacaoEm: timestamp('anotacao_em', { withTimezone: true }),

    preenchidoPorUserId: text('preenchido_por_user_id').references(() => user.id),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Filtros do radar, um por empresa. "Ativar radar" grava aqui e dispara a
// busca; os resultados viram linhas em `participacao` (estado inicial
// 'identificada').
export const radarConfig = pgTable('radar_config', {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
        .notNull()
        .unique()
        .references(() => empresa.id, { onDelete: 'cascade' }),

    modoBusca: text('modo_busca').notNull().default('cnae'), // 'cnae' | 'livre'
    esfera: esferaEnum('esfera'),
    estados: text('estados').array().notNull().default([]),
    orgaosIncluir: text('orgaos_incluir').array().notNull().default([]),
    orgaosExcluir: text('orgaos_excluir').array().notNull().default([]),
    textoLivre: text('texto_livre'),
    faixaValorMin: numeric('faixa_valor_min', { precision: 14, scale: 2 }),
    faixaValorMax: numeric('faixa_valor_max', { precision: 14, scale: 2 }),
    ativo: boolean('ativo').notNull().default(false),
    ultimaExecucaoEm: timestamp('ultima_execucao_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 6, Preparação Documental ────────────────────────────────────

export const tipoDocumentoDossieEnum = pgEnum('tipo_documento_dossie', TIPOS_DOCUMENTO_DOSSIE);
export const situacaoChecklistEnum = pgEnum('situacao_checklist', SITUACOES_CHECKLIST);
export const statusAcessoriaEnum = pgEnum('status_acessoria', STATUS_ACESSORIA);

// Dossiê documental — pertence à empresa (não à participação), reaproveitado
// em todas as licitações. "Documento renovado nunca substitui sozinho": a
// renovação cria uma linha nova (substituiDocumentoId aponta pra anterior) e
// desativa a antiga, preservando o que já foi usado numa proposta enviada.
export const documentoEmpresa = pgTable('documento_empresa', {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
        .notNull()
        .references(() => empresa.id, { onDelete: 'cascade' }),

    tipo: tipoDocumentoDossieEnum('tipo').notNull(),
    nome: text('nome').notNull(),
    numero: text('numero'),
    // null = documento sem validade (ex: contrato social).
    validadeEm: timestamp('validade_em', { withTimezone: true }),
    // Sem infraestrutura de arquivo/blob no projeto — evidência aceita link
    // ou descrição em texto, mesma limitação já documentada no edital.
    evidencia: text('evidencia'),
    dadosBalanco: jsonb('dados_balanco').$type<DadosBalancoPatrimonial>(),

    ativo: boolean('ativo').notNull().default(true),
    substituiDocumentoId: uuid('substitui_documento_id').references((): AnyPgColumn => documentoEmpresa.id),

    criadoPorUserId: text('criado_por_user_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('documento_empresa_empresa_id_idx').on(t.empresaId),
    index('documento_empresa_tipo_idx').on(t.tipo),
]);

// Uma linha por exigência de habilitação da matriz (Ferramenta 3) — o
// checklist "vem da matriz, não é digitado de novo" (Regra da Ferramenta 6).
// `situacao` só sai de 'a_verificar' quando o vínculo foi feito/confirmado
// por um humano — vínculo sugerido automaticamente pelo sistema (heurística
// por palavra-chave) nasce sempre como 'a_verificar', mesmo com documento
// já associado (mesmo princípio da Regra Geral 5: o sistema sugere, não conclui).
export const checklistParticipacao = pgTable('checklist_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),
    exigenciaEditalId: uuid('exigencia_edital_id')
        .notNull()
        .unique()
        .references(() => exigenciaEdital.id, { onDelete: 'cascade' }),
    documentoEmpresaId: uuid('documento_empresa_id').references(() => documentoEmpresa.id),

    situacao: situacaoChecklistEnum('situacao').notNull().default('a_verificar'),
    // Único marco estruturado disponível hoje é a data da sessão
    // (participacao.dataSessaoEm) — prazo de habilitação, de convocação e
    // data de assinatura ainda não são campos estruturados (dependem das
    // Ferramentas 9/12/13) e entram aqui quando existirem.
    marcoValidadoContra: text('marco_validado_contra'),
    marcoDataEm: timestamp('marco_data_em', { withTimezone: true }),

    vinculadoAutomaticamente: boolean('vinculado_automaticamente').notNull().default(false),
    vinculadoPorUserId: text('vinculado_por_user_id').references(() => user.id),
    vinculadoEm: timestamp('vinculado_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('checklist_participacao_participacao_id_idx').on(t.participacaoId),
    index('checklist_participacao_situacao_idx').on(t.situacao),
]);

// Uma linha por exigência acessória da matriz (tipo = 'acessoria': garantia,
// amostra, POC, visita técnica) — bloco separado porque não é documento.
export const acessoriaParticipacao = pgTable('acessoria_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),
    exigenciaEditalId: uuid('exigencia_edital_id')
        .notNull()
        .unique()
        .references(() => exigenciaEdital.id, { onDelete: 'cascade' }),

    status: statusAcessoriaEnum('status').notNull().default('pendente'),
    prazoLimiteEm: timestamp('prazo_limite_em', { withTimezone: true }),
    custoEstimado: numeric('custo_estimado', { precision: 14, scale: 2 }),
    responsavel: text('responsavel'),
    comprovante: text('comprovante'),
    justificativa: text('justificativa'),

    marcadoPorUserId: text('marcado_por_user_id').references(() => user.id),
    marcadoEm: timestamp('marcado_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('acessoria_participacao_participacao_id_idx').on(t.participacaoId),
]);

// ── Ferramenta 4, Viabilidade Financeira e Retorno ─────────────────────────

export const formaGarantiaEnum = pgEnum('forma_garantia', FORMAS_GARANTIA);

// Dados financeiros da empresa que alimentam toda participação (podem ser
// ajustados por participação na hora de calcular). Tributo é sempre
// informado pelo contador, nunca calculado pelo sistema — por isso guarda
// quem informou e quando, com aviso de revisão depois de 6 meses.
export const perfilFinanceiroEmpresa = pgTable('perfil_financeiro_empresa', {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
        .notNull()
        .unique()
        .references(() => empresa.id, { onDelete: 'cascade' }),

    aliquotaEfetivaPercentual: numeric('aliquota_efetiva_percentual', { precision: 5, scale: 2 }),
    aliquotaInformadaPorUserId: text('aliquota_informada_por_user_id').references(() => user.id),
    aliquotaInformadaEm: timestamp('aliquota_informada_em', { withTimezone: true }),

    custoFixoMensal: numeric('custo_fixo_mensal', { precision: 14, scale: 2 }),
    faturamentoMedioMensal: numeric('faturamento_medio_mensal', { precision: 14, scale: 2 }),
    custoDinheiroMensalPercentual: numeric('custo_dinheiro_mensal_percentual', { precision: 5, scale: 2 }),
    contingenciaPadraoPercentual: numeric('contingencia_padrao_percentual', { precision: 5, scale: 2 }).notNull().default('3'),
    perdaEsperadaPadraoPercentual: numeric('perda_esperada_padrao_percentual', { precision: 5, scale: 2 }),
    margemMinimaPercentual: numeric('margem_minima_percentual', { precision: 5, scale: 2 }),

    capitalDisponivelPadrao: numeric('capital_disponivel_padrao', { precision: 14, scale: 2 }),
    retornoDesejadoPadraoPercentual: numeric('retorno_desejado_padrao_percentual', { precision: 5, scale: 2 }),
    prazoMaximoSemCaixaDias: integer('prazo_maximo_sem_caixa_dias'),
    caixaLivre: numeric('caixa_livre', { precision: 14, scale: 2 }),
    creditoDisponivel: numeric('credito_disponivel', { precision: 14, scale: 2 }),
    estoqueAtualValor: numeric('estoque_atual_valor', { precision: 14, scale: 2 }),
    capacidadeEntregaMensal: numeric('capacidade_entrega_mensal', { precision: 14, scale: 2 }),
    indicesBalanco: jsonb('indices_balanco').$type<Record<string, number>>(),

    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Histórico de cotações de fornecedor — reaproveitado entre participações.
// "Ao digitar o mesmo fornecedor e item de novo, aparece o histórico ao lado."
export const cotacaoFornecedor = pgTable('cotacao_fornecedor', {
    id: uuid('id').primaryKey().defaultRandom(),
    empresaId: uuid('empresa_id')
        .notNull()
        .references(() => empresa.id, { onDelete: 'cascade' }),

    fornecedor: text('fornecedor').notNull(),
    item: text('item').notNull(),
    valorUnitario: numeric('valor_unitario', { precision: 14, scale: 4 }).notNull(),
    cotadoEm: timestamp('cotado_em', { withTimezone: true }).notNull(),
    validaAteEm: timestamp('valida_ate_em', { withTimezone: true }),

    criadoPorUserId: text('criado_por_user_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('cotacao_fornecedor_empresa_id_idx').on(t.empresaId),
    index('cotacao_fornecedor_item_idx').on(t.item),
]);

// Uma por participação. Guarda os insumos digitados pelo operador e o
// snapshot do último cálculo (composição, piso/alvo/teto, cenários,
// retorno) — recalculado a cada PATCH, nunca calculado por IA.
export const viabilidadeParticipacao = pgTable('viabilidade_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    quantidadeTotal: numeric('quantidade_total', { precision: 14, scale: 4 }),
    unidade: text('unidade'),
    cotacaoFornecedorId: uuid('cotacao_fornecedor_id').references(() => cotacaoFornecedor.id),
    custoAquisicaoUnitario: numeric('custo_aquisicao_unitario', { precision: 14, scale: 4 }),
    freteTotal: numeric('frete_total', { precision: 14, scale: 2 }),
    numeroEntregas: integer('numero_entregas').notNull().default(1),
    armazenagemTotal: numeric('armazenagem_total', { precision: 14, scale: 2 }),
    maoObraTotal: numeric('mao_obra_total', { precision: 14, scale: 2 }),
    prazoPagamentoFornecedorDias: integer('prazo_pagamento_fornecedor_dias'),
    prazoRecebimentoDias: integer('prazo_recebimento_dias'),
    formaGarantia: formaGarantiaEnum('forma_garantia').notNull().default('nenhuma'),
    custoGarantia: numeric('custo_garantia', { precision: 14, scale: 2 }),
    valorGarantiaCaucao: numeric('valor_garantia_caucao', { precision: 14, scale: 2 }),
    tetoEdital: numeric('teto_edital', { precision: 14, scale: 2 }),
    precoOfertadoUnitario: numeric('preco_ofertado_unitario', { precision: 14, scale: 4 }),
    estoqueJaDisponivelValor: numeric('estoque_ja_disponivel_valor', { precision: 14, scale: 2 }),

    // Premissas — nascem do perfil financeiro da empresa, ajustáveis aqui.
    perdaEsperadaPercentual: numeric('perda_esperada_percentual', { precision: 5, scale: 2 }),
    contingenciaPercentual: numeric('contingencia_percentual', { precision: 5, scale: 2 }),
    margemMinimaPercentual: numeric('margem_minima_percentual', { precision: 5, scale: 2 }),
    aliquotaEfetivaPercentual: numeric('aliquota_efetiva_percentual', { precision: 5, scale: 2 }),
    capitalDisponivel: numeric('capital_disponivel', { precision: 14, scale: 2 }),
    retornoDesejadoPercentual: numeric('retorno_desejado_percentual', { precision: 5, scale: 2 }),
    cenarioConservadorFornecedorPercentual: numeric('cenario_conservador_fornecedor_percentual', { precision: 5, scale: 2 }).notNull().default('10'),
    cenarioConservadorPrazoPercentual: numeric('cenario_conservador_prazo_percentual', { precision: 5, scale: 2 }).notNull().default('50'),
    cenarioConservadorPerdaPontosPercentuais: numeric('cenario_conservador_perda_pontos_percentuais', { precision: 5, scale: 2 }).notNull().default('2'),

    // Depois da sessão — "Comparar com o vencedor" (dá base, não conclusão).
    precoVencedorUnitario: numeric('preco_vencedor_unitario', { precision: 14, scale: 4 }),

    resultado: jsonb('resultado').$type<ResultadoViabilidade>(),

    cienciaEstouroConfirmada: boolean('ciencia_estouro_confirmada').notNull().default(false),
    cienciaEstouroPorUserId: text('ciencia_estouro_por_user_id').references(() => user.id),
    cienciaEstouroEm: timestamp('ciencia_estouro_em', { withTimezone: true }),

    atualizadoPorUserId: text('atualizado_por_user_id').references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
