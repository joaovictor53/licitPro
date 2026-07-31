import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/app/src';
import * as schema from '@/app/src/db/schema';
import { enviarResetSenha, enviarVerificacaoEmail } from '@/lib/email';

export const TRIAL_DIAS = 2;

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema,
    }),
    user: {
        additionalFields: {
            trialExpiresAt: {
                type: 'date',
                required: false,
                // Impede que o cliente defina/altere este campo via API
                input: false,
            },
            role: {
                type: 'string',
                required: false,
                input: false,
                defaultValue: 'user',
            },
            plano: {
                type: 'string',
                required: false,
                input: false,
                defaultValue: 'gratis',
            },
            // Dados cadastrais da empresa, preenchidos pelo próprio usuário no perfil
            // e usados para auto-preencher o recurso administrativo e a mensagem ao
            // pregoeiro (evita placeholders vazios como "[nome do recorrente]").
            razaoSocial: {
                type: 'string',
                required: false,
                input: true,
            },
            cnpj: {
                type: 'string',
                required: false,
                input: true,
            },
            endereco: {
                type: 'string',
                required: false,
                input: true,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (usuario) => {
                    return {
                        data: {
                            ...usuario,
                            trialExpiresAt: new Date(
                                Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000
                            ),
                        },
                    };
                },
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        // O login continua liberado sem verificação: o que exige e-mail confirmado
        // é a análise do plano grátis (ver lib/planos-server.ts).
        requireEmailVerification: false,
        sendResetPassword: async ({ user, url }) => {
            await enviarResetSenha({
                para: user.email,
                nome: user.name,
                url,
            });
        },
        revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await enviarVerificacaoEmail({
                para: user.email,
                nome: user.name,
                url,
            });
        },
        // O trial de 2 dias só começa a contar quando o e-mail é confirmado —
        // do contrário o prazo se esgotaria antes de o usuário poder analisar.
        afterEmailVerification: async (usuario) => {
            await db
                .update(schema.user)
                .set({
                    trialExpiresAt: new Date(
                        Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000
                    ),
                })
                .where(eq(schema.user.id, usuario.id));
        },
    },
    // Rate limit — ativo apenas em produção (padrão do Better Auth). As regras
    // abaixo protegem os endpoints que disparam e-mail, para que cliques
    // repetidos não queimem a cota do Resend.
    rateLimit: {
        storage: 'database',
        customRules: {
            '/send-verification-email': { window: 900, max: 3 },
            '/request-password-reset': { window: 900, max: 3 },
            '/sign-up/email': { window: 3600, max: 5 },
        },
    },
    socialProviders:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                google: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                },
            }
            : undefined,
    plugins: [nextCookies()],
});
