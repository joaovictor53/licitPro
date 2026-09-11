import { pgTable, text, timestamp, boolean, uuid, integer, bigint, numeric, jsonb, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import type { NaoConformidade, ResultadoAnalise } from '@/types/analise-tipos';
import { PORTES_EMPRESA, type RepresentanteLegal, type IdentidadeVisual, type ImpedimentoSancao } from '@/types/empresa-tipos';
import { ESTADOS_PARTICIPACAO, ESFERAS } from '@/types/participacao-tipos';

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
