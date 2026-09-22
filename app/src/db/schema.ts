import { pgTable, text, timestamp, boolean, uuid, integer, bigint, numeric, jsonb, index, uniqueIndex, pgEnum, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { NaoConformidade, ResultadoAnalise } from '@/types/analise-tipos';
import { PORTES_EMPRESA, type RepresentanteLegal, type IdentidadeVisual, type ImpedimentoSancao } from '@/types/empresa-tipos';
import { ESTADOS_PARTICIPACAO, ESFERAS } from '@/types/participacao-tipos';
import { TIPOS_EXIGENCIA, SITUACOES_EXIGENCIA, RISCOS_EXIGENCIA, CONFIANCAS_LEITURA } from '@/types/edital-tipos';
import { ORIGENS_RECURSO, INSTRUMENTOS_RECURSO, SITUACOES_RECURSO, SEMAFOROS_RECURSO, type DotacaoOrcamentaria, type FatorSemaforo } from '@/types/recurso-tipos';
import { TIPOS_DOCUMENTO_DOSSIE, SITUACOES_CHECKLIST, STATUS_ACESSORIA, type DadosBalancoPatrimonial } from '@/types/documento-tipos';
import { FORMAS_GARANTIA, type ResultadoViabilidade } from '@/types/viabilidade-tipos';
import { DECISOES_PARTICIPACAO, MOTIVOS_NAO_PARTICIPAR, STATUS_APROVACAO_EMPRESA, type AlertaDecisao, type NumerosCongeladosDecisao } from '@/types/decisao-tipos';
import { type ItemPrecoSnapshot, type TotaisPlanilhaPrecos } from '@/types/preco-tipos';
import { type PecaMontagem, type ChecagemFinalProposta } from '@/types/proposta-tipos';
import { METODOS_EXIGENCIA_ASSINATURA, METODOS_ASSINATURA_USADOS, STATUS_ASSINATURA_PECA, STATUS_APROVACAO_PROPOSTA } from '@/types/assinatura-tipos';
import { SITUACOES_RESULTADO_SESSAO } from '@/types/sessao-tipos';
import { RESULTADOS_HABILITACAO } from '@/types/habilitacao-tipos';
import { ESTADOS_RECURSO_FASE, RESULTADOS_DECISAO_RECURSAL } from '@/types/recurso-fase-tipos';
import { RESULTADOS_DESFECHO, TIPOS_CONTRATO } from '@/types/resultado-tipos';

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

// ── Ferramenta 5, Decisão de Participar ─────────────────────────────────────

export const decisaoParticipacaoTipoEnum = pgEnum('decisao_participacao_tipo', DECISOES_PARTICIPACAO);
export const motivoNaoParticiparEnum = pgEnum('motivo_nao_participar', MOTIVOS_NAO_PARTICIPAR);
export const statusAprovacaoEmpresaEnum = pgEnum('status_aprovacao_empresa', STATUS_APROVACAO_EMPRESA);

// Não é tela de preenchimento — só reúne o que as Ferramentas 1 a 4 já
// produziram e registra a decisão. "Os números da decisão ficam
// congelados no registro": `numerosCongelados` e `alertasAtivos` guardam o
// que estava na tela no exato momento, para reconstituir o que se sabia
// naquele dia (Regras da Ferramenta 5).
export const decisaoParticipacao = pgTable('decisao_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    decisao: decisaoParticipacaoTipoEnum('decisao').notNull(),
    motivoNaoParticipar: motivoNaoParticiparEnum('motivo_nao_participar'),
    motivoOutro: text('motivo_outro'),
    dataRetomadaEm: timestamp('data_retomada_em', { withTimezone: true }),

    alertasAtivos: jsonb('alertas_ativos').$type<AlertaDecisao[]>().notNull().default([]),
    cienciaAlertaConfirmada: boolean('ciencia_alerta_confirmada').notNull().default(false),
    numerosCongelados: jsonb('numeros_congelados').$type<NumerosCongeladosDecisao>().notNull(),

    // Sem portal do cliente no sistema (mesma limitação já documentada na
    // Preparação Documental) — a aprovação é registrada manualmente pelo
    // operador a partir do que a empresa respondeu por fora do sistema.
    aprovacaoStatus: statusAprovacaoEmpresaEnum('aprovacao_status').notNull().default('nao_enviada'),
    aprovacaoObservacao: text('aprovacao_observacao'),
    aprovacaoRegistradaPorUserId: text('aprovacao_registrada_por_user_id').references(() => user.id),
    aprovacaoRegistradaEm: timestamp('aprovacao_registrada_em', { withTimezone: true }),

    decididoPorUserId: text('decidido_por_user_id').notNull().references(() => user.id),
    decididoEm: timestamp('decidido_em', { withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 7, Composição de Preço ──────────────────────────────────────

// Uma linha por item/lote — cadastrado pelo operador (ver nota de escopo em
// types/preco-tipos.ts). "O preço é digitado aqui, o custo vem da
// viabilidade": custo/piso/alvo nascem do que a Ferramenta 4 calculou, mas
// ficam editáveis por item porque a viabilidade hoje só calcula um agregado.
export const itemPrecoParticipacao = pgTable('item_preco_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    ordem: integer('ordem').notNull().default(0),
    descricao: text('descricao').notNull(),
    unidade: text('unidade'),
    quantidade: numeric('quantidade', { precision: 14, scale: 4 }).notNull().default('1'),
    marcaModelo: text('marca_modelo'),

    custoUnitario: numeric('custo_unitario', { precision: 14, scale: 4 }),
    pisoUnitario: numeric('piso_unitario', { precision: 14, scale: 4 }),
    alvoUnitario: numeric('alvo_unitario', { precision: 14, scale: 4 }),
    tetoUnitario: numeric('teto_unitario', { precision: 14, scale: 4 }),
    precoOfertado: numeric('preco_ofertado', { precision: 14, scale: 4 }),

    precoDefinidoPorUserId: text('preco_definido_por_user_id').references(() => user.id),
    precoDefinidoEm: timestamp('preco_definido_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('item_preco_participacao_participacao_id_idx').on(t.participacaoId),
]);

// Toda geração cria versão (proposta aprovada não é alterada). Não existe
// storage de blob no projeto — o arquivo gerado é um XLSX pequeno, então
// fica guardado em base64 direto no banco em vez de subir infraestrutura
// nova só para isto.
export const versaoPlanilhaPrecos = pgTable('versao_planilha_precos', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    versao: integer('versao').notNull(),
    arquivoNome: text('arquivo_nome').notNull(),
    arquivoBase64: text('arquivo_base64').notNull(),
    usouModeloEdital: boolean('usou_modelo_edital').notNull().default(false),
    snapshotItens: jsonb('snapshot_itens').$type<ItemPrecoSnapshot[]>().notNull(),
    totais: jsonb('totais').$type<TotaisPlanilhaPrecos>().notNull(),

    geradoPorUserId: text('gerado_por_user_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('versao_planilha_precos_participacao_id_idx').on(t.participacaoId),
    uniqueIndex('versao_planilha_precos_participacao_versao_unique').on(t.participacaoId, t.versao),
]);

// ── Ferramenta 8, Montagem da Proposta ─────────────────────────────────────

// Toda geração cria versão; versão aprovada não é alterada. Mesmo raciocínio
// de armazenamento da planilha de preços: PDF pequeno guardado em base64.
export const versaoProposta = pgTable('versao_proposta', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    versao: integer('versao').notNull(),
    arquivoNome: text('arquivo_nome').notNull(),
    arquivoBase64: text('arquivo_base64').notNull(),
    pecas: jsonb('pecas').$type<PecaMontagem[]>().notNull(),
    checagem: jsonb('checagem').$type<ChecagemFinalProposta>().notNull(),
    aprovada: boolean('aprovada').notNull().default(false),

    geradoPorUserId: text('gerado_por_user_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('versao_proposta_participacao_id_idx').on(t.participacaoId),
    uniqueIndex('versao_proposta_participacao_versao_unique').on(t.participacaoId, t.versao),
]);

// ── Ferramenta 9, Aprovação e Assinatura ───────────────────────────────────

export const statusAprovacaoPropostaEnum = pgEnum('status_aprovacao_proposta', STATUS_APROVACAO_PROPOSTA);
export const metodoExigenciaAssinaturaEnum = pgEnum('metodo_exigencia_assinatura', METODOS_EXIGENCIA_ASSINATURA);
export const metodoAssinaturaUsadoEnum = pgEnum('metodo_assinatura_usado', METODOS_ASSINATURA_USADOS);
export const statusAssinaturaPecaEnum = pgEnum('status_assinatura_peca', STATUS_ASSINATURA_PECA);

// Aprovação comercial é decisão separada da assinatura formal (podem ser a
// mesma pessoa, mas são registros diferentes — Regras da Ferramenta 9). Sem
// `can_approve_proposals` no sistema ainda (não há papéis/permissões
// granulares) — qualquer usuário da empresa pode registrar por enquanto,
// documentado como limitação, não escondido.
export const aprovacaoProposta = pgTable('aprovacao_proposta', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),
    versaoPropostaId: uuid('versao_proposta_id')
        .notNull()
        .references(() => versaoProposta.id),

    status: statusAprovacaoPropostaEnum('status').notNull().default('aguardando'),
    observacao: text('observacao'),
    motivoRecusa: text('motivo_recusa'),

    decididoPorUserId: text('decidido_por_user_id').references(() => user.id),
    decididoEm: timestamp('decidido_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Uma linha por peça da lista de montagem (Ferramenta 8). O método exigido
// nasce de uma classificação padrão por tipo de peça (proposta/planilha
// exigem assinatura do representante legal; documentos do dossiê não
// exigem, por enquanto — ver lib/classificacao-assinatura.ts) e pode ser
// sobrescrito, porque "o edital sempre prevalece" e a Ferramenta 3 ainda não
// captura o método de assinatura por exigência.
export const assinaturaPeca = pgTable('assinatura_peca', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),
    peca: text('peca').notNull(),

    metodoExigido: metodoExigenciaAssinaturaEnum('metodo_exigido').notNull().default('nao_requer'),
    metodoExigidoSobrescritoPorUserId: text('metodo_exigido_sobrescrito_por_user_id').references(() => user.id),

    status: statusAssinaturaPecaEnum('status').notNull().default('pendente'),
    assinadoPorNome: text('assinado_por_nome'),
    assinadoEm: timestamp('assinado_em', { withTimezone: true }),
    metodoUsado: metodoAssinaturaUsadoEnum('metodo_usado'),
    linkValidacao: text('link_validacao'),
    arquivoAssinadoNome: text('arquivo_assinado_nome'),
    arquivoAssinadoBase64: text('arquivo_assinado_base64'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('assinatura_peca_participacao_id_idx').on(t.participacaoId),
    uniqueIndex('assinatura_peca_participacao_peca_unique').on(t.participacaoId, t.peca),
]);

// ── Ferramenta 11, Preparação do Arquivo para Upload ───────────────────────

// Mantida pela Arumã (tarefa de verificação prévia listada nos Anexos do
// doc do produto) — começa só com o que o próprio doc já registra como
// fato público; plataformas sem limite confirmado ficam com os campos nulos
// e a observação avisando, em vez de inventar um número.
export const plataformaCompra = pgTable('plataforma_compra', {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull().unique(),
    tamanhoMaximoMb: integer('tamanho_maximo_mb'),
    formatosAceitos: text('formatos_aceitos').array().notNull().default([]),
    aceitaZip: boolean('aceita_zip'),
    exigeArquivoSeparado: boolean('exige_arquivo_separado').notNull().default(true),
    regrasNomenclatura: text('regras_nomenclatura'),
    resolucaoMinima: text('resolucao_minima'),
    observacoes: text('observacoes'),
    ultimaConferenciaEm: timestamp('ultima_conferencia_em', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 10, Envio ───────────────────────────────────────────────────

// O sistema nunca envia sozinho — só confere e registra o que o operador fez
// manualmente no portal, com a credencial da empresa (Regras da Ferramenta 10).
export const envioParticipacao = pgTable('envio_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    prazoFinalEnvioEm: timestamp('prazo_final_envio_em', { withTimezone: true }),

    dataHoraEnvioEm: timestamp('data_hora_envio_em', { withTimezone: true }),
    numeroProtocolo: text('numero_protocolo'),
    comprovanteTexto: text('comprovante_texto'),
    comprovanteArquivoNome: text('comprovante_arquivo_nome'),
    comprovanteArquivoBase64: text('comprovante_arquivo_base64'),
    enviadoPorUserId: text('enviado_por_user_id').references(() => user.id),
    observacao: text('observacao'),

    naoEnviadaMotivo: text('nao_enviada_motivo'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 12, Registro da Sessão ───────────────────────────────────────

export const situacaoResultadoSessaoEnum = pgEnum('situacao_resultado_sessao', SITUACOES_RESULTADO_SESSAO);

// Só registro pós-fato — nunca acompanhamento ao vivo (Regra Geral 1). Uma
// linha por participação; convocação de anexo é um bloco à parte porque
// entra na central de alertas com criticidade máxima e prazo próprio.
export const registroSessao = pgTable('registro_sessao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    horarioAberturaEm: timestamp('horario_abertura_em', { withTimezone: true }),
    horarioEncerramentoEm: timestamp('horario_encerramento_em', { withTimezone: true }),
    quantidadeParticipantes: integer('quantidade_participantes'),
    lanceFinalEmpresa: numeric('lance_final_empresa', { precision: 14, scale: 2 }),
    menorLanceDisputa: numeric('menor_lance_disputa', { precision: 14, scale: 2 }),
    classificacaoObtida: text('classificacao_obtida'),
    houveNegociacao: boolean('houve_negociacao').notNull().default(false),
    valorNegociado: numeric('valor_negociado', { precision: 14, scale: 2 }),
    valorVencedor: numeric('valor_vencedor', { precision: 14, scale: 2 }),
    ocorrencias: text('ocorrencias'),
    anotacaoLivre: text('anotacao_livre'),

    resultadoSituacao: situacaoResultadoSessaoEnum('resultado_situacao'),
    resultadoMotivo: text('resultado_motivo'),

    registradoPorUserId: text('registrado_por_user_id').references(() => user.id),
    registradoEm: timestamp('registrado_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Convocação de anexo pós-sessão — criticidade máxima, prazo curto.
export const convocacaoAnexoSessao = pgTable('convocacao_anexo_sessao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    dataHoraConvocacaoEm: timestamp('data_hora_convocacao_em', { withTimezone: true }).notNull(),
    prazoLimiteEm: timestamp('prazo_limite_em', { withTimezone: true }).notNull(),
    oQueFoiSolicitado: text('o_que_foi_solicitado').notNull(),
    atendidoEm: timestamp('atendido_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('convocacao_anexo_sessao_participacao_id_idx').on(t.participacaoId),
]);

// ── Ferramenta 13, Habilitação ──────────────────────────────────────────────

export const resultadoHabilitacaoEnum = pgEnum('resultado_habilitacao', RESULTADOS_HABILITACAO);

// A revalidação documento-a-documento reaproveita checklist_participacao +
// documento_empresa (calcularSituacaoChecklist com marco = hoje, em vez do
// marco da sessão) — não duplica tabela. Esta guarda só o resultado final.
export const habilitacaoParticipacao = pgTable('habilitacao_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    resultado: resultadoHabilitacaoEnum('resultado'),
    motivoInabilitacao: text('motivo_inabilitacao'),

    registradoPorUserId: text('registrado_por_user_id').references(() => user.id),
    registradoEm: timestamp('registrado_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Convocação do pregoeiro para envio de documento de habilitação —
// criticidade máxima, prazo curto (mesmo formato de convocacao_anexo_sessao,
// tabela própria porque o contexto é outro: habilitação, não sessão).
export const convocacaoPregoeiro = pgTable('convocacao_pregoeiro', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    dataHoraConvocacaoEm: timestamp('data_hora_convocacao_em', { withTimezone: true }).notNull(),
    prazoLimiteEm: timestamp('prazo_limite_em', { withTimezone: true }).notNull(),
    oQueFoiSolicitado: text('o_que_foi_solicitado').notNull(),
    ondeEnviar: text('onde_enviar'),
    atendidoEm: timestamp('atendido_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('convocacao_pregoeiro_participacao_id_idx').on(t.participacaoId),
]);

export const diligenciaHabilitacao = pgTable('diligencia_habilitacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    oQueFoiQuestionado: text('o_que_foi_questionado').notNull(),
    prazoRespostaEm: timestamp('prazo_resposta_em', { withTimezone: true }).notNull(),
    respostaEnviadaEm: timestamp('resposta_enviada_em', { withTimezone: true }),
    documentoComplementar: text('documento_complementar'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('diligencia_habilitacao_participacao_id_idx').on(t.participacaoId),
]);

// Regra padrão 5 dias úteis (o edital sempre prevalece — por isso
// `prazoDiasUteis` é editável, não fixo em 5).
export const regularizacaoMeEpp = pgTable('regularizacao_me_epp', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    dataDeclaracaoVencedoraEm: timestamp('data_declaracao_vencedora_em', { withTimezone: true }).notNull(),
    prazoDiasUteis: integer('prazo_dias_uteis').notNull().default(5),
    prorrogacaoDias: integer('prorrogacao_dias'),
    documentoPendente: text('documento_pendente'),
    protocoloEvidencia: text('protocolo_evidencia'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Ferramenta 14, Recurso (fase recursal) ─────────────────────────────────
// Não confundir com `ficha_recurso` (Ferramenta 2, análise prévia de risco).

export const estadoRecursoFaseEnum = pgEnum('estado_recurso_fase', ESTADOS_RECURSO_FASE);
export const resultadoDecisaoRecursalEnum = pgEnum('resultado_decisao_recursal', RESULTADOS_DECISAO_RECURSAL);

// Quando a EMPRESA recorre. Uma linha por evento recorrível.
export const recursoProprioParticipacao = pgTable('recurso_proprio_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    atoRecorrido: text('ato_recorrido').notNull(),
    dataHoraAtoEm: timestamp('data_hora_ato_em', { withTimezone: true }).notNull(),
    prazoIntencaoEm: timestamp('prazo_intencao_em', { withTimezone: true }),

    intencaoRegistradaEm: timestamp('intencao_registrada_em', { withTimezone: true }),
    intencaoAlegacao: text('intencao_alegacao'),

    prazoRazoesEm: timestamp('prazo_razoes_em', { withTimezone: true }),
    razoesProtocoloNumero: text('razoes_protocolo_numero'),
    razoesArquivoNome: text('razoes_arquivo_nome'),
    razoesArquivoBase64: text('razoes_arquivo_base64'),
    razoesProtocoladoEm: timestamp('razoes_protocolado_em', { withTimezone: true }),

    decisaoResultado: resultadoDecisaoRecursalEnum('decisao_resultado'),
    decisaoEm: timestamp('decisao_em', { withTimezone: true }),
    decisaoArquivoNome: text('decisao_arquivo_nome'),
    decisaoArquivoBase64: text('decisao_arquivo_base64'),

    estado: estadoRecursoFaseEnum('estado').notNull().default('evento_identificado'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('recurso_proprio_participacao_participacao_id_idx').on(t.participacaoId),
]);

// Quando OUTRO recorre contra a empresa — a empresa responde com contrarrazões.
export const recursoTerceiroParticipacao = pgTable('recurso_terceiro_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    quem: text('quem').notNull(),
    contraOQue: text('contra_o_que').notNull(),
    dataIdentificacaoEm: timestamp('data_identificacao_em', { withTimezone: true }).notNull(),

    prazoContrarrazoesEm: timestamp('prazo_contrarrazoes_em', { withTimezone: true }),
    contrarrazoesProtocoloNumero: text('contrarrazoes_protocolo_numero'),
    contrarrazoesArquivoNome: text('contrarrazoes_arquivo_nome'),
    contrarrazoesArquivoBase64: text('contrarrazoes_arquivo_base64'),
    contrarrazoesProtocoladoEm: timestamp('contrarrazoes_protocolado_em', { withTimezone: true }),

    decisaoResultado: resultadoDecisaoRecursalEnum('decisao_resultado'),
    decisaoEm: timestamp('decisao_em', { withTimezone: true }),

    estado: estadoRecursoFaseEnum('estado').notNull().default('evento_identificado'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
    index('recurso_terceiro_participacao_participacao_id_idx').on(t.participacaoId),
]);

// ── Ferramenta 15, Resultado e Contrato ────────────────────────────────────

export const resultadoDesfechoEnum = pgEnum('resultado_desfecho', RESULTADOS_DESFECHO);
export const tipoContratoEnum = pgEnum('tipo_contrato', TIPOS_CONTRATO);

// "Perdeu não ensina nada" — motivoEstruturado é sempre exigido, qualquer
// que seja o resultado.
export const resultadoParticipacao = pgTable('resultado_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    resultado: resultadoDesfechoEnum('resultado').notNull(),
    motivoEstruturado: text('motivo_estruturado').notNull(),
    valorVencedorGlobal: numeric('valor_vencedor_global', { precision: 14, scale: 2 }),
    diferencaParaVencedorAbsoluta: numeric('diferenca_para_vencedor_absoluta', { precision: 14, scale: 2 }),
    diferencaParaVencedorPercentual: numeric('diferenca_para_vencedor_percentual', { precision: 6, scale: 2 }),
    dataResultadoEm: timestamp('data_resultado_em', { withTimezone: true }).notNull(),

    adjudicacaoDataEm: timestamp('adjudicacao_data_em', { withTimezone: true }),
    adjudicacaoQuem: text('adjudicacao_quem'),
    homologacaoDataEm: timestamp('homologacao_data_em', { withTimezone: true }),
    homologacaoPublicacao: text('homologacao_publicacao'),

    registradoPorUserId: text('registrado_por_user_id').references(() => user.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Documentos revalidados na data da ASSINATURA (igual à Ferramenta 13, mas
// contra outro marco) — a revalidação reaproveita a mesma função pura,
// passando a data de assinatura como marco em vez de null (hoje).
export const contratoParticipacao = pgTable('contrato_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    tipo: tipoContratoEnum('tipo').notNull(),
    numero: text('numero').notNull(),
    dataAssinaturaEm: timestamp('data_assinatura_em', { withTimezone: true }),
    vigenciaInicioEm: timestamp('vigencia_inicio_em', { withTimezone: true }),
    vigenciaFimEm: timestamp('vigencia_fim_em', { withTimezone: true }),
    valorContratado: numeric('valor_contratado', { precision: 14, scale: 2 }),
    objetoContratado: text('objeto_contratado'),
    arquivoAssinadoNome: text('arquivo_assinado_nome'),
    arquivoAssinadoBase64: text('arquivo_assinado_base64'),
    gestorFiscalNome: text('gestor_fiscal_nome'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Reaproveita forma_garantia da Ferramenta 4 (mesmo conceito de garantia).
export const garantiaContratual = pgTable('garantia_contratual', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .unique()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    formaEscolhida: formaGarantiaEnum('forma_escolhida').notNull().default('nenhuma'),
    valor: numeric('valor', { precision: 14, scale: 2 }),
    prazoApresentacaoEm: timestamp('prazo_apresentacao_em', { withTimezone: true }),
    vigenciaInicioEm: timestamp('vigencia_inicio_em', { withTimezone: true }),
    vigenciaFimEm: timestamp('vigencia_fim_em', { withTimezone: true }),
    comprovanteTexto: text('comprovante_texto'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// "Aqui o círculo fecha com a Ferramenta 2: o que era previsão de recurso
// vira empenho real." Pode haver mais de um empenho por participação.
export const empenhoParticipacao = pgTable('empenho_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    numeroNotaEmpenho: text('numero_nota_empenho').notNull(),
    dataEm: timestamp('data_em', { withTimezone: true }).notNull(),
    valorEmpenhado: numeric('valor_empenhado', { precision: 14, scale: 2 }).notNull(),
    saldo: numeric('saldo', { precision: 14, scale: 2 }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('empenho_participacao_participacao_id_idx').on(t.participacaoId),
]);

// "Este é o dado que faz o semáforo da Ferramenta 2 funcionar de verdade" —
// alimenta lib/indicador-pagamento-orgao.ts.
export const pagamentoContrato = pgTable('pagamento_contrato', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    dataNotaFiscalEm: timestamp('data_nota_fiscal_em', { withTimezone: true }).notNull(),
    valor: numeric('valor', { precision: 14, scale: 2 }).notNull(),
    dataPrevistaPagamentoEm: timestamp('data_prevista_pagamento_em', { withTimezone: true }),
    dataEfetivaPagamentoEm: timestamp('data_efetiva_pagamento_em', { withTimezone: true }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('pagamento_contrato_participacao_id_idx').on(t.participacaoId),
]);

// Alimenta o cadastro de impedimentos (empresa.impedimentosSancoes) — aqui
// fica o registro por participação; a consolidação no cadastro da empresa é
// feita pelo operador (mesma lacuna do resto do sistema: sem automação que
// altera o cadastro central da empresa sozinha).
export const sancaoParticipacao = pgTable('sancao_participacao', {
    id: uuid('id').primaryKey().defaultRandom(),
    participacaoId: uuid('participacao_id')
        .notNull()
        .references(() => participacao.id, { onDelete: 'cascade' }),

    tipo: text('tipo').notNull(),
    motivo: text('motivo').notNull(),
    dataEm: timestamp('data_em', { withTimezone: true }).notNull(),
    vigenciaFimEm: timestamp('vigencia_fim_em', { withTimezone: true }),
    documentoTexto: text('documento_texto'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
    index('sancao_participacao_participacao_id_idx').on(t.participacaoId),
]);
