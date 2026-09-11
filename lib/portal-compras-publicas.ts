// lib/portal-compras-publicas.ts
// Cliente para a API pública do Portal de Compras Públicas (plataforma
// privada de pregão eletrônico usada por vários municípios/órgãos — não é o
// PNCP, que é o agregador nacional obrigatório pela Lei 14.133).
//
// Documentação real obtida em https://apipcp.portaldecompraspublicas.com.br/publico/apidoc/
// (a página em si só carrega via JS; os dados ficam em api_data.json/api_project.json
// no mesmo caminho — sem exigir autenticação para LER a documentação).
//
// Diferente do PNCP, aqui TODO endpoint exige um parâmetro `publicKey`, que
// não tem cadastro self-service: precisa ser solicitado por e-mail
// (comprador@portaldecompraspublicas.com.br) ou telefone/WhatsApp à equipe
// do Portal de Compras Públicas. Enquanto a chave não existe, este cliente
// fica inerte (ver `chavePublicaConfigurada`) e o Radar segue funcionando só
// com o PNCP.
//
// Mesma limitação do PNCP: não há busca por palavra-chave/CNAE — só por UF,
// situação e intervalo de datas. O filtro por objeto continua sendo feito
// localmente (lib/radar-server.ts), igual para as duas fontes.
//
// TODO (confirmar quando a chave chegar, ambiente de testes disponível em
// https://apipcp.wcompras.com.br/): formato exato de dataInicio/dataFim no
// request (a doc só documenta o formato da resposta, ISO 8601) e se os
// campos de data (dataAberturaPropostas etc.) vêm por licitação ou fixos por
// página — o schema da doc lista como irmãos de `dadosLicitacoes[]`, o que
// seria estranho para uma lista de vários processos; tratamos aqui como
// estando dentro de cada item, com fallback para null se não existir.

import type { ContratacaoRadar } from '@/types/radar-tipos'

const BASE_URL = process.env.PORTAL_COMPRAS_PUBLICAS_BASE_URL?.trim() || 'https://apipcp.portaldecompraspublicas.com.br'
const TIMEOUT_POR_CHAMADA_MS = 20_000
const ATRASO_ENTRE_CHAMADAS_MS = 1000

export const chavePublicaConfigurada = (): boolean =>
  Boolean(process.env.PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY?.trim())

const aguardar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const formatarData = (data: Date): string =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`

// Campos usados do retorno de /publico/processosAbertos — só o suficiente
// para o Radar; a resposta real tem muito mais (lotes, itens, impugnações,
// pregoeiro etc.), útil para fases futuras (Leitura do Edital, Composição de
// Preço), mas fora do escopo desta primeira integração.
interface ItemLote {
  VL_UNITARIO_ESTIMADO?: number | null
  QT_ITENS?: number | null
}

interface Lote {
  itens?: ItemLote[]
}

interface LicitacaoPcp {
  idLicitacao: number
  NR_LICITACAO?: string | null
  NR_PROCESSO?: string | null
  DS_OBJETO?: string | null
  unidadeCompradora?: {
    nomeComprador?: string | null
    nomeUnidadeCompradora?: string | null
    Cidade?: string | null
    UF?: string | null
  }
  lotes?: Lote[]
  dataAberturaPropostas?: string | null
  linkPortalOrigem?: string | null
}

interface RespostaProcessosAbertos {
  quantidadeTotal: number
  paginaAtual: number
  dadosLicitacoes: LicitacaoPcp[]
}

const somarValorEstimado = (licitacao: LicitacaoPcp): number | null => {
  const itens = licitacao.lotes?.flatMap((lote) => lote.itens ?? []) ?? []
  if (itens.length === 0) return null

  const total = itens.reduce((soma, item) => {
    const valor = item.VL_UNITARIO_ESTIMADO ?? 0
    const quantidade = item.QT_ITENS ?? 0
    return soma + valor * quantidade
  }, 0)

  return total > 0 ? total : null
}

const mapearParaContratacaoRadar = (licitacao: LicitacaoPcp): ContratacaoRadar => ({
  identificadorExterno: String(licitacao.idLicitacao),
  fonte: 'portal_compras_publicas',
  orgao: licitacao.unidadeCompradora?.nomeComprador ?? licitacao.unidadeCompradora?.nomeUnidadeCompradora ?? null,
  municipio: licitacao.unidadeCompradora?.Cidade ?? null,
  uf: licitacao.unidadeCompradora?.UF ?? null,
  objeto: licitacao.DS_OBJETO ?? null,
  valorEstimado: somarValorEstimado(licitacao),
  modalidade: null, // não identificado no retorno de processosAbertos
  numeroProcesso: licitacao.NR_PROCESSO ?? licitacao.NR_LICITACAO ?? null,
  dataSessaoEm: licitacao.dataAberturaPropostas ?? null,
  linkPortalOrigem: `https://www.portaldecompraspublicas.com.br/licitacoes/${licitacao.idLicitacao}`,
})

const buscarPagina = async (params: { uf: string; dataInicio: string; dataFim: string; pagina: number }): Promise<RespostaProcessosAbertos> => {
  const publicKey = process.env.PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY?.trim()
  if (!publicKey) throw new Error('PORTAL_COMPRAS_PUBLICAS_PUBLIC_KEY não configurada.')

  const query = new URLSearchParams({
    publicKey,
    uf: params.uf,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    pagina: String(params.pagina),
  })

  const controle = new AbortController()
  const timeout = setTimeout(() => controle.abort(), TIMEOUT_POR_CHAMADA_MS)

  let resposta: Response
  try {
    resposta = await fetch(`${BASE_URL}/publico/processosAbertos/?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controle.signal,
    })
  } catch (erro) {
    const abortou = erro instanceof Error && erro.name === 'AbortError'
    throw new Error(
      abortou
        ? `Portal de Compras Públicas não respondeu em ${TIMEOUT_POR_CHAMADA_MS / 1000}s para UF ${params.uf}`
        : `Falha de rede ao consultar o Portal de Compras Públicas (UF ${params.uf}): ${erro instanceof Error ? erro.message : erro}`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!resposta.ok) {
    throw new Error(`Portal de Compras Públicas respondeu ${resposta.status} para UF ${params.uf}`)
  }

  const corpo = await resposta.json()
  return {
    quantidadeTotal: corpo?.quantidadeTotal ?? 0,
    paginaAtual: corpo?.paginaAtual ?? 1,
    dadosLicitacoes: Array.isArray(corpo?.dadosLicitacoes) ? corpo.dadosLicitacoes : [],
  }
}

export interface ResultadoBuscaPcp {
  resultados: ContratacaoRadar[]
  chamadas: number
  falhas: string[]
}

/**
 * Busca processos abertos no Portal de Compras Públicas, por UF, nos últimos
 * `janelaDias` dias. Retorna vazio (sem erro) se a chave ainda não estiver
 * configurada — é o estado normal até a Arumã receber a publicKey.
 */
export const buscarContratacoesPcp = async (estados: string[], janelaDias = 60): Promise<ResultadoBuscaPcp> => {
  if (!chavePublicaConfigurada()) {
    return { resultados: [], chamadas: 0, falhas: [] }
  }

  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - janelaDias)

  const dataInicio = formatarData(inicio)
  const dataFim = formatarData(hoje)

  const resultados: ContratacaoRadar[] = []
  const falhas: string[] = []
  let chamadas = 0

  for (const uf of estados) {
    chamadas++
    try {
      const pagina = await buscarPagina({ uf, dataInicio, dataFim, pagina: 1 })
      resultados.push(...pagina.dadosLicitacoes.map(mapearParaContratacaoRadar))
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      console.error(`Erro ao consultar Portal de Compras Públicas (UF ${uf}):`, mensagem)
      falhas.push(mensagem)
    }
    await aguardar(ATRASO_ENTRE_CHAMADAS_MS)
  }

  return { resultados, chamadas, falhas }
}
