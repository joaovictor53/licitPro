import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/app/src';
import * as schema from '@/app/src/db/schema';

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
