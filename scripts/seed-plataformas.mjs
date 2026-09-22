// scripts/seed-plataformas.mjs
// Popula/atualiza `plataforma_compra` (mantida pela Arumã) com o que o
// próprio LicitPro_Analise_Ferramentas.md já registra como fato — dados sem
// confirmação ficam null com observação, em vez de inventados. Roda com
// `node scripts/seed-plataformas.mjs`. Ver Ferramenta 11.

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

const PLATAFORMAS = [
    {
        nome: 'Compras.gov.br',
        tamanhoMaximoMb: 20,
        formatosAceitos: ['PDF'],
        aceitaZip: null,
        exigeArquivoSeparado: true,
        regrasNomenclatura: 'Sem acento, cedilha, til, parênteses, asterisco, barra, hífen nem espaço em branco no nome do arquivo.',
        resolucaoMinima: '300 dpi (200 dpi só quando a leitura ficar prejudicada) — referência de norma pública, não confirmado como regra própria da plataforma.',
        observacoes: 'Envio de anexo acontece na fase de aceitação, quando o pregoeiro solicita a um fornecedor específico. Digitalização em formato compatível é responsabilidade exclusiva do fornecedor.',
    },
    {
        nome: 'BLL Compras',
        tamanhoMaximoMb: null,
        formatosAceitos: [],
        aceitaZip: null,
        exigeArquivoSeparado: true,
        regrasNomenclatura: null,
        resolucaoMinima: null,
        observacoes: 'Plataforma privada, com anexos, lances e recursos no mesmo ambiente. Limite de tamanho não publicado de forma aberta — precisa ser confirmado na conta do fornecedor.',
    },
    {
        nome: 'Licitanet',
        tamanhoMaximoMb: null,
        formatosAceitos: [],
        aceitaZip: null,
        exigeArquivoSeparado: true,
        regrasNomenclatura: null,
        resolucaoMinima: null,
        observacoes: 'Dados de limite/formato ainda não confirmados (tarefa de verificação prévia listada nos Anexos do produto).',
    },
    {
        nome: 'Portal de Compras Públicas',
        tamanhoMaximoMb: null,
        formatosAceitos: [],
        aceitaZip: null,
        exigeArquivoSeparado: true,
        regrasNomenclatura: null,
        resolucaoMinima: null,
        observacoes: 'Dados de limite/formato ainda não confirmados (tarefa de verificação prévia listada nos Anexos do produto).',
    },
];

const url = resolverUrlBanco();
const client = new Client({ connectionString: url });
await client.connect();

for (const p of PLATAFORMAS) {
    await client.query(
        `INSERT INTO plataforma_compra (nome, tamanho_maximo_mb, formatos_aceitos, aceita_zip, exige_arquivo_separado, regras_nomenclatura, resolucao_minima, observacoes, ultima_conferencia_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (nome) DO UPDATE SET
           tamanho_maximo_mb = EXCLUDED.tamanho_maximo_mb,
           formatos_aceitos = EXCLUDED.formatos_aceitos,
           aceita_zip = EXCLUDED.aceita_zip,
           exige_arquivo_separado = EXCLUDED.exige_arquivo_separado,
           regras_nomenclatura = EXCLUDED.regras_nomenclatura,
           resolucao_minima = EXCLUDED.resolucao_minima,
           observacoes = EXCLUDED.observacoes,
           ultima_conferencia_em = now(),
           updated_at = now()`,
        [p.nome, p.tamanhoMaximoMb, p.formatosAceitos, p.aceitaZip, p.exigeArquivoSeparado, p.regrasNomenclatura, p.resolucaoMinima, p.observacoes]
    );
    console.log(`Plataforma ${p.nome} processada.`);
}

await client.end();
console.log(`\n${PLATAFORMAS.length} plataforma(s) processada(s).`);
