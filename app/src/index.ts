import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';

if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL não está definida. Configure a variável de ambiente (localmente no .env; em produção, no painel da Vercel).'
    );
}

export const db = drizzle(process.env.DATABASE_URL, { schema });
