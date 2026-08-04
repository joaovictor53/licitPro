import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { resolverUrlBanco } from './lib/db-url';

export default defineConfig({
    out: 'drizzle',
    schema: 'app/src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: resolverUrlBanco(),
    },
});
