// scripts/atualizar-cnae-ibge.mjs
// Busca o catálogo oficial de CNAE (subclasses) na API pública do IBGE e
// grava uma versão trimada (só código + descrição) em data/cnae-ibge.json.
//
// Este catálogo é diferente da tabela `cnae_por_objeto` (mantida pela Arumã):
// aqui é a lista completa e oficial, usada só para o cadastro da empresa
// oferecer todos os CNAEs existentes. Já `cnae_por_objeto` é o subconjunto
// que o Radar de Editais sabe efetivamente buscar (com palavras-chave).
//
// Uso: node scripts/atualizar-cnae-ibge.mjs
// Reexecutar quando o IBGE revisar a CNAE (raro — a cada vários anos).

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const URL_IBGE = 'https://servicodados.ibge.gov.br/api/v2/cnae/subclasses';
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'cnae-ibge.json');

console.log(`Buscando catálogo de CNAE em ${URL_IBGE} ...`);

const resposta = await fetch(URL_IBGE);
if (!resposta.ok) {
    console.error(`Falha ao buscar CNAE no IBGE: HTTP ${resposta.status}`);
    process.exit(1);
}

const bruto = await resposta.json();

const formatarCodigo = (id) =>
    // id vem como 7 dígitos (ex: "4724502") — formata para o padrão NNNN-N/NN
    `${id.slice(0, 4)}-${id.slice(4, 5)}/${id.slice(5, 7)}`;

const trimado = bruto
    .map((item) => ({
        codigo: formatarCodigo(item.id),
        descricao: item.descricao,
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, JSON.stringify(trimado, null, 2) + '\n', 'utf-8');

console.log(`${trimado.length} CNAEs gravados em ${DESTINO}`);
