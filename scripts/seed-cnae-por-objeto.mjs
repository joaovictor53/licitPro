// scripts/seed-cnae-por-objeto.mjs
// Popula/atualiza a tabela `cnae_por_objeto` (mantida pela Arumã, não por
// empresa) com os CNAEs mais comuns. Roda com `node scripts/seed-cnae-por-objeto.mjs`.
// Nasce com poucos CNAEs e cresce conforme aparecem clientes novos — ver
// LicitPro_Analise_Ferramentas.md, Ferramenta 1.

import 'dotenv/config';
import { Client } from 'pg';

const naRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);
const interna = process.env.DATABASE_URL?.trim();
const publica = process.env.DATABASE_PUBLIC_URL?.trim();
const resolverUrlBanco = () => {
    const url = naRailway ? (interna || publica) : (publica || interna);
    if (!url) throw new Error('Nenhuma URL de banco definida (DATABASE_URL / DATABASE_PUBLIC_URL).');
    return url;
};

const CNAES = [
    {
        cnae: '4724-5/00',
        descricao: 'Comércio varejista de hortifrutigranjeiros',
        busca: [
            'hortifruti', 'hortifrutigranjeiro', 'frutas', 'verduras', 'legumes',
            'gêneros alimentícios perecíveis', 'hortigranjeiro',
            'produtos in natura', 'alimentação escolar',
        ],
        naoTraz: ['limpeza', 'vigilância', 'obra', 'locação', 'material de expediente'],
    },
    {
        cnae: '4399-1/01',
        descricao: 'Administração de obras (CNAE 4399-1/01, classe 43.99-1 — serviços especializados para construção não especificados anteriormente)',
        busca: [
            'administração de obras', 'gerenciamento de obras', 'gestão de obras',
            'execução de obras', 'fiscalização de obras', 'obra', 'obras públicas',
            'reforma', 'construção civil', 'edificação', 'engenharia civil',
            'ampliação', 'reparo predial', 'manutenção predial',
        ],
        naoTraz: [
            'hortifruti', 'gêneros alimentícios', 'alimentação escolar', 'merenda',
            'limpeza', 'vigilância', 'locação de veículos', 'material de expediente',
            'licenças de uso', 'software', 'informática',
        ],
    },
];

const url = resolverUrlBanco();
const client = new Client({ connectionString: url });
await client.connect();

for (const item of CNAES) {
    await client.query(
        `INSERT INTO cnae_por_objeto (cnae, descricao, busca, nao_traz, curado_manualmente)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (cnae) DO UPDATE SET
           descricao = EXCLUDED.descricao,
           busca = EXCLUDED.busca,
           nao_traz = EXCLUDED.nao_traz,
           curado_manualmente = true,
           updated_at = now()`,
        [item.cnae, item.descricao, item.busca, item.naoTraz]
    );
    console.log(`CNAE ${item.cnae} — ${item.descricao}`);
}

await client.end();
console.log(`\n${CNAES.length} CNAE(s) processado(s).`);
