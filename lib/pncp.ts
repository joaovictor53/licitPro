// lib/pncp.ts
// Cliente para a API pública de consulta do PNCP (Portal Nacional de
// Contratações Públicas). Endpoints de consulta são públicos, sem token.
//
// Limitação confirmada na documentação disponível publicamente: a API não
// tem busca por palavra-chave, CNAE nem CATMAT — só filtra por modalidade,
// UF, código IBGE de município, CNPJ do órgão e data de publicação. Por isso
// o Radar (Ferramenta 1) sempre busca por UF + modalidade e filtra por
// objeto localmente, depois da resposta. A coleta em janelas e o registro de
// cobertura ficam em lib/radar-coleta.ts; aqui só há o cliente HTTP.
//
// Tarefa de verificação pendente (Anexos do LicitPro_Analise_Ferramentas.md):
// conferir periodicamente se endpoints/parâmetros/paginação mudaram.

import type { ContratacaoPncp, ContratacaoRadar } from '@/types/radar-tipos'

export const mapearParaContratacaoRadar = (c: ContratacaoPncp): ContratacaoRadar => ({
  identificadorExterno: c.numeroControlePNCP,
  fonte: 'pncp',
  orgao: c.orgaoEntidade?.razaoSocial ?? null,
  municipio: c.unidadeOrgao?.municipioNome ?? null,
  uf: c.unidadeOrgao?.ufSigla ?? null,
  objeto: c.objetoCompra ?? null,
  valorEstimado: c.valorTotalEstimado ?? null,
  modalidade: c.modalidadeNome ?? null,
  numeroProcesso: c.processo ?? null,
  dataSessaoEm: c.dataAberturaProposta ?? null,
  linkPortalOrigem: c.linkSistemaOrigem ?? null,
  orgaoCnpj: c.orgaoEntidade?.cnpj ?? null,
  dataEncerramentoProposta: c.dataEncerramentoProposta ?? null,
  dataPublicacaoPncp: c.dataPublicacaoPncp ?? null,
})

const BASE_URL = 'https://pncp.gov.br/api/consulta/v1'

// Modalidades coletadas (tabela de domínio do PNCP): concorrência eletrônica,
// pregão eletrônico, pregão presencial e dispensa de licitação — o grosso de
// bens e serviços. Cada modalidade nova é só mais uma varredura por janela.
export const MODALIDADES_RADAR = [
  { codigo: 4, nome: 'Concorrência - Eletrônica' },
  { codigo: 6, nome: 'Pregão - Eletrônico' },
  { codigo: 7, nome: 'Pregão - Presencial' },
  { codigo: 8, nome: 'Dispensa de Licitação' },
] as const

// Confirmado empiricamente contra a API real: qualquer valor acima de 50
// devolve 400 "Tamanho de página inválido" (a doc secundária usada como
// referência dizia "até 500", o que está errado — testei 51, 60, 75 e 100,
// todos rejeitados; só até 50 funciona).
const TAMANHO_PAGINA = 50
export const ATRASO_ENTRE_CHAMADAS_MS = 1000 // recomendação pública: não exceder 1 req a cada 5s; 1s é conservador para poucas chamadas
// A API do PNCP tem instabilidade conhecida (504 do próprio gateway deles em
// picos de uso) — sem timeout próprio, uma chamada lenta travaria o radar
// inteiro. Cada varredura falha isoladamente e a coleta segue.
const TIMEOUT_POR_CHAMADA_MS = 20_000

export const aguardar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface RespostaPaginadaPncp {
  data: ContratacaoPncp[]
  totalRegistros: number
  totalPaginas: number
}

/** `publicacao` varre por data de publicação; `atualizacao`, por data da última alteração. */
export type RotaPncp = 'publicacao' | 'atualizacao'

export const buscarPaginaPncp = async (params: {
  rota?: RotaPncp
  uf: string
  codigoModalidadeContratacao: number
  dataInicial: string
  dataFinal: string
  pagina: number
}): Promise<RespostaPaginadaPncp> => {
  const query = new URLSearchParams({
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
    codigoModalidadeContratacao: String(params.codigoModalidadeContratacao),
    uf: params.uf,
    pagina: String(params.pagina),
    tamanhoPagina: String(TAMANHO_PAGINA),
  })

  const controle = new AbortController()
  const timeout = setTimeout(() => controle.abort(), TIMEOUT_POR_CHAMADA_MS)

  let resposta: Response
  try {
    resposta = await fetch(`${BASE_URL}/contratacoes/${params.rota ?? 'publicacao'}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controle.signal,
    })
  } catch (erro) {
    const abortou = erro instanceof Error && erro.name === 'AbortError'
    throw new Error(
      abortou
        ? `PNCP não respondeu em ${TIMEOUT_POR_CHAMADA_MS / 1000}s para UF ${params.uf}, modalidade ${params.codigoModalidadeContratacao}`
        : `Falha de rede ao consultar o PNCP (UF ${params.uf}, modalidade ${params.codigoModalidadeContratacao}): ${erro instanceof Error ? erro.message : erro}`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (resposta.status === 204) {
    return { data: [], totalRegistros: 0, totalPaginas: 0 }
  }

  if (!resposta.ok) {
    throw new Error(`PNCP respondeu ${resposta.status} para UF ${params.uf}, modalidade ${params.codigoModalidadeContratacao}`)
  }

  const corpo = await resposta.json()
  return {
    data: Array.isArray(corpo?.data) ? corpo.data : [],
    totalRegistros: corpo?.totalRegistros ?? 0,
    totalPaginas: corpo?.totalPaginas ?? 1,
  }
}
