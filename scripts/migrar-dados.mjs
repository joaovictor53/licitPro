// scripts/migrar-dados.mjs
// Copia os dados de um Postgres para outro (Neon → Railway). Script de uso
// único: pode ser removido depois que a migração estiver confirmada.
//
// Requer que o schema JÁ EXISTA no destino (rode `drizzle-kit push` antes).
//
// Uso (PowerShell):
//   $env:SOURCE_DATABASE_URL = "<url do Neon>"
//   npm run db:migrar-dados
//
// O destino sai do .env (DATABASE_PUBLIC_URL); TARGET_DATABASE_URL só é
// necessária para apontar para outro banco que não o configurado no projeto.

import 'dotenv/config';
import { Client } from 'pg';

// Ordem importa: tabelas referenciadas antes das que as referenciam (FKs).
const TABELAS = [
    'user',
    'account',
    'session',
    'verification',
    'analise_cache',
    'analise',
    'rate_limit',
];

// OIDs dos tipos JSON no Postgres. Precisam de JSON.stringify explícito porque
// o node-pg converte array JS em array do Postgres, não em jsonb.
const OID_JSON = 114;
const OID_JSONB = 3802;

const LOTE = 500;

const origemUrl = process.env.SOURCE_DATABASE_URL?.trim();
// Sem TARGET explícito, o destino é o proxy público da Railway do .env — o
// hostname interno não resolve fora da rede da Railway.
const destinoUrl =
    process.env.TARGET_DATABASE_URL?.trim() ||
    process.env.DATABASE_PUBLIC_URL?.trim();

if (!origemUrl) {
    console.error(
        'Defina SOURCE_DATABASE_URL com a string de conexão do banco ANTIGO.'
    );
    process.exit(1);
}
if (!destinoUrl) {
    console.error(
        'Destino não definido: preencha DATABASE_PUBLIC_URL no .env ou TARGET_DATABASE_URL.'
    );
    process.exit(1);
}

if (origemUrl === destinoUrl) {
    console.error('Origem e destino são a mesma URL. Abortando.');
    process.exit(1);
}

const origem = new Client({ connectionString: origemUrl });
const destino = new Client({ connectionString: destinoUrl });

await origem.connect();
await destino.connect();

let totalCopiado = 0;

for (const tabela of TABELAS) {
    const alvo = `"${tabela}"`;

    const { rows, fields } = await origem.query(`SELECT * FROM ${alvo}`);

    if (rows.length === 0) {
        console.log(`${tabela.padEnd(14)} vazia — nada a copiar`);
        continue;
    }

    const colunas = fields.map((f) => f.name);
    const ehJson = fields.map(
        (f) => f.dataTypeID === OID_JSON || f.dataTypeID === OID_JSONB
    );
    const listaColunas = colunas.map((c) => `"${c}"`).join(', ');

    let inseridos = 0;

    for (let inicio = 0; inicio < rows.length; inicio += LOTE) {
        const lote = rows.slice(inicio, inicio + LOTE);
        const valores = [];
        const grupos = [];

        for (const linha of lote) {
            const marcadores = colunas.map((coluna, i) => {
                const valor = linha[coluna];
                valores.push(
                    ehJson[i] && valor !== null ? JSON.stringify(valor) : valor
                );
                return `$${valores.length}`;
            });
            grupos.push(`(${marcadores.join(', ')})`);
        }

        // ON CONFLICT DO NOTHING sem alvo cobre qualquer violação de unicidade,
        // o que torna o script seguro para rodar novamente.
        const resultado = await destino.query(
            `INSERT INTO ${alvo} (${listaColunas}) VALUES ${grupos.join(', ')}
             ON CONFLICT DO NOTHING`,
            valores
        );

        inseridos += resultado.rowCount ?? 0;
    }

    totalCopiado += inseridos;
    const ignorados = rows.length - inseridos;
    console.log(
        `${tabela.padEnd(14)} ${inseridos} inseridas` +
        (ignorados > 0 ? ` (${ignorados} já existiam)` : '')
    );
}

console.log(`\nTotal inserido: ${totalCopiado}`);

// Conferência final: compara as contagens entre origem e destino.
console.log('\nConferência (origem → destino):');
let divergencias = 0;

for (const tabela of TABELAS) {
    const alvo = `"${tabela}"`;
    const [a, b] = await Promise.all([
        origem.query(`SELECT count(*)::int AS n FROM ${alvo}`),
        destino.query(`SELECT count(*)::int AS n FROM ${alvo}`),
    ]);

    const nOrigem = a.rows[0].n;
    const nDestino = b.rows[0].n;
    const ok = nOrigem === nDestino;
    if (!ok) divergencias++;

    console.log(
        `  ${tabela.padEnd(14)} ${nOrigem} → ${nDestino} ${ok ? 'OK' : 'DIVERGENTE'}`
    );
}

await origem.end();
await destino.end();

if (divergencias > 0) {
    console.error(
        `\n${divergencias} tabela(s) com contagem divergente. Revise antes de trocar o DATABASE_URL da aplicação.`
    );
    process.exit(1);
}

console.log('\nMigração concluída e conferida.');
