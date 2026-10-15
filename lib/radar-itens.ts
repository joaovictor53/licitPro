// lib/radar-itens.ts
// Itens de uma contratação do PNCP, usados para reavaliar editais "talvez":
// o objeto genérico ("aquisição de materiais") muitas vezes só se resolve
// olhando a descrição de cada item.

import { ATRASO_ENTRE_CHAMADAS_MS, aguardar } from '@/lib/pncp'

const BASE_URL = 'https://pncp.gov.br/api/pncp/v1'
const TIMEOUT_MS = 15_000
const MAX_ITENS = 50

export interface ChaveCompraPncp {
  cnpj: string
  ano: string
  sequencial: string
}

/** "22812242000112-1-000004/2027" → cnpj, ano e sequencial (sem zeros à esquerda). */
export const lerNumeroControlePncp = (numeroControle: string): ChaveCompraPncp | null => {
  const sem = numeroControle.replace(/^pncp:/, '')
  const m = /^(\d{14})-\d+-(\d+)\/(\d{4})$/.exec(sem)
  if (!m) return null
  return { cnpj: m[1], sequencial: String(Number(m[2])), ano: m[3] }
}

/** Descrições dos itens, já limpas, a partir da resposta da API. */
export const descricoesDosItens = (corpo: unknown): string[] => {
  if (!Array.isArray(corpo)) return []
  return corpo
    .map((item) => (item && typeof item === 'object' ? (item as { descricao?: unknown }).descricao : null))
    .filter((d): d is string => typeof d === 'string' && d.trim() !== '')
    .map((d) => d.replace(/\s+/g, ' ').trim())
}

/** Devolve as descrições dos itens, ou null se a consulta falhou (diferente de "sem itens"). */
export const buscarDescricoesDosItens = async (chave: ChaveCompraPncp): Promise<string[] | null> => {
  const controle = new AbortController()
  const timeout = setTimeout(() => controle.abort(), TIMEOUT_MS)
  try {
    const resposta = await fetch(
      `${BASE_URL}/orgaos/${chave.cnpj}/compras/${chave.ano}/${chave.sequencial}/itens?pagina=1&tamanhoPagina=${MAX_ITENS}`,
      { headers: { Accept: 'application/json' }, signal: controle.signal }
    )
    if (resposta.status === 204 || resposta.status === 404) return []
    if (!resposta.ok) return null
    return descricoesDosItens(await resposta.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export const pausaEntreConsultasDeItens = () => aguardar(ATRASO_ENTRE_CHAMADAS_MS)
