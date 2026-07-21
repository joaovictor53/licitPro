import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, index } from 'drizzle-orm/pg-core';
import type { NaoConformidade, ResultadoAnalise } from '@/types/analise-tipos';

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
