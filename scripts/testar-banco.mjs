// Teste rápido de conectividade com o Postgres da Railway.
// Uso: npm run db:test
import 'dotenv/config';
import { Client } from 'pg';

const naRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);
const interna = process.env.DATABASE_URL?.trim();
const publica = process.env.DATABASE_PUBLIC_URL?.trim();
const url = naRailway ? (interna || publica) : (publica || interna);

if (!url) {
    console.error('✗ Nenhuma URL de banco definida (DATABASE_URL / DATABASE_PUBLIC_URL).');
    process.exit(1);
}

const { hostname, port } = new URL(url);
console.log(`→ Conectando em ${hostname}:${port} (${naRailway ? 'dentro da Railway' : 'local'})`);

if (!naRailway && hostname.endsWith('.railway.internal')) {
    console.error(
        '✗ Esse hostname é privado da Railway e não resolve fora dela.\n' +
        '  Defina DATABASE_PUBLIC_URL no .env (painel Railway > Postgres > Variables).'
    );
    process.exit(1);
}

const cliente = new Client({ connectionString: url, connectionTimeoutMillis: 10_000 });

try {
    await cliente.connect();
    const { rows: [info] } = await cliente.query(
        'select current_database() as banco, version() as versao'
    );
    const { rows: tabelas } = await cliente.query(
        "select tablename from pg_tables where schemaname = 'public' order by tablename"
    );

    console.log(`✓ Conectado ao banco "${info.banco}"`);
    console.log(`  ${info.versao.split(',')[0]}`);
    console.log(
        tabelas.length
            ? `  Tabelas (${tabelas.length}): ${tabelas.map((t) => t.tablename).join(', ')}`
            : '  Nenhuma tabela no schema public — rode: npm run db:generate && npm run db:migrate'
    );
} catch (erro) {
    console.error(`✗ Falha na conexão: ${erro.message}`);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => { });
}
