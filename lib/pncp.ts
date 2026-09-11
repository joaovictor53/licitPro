// lib/pncp.ts
// Cliente para a API pública de consulta do PNCP (Portal Nacional de
// Contratações Públicas). Endpoints de consulta são públicos, sem token.
//
// Limitação confirmada na documentação disponível publicamente: a API não
// tem busca por palavra-chave, CNAE nem CATMAT — só filtra por modalidade,
// UF, código IBGE de município, CNPJ do órgão e data de publicação. Por isso
// o Radar (Ferramenta 1) sempre busca por UF + modalidade e filtra por
// objeto localmente, depois da resposta.
//
// Tarefa de verificação pendente (Anexos do LicitPro_Analise_Ferramentas.md):
// conferir periodicamente se endpoints/parâmetros/paginação mudaram.

import type { ContratacaoPncp, ContratacaoRadar } from '@/types/radar-tipos'

const mapearParaContratacaoRadar = (c: ContratacaoPncp): ContratacaoRadar => ({
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
})

const BASE_URL = 'https://pncp.gov.br/api/consulta/v1'

// Cobertura inicial: pregão eletrônico e dispensa de licitação, as duas
// modalidades mais comuns para bens e serviços (o caso de uso do doc:
// hortifruti, merenda escolar etc). Ampliar para as demais modalidades
// (tabela de domínio completa, 1 a 14) é trabalho de uma fase seguinte —
// cada modalidade nova é só mais uma chamada dentro do mesmo loop.
const MODALIDADES_PADRAO = [
  { codigo: 6, nome: 'Pregão - Eletrônico' },
  { codigo: 8, nome: 'Dispensa de Licitação' },
] as const

// Confirmado empiricamente contra a API real: qualquer valor acima de 50
// devolve 400 "Tamanho de página inválido" (a doc secundária usada como
// referência dizia "até 500", o que está errado — testei 51, 60, 75 e 100,
// todos rejeitados; só até 50 funciona).
const TAMANHO_PAGINA = 50
const JANELA_DIAS = 60
const ATRASO_ENTRE_CHAMADAS_MS = 1000 // recomendação pública: não exceder 1 req a cada 5s; 1s é conservador para poucas chamadas
// A API do PNCP tem instabilidade conhecida (504 do próprio gateway deles em
// picos de uso) — sem timeout próprio, uma chamada lenta travaria o radar
// inteiro. Cada combinação UF × modalidade falha isoladamente e a busca segue.
const TIMEOUT_POR_CHAMADA_MS = 20_000

const formatarDataPncp = (data: Date): string =>
  `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}${String(data.getDate()).padStart(2, '0')}`

const aguardar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface RespostaPaginadaPncp {
  data: ContratacaoPncp[]
  totalRegistros: number
  totalPaginas: number
}

const buscarPagina = async (params: {
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
    resposta = await fetch(`${BASE_URL}/contratacoes/publicacao?${query.toString()}`, {
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

/**
 * Busca contratações publicadas nos últimos `JANELA_DIAS` dias, para cada UF
 * informada, nas modalidades cobertas hoje. Só busca a primeira página de
 * cada combinação UF × modalidade (suficiente para o volume normal de uma
 * única UF em 60 dias nas duas modalidades cobertas; paginação mais profunda
 * fica para quando o volume justificar).
 */
export interface ResultadoBuscaPncp {
  resultados: ContratacaoRadar[]
  chamadas: number
  falhas: string[]
}

export const buscarContratacoesPncp = async (estados: string[]): Promise<ResultadoBuscaPncp> => {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - JANELA_DIAS)

  const dataInicial = formatarDataPncp(inicio)
  const dataFinal = formatarDataPncp(hoje)

  const resultados: ContratacaoRadar[] = []
  const falhas: string[] = []
  let chamadas = 0

  for (const uf of estados) {
    for (const modalidade of MODALIDADES_PADRAO) {
      chamadas++
      try {
        const pagina = await buscarPagina({
          uf,
          codigoModalidadeContratacao: modalidade.codigo,
          dataInicial,
          dataFinal,
          pagina: 1,
        })
        resultados.push(...pagina.data.map(mapearParaContratacaoRadar))
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro)
        console.error(`Erro ao consultar PNCP (UF ${uf}, modalidade ${modalidade.nome}):`, mensagem)
        falhas.push(mensagem)
      }
      await aguardar(ATRASO_ENTRE_CHAMADAS_MS)
    }
  }

  return { resultados, chamadas, falhas }
}
