// lib/formatacao.ts
// Formatação de valores para a tela (pt-BR), sem dependência de React.

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MOEDA_COMPACTA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const numero = (valor: string | number | null | undefined): number | null => {
  if (valor == null || valor === '') return null
  const n = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(n) ? n : null
}

export const formatarMoeda = (valor: string | number | null | undefined): string => {
  const n = numero(valor)
  return n == null ? '—' : MOEDA.format(n)
}

/** "R$ 1,2 mi": para indicadores, onde o valor exato não importa. */
export const formatarMoedaCompacta = (valor: number): string => MOEDA_COMPACTA.format(valor)

const paraData = (valor: string | Date | null | undefined): Date | null => {
  if (!valor) return null
  const d = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d
}

export const formatarDataHora = (valor: string | Date | null | undefined): string => {
  const d = paraData(valor)
  return d ? DATA_HORA.format(d) : '—'
}

export const formatarData = (valor: string | Date | null | undefined): string => {
  const d = paraData(valor)
  return d ? DATA.format(d) : '—'
}

/** Dias corridos de `agora` até `alvo` (negativo se já passou), contando pelo dia do calendário. */
export const diasAte = (alvo: string | Date | null | undefined, agora: Date = new Date()): number | null => {
  const d = paraData(alvo)
  if (!d) return null
  const dia = (x: Date) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())
  return Math.round((dia(d) - dia(agora)) / 86_400_000)
}

/** "hoje", "amanhã", "em 5 dias", "há 2 dias". */
export const descreverPrazo = (dias: number | null): string => {
  if (dias == null) return '—'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`
}
