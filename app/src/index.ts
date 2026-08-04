import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema';
import { resolverUrlBanco } from '@/lib/db-url';

export const db = drizzle(resolverUrlBanco(), { schema });
