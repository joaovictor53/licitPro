// lib/composicao-preco.ts
// Ferramenta 7, Composição de Preço — cálculo puro (sem IA), na mesma linha
// de lib/viabilidade.ts: o operador digita preço, o sistema só soma e avalia.

import { AvaliacaoItemPreco, ItemPrecoSnapshot, SituacaoPreco, TotaisPlanilhaPrecos } from '@/types/preco-tipos'

const arredondar = (valor: number): number => Math.round(valor * 100) / 100

export interface ItemPrecoEntrada {
  id: string
  ordem: number
  descricao: string
  unidade: string | null
  quantidade: number
  marcaModelo: string | null
  custoUnitario: number | null
  pisoUnitario: number | null
  alvoUnitario: number | null
  tetoUnitario: number | null
  precoOfertado: number | null
}

export const avaliarItemPreco = (item: ItemPrecoEntrada): AvaliacaoItemPreco => {
  const quantidade = item.quantidade || 0
  const totalItem = arredondar((item.precoOfertado ?? 0) * quantidade)

  if (item.precoOfertado == null || item.custoUnitario == null) {
    return { situacao: null, margemUnitaria: null, margemPercentual: null, totalItem }
  }

  const margemUnitaria = item.precoOfertado - item.custoUnitario
  const margemPercentual = item.precoOfertado > 0 ? (margemUnitaria / item.precoOfertado) * 100 : 0

  let situacao: SituacaoPreco
  if (item.tetoUnitario != null && item.precoOfertado > item.tetoUnitario) situacao = 'acima_teto'
  else if (item.pisoUnitario != null && item.precoOfertado < item.pisoUnitario) situacao = 'abaixo_piso'
  else if (item.tetoUnitario != null && item.precoOfertado >= item.tetoUnitario * 0.95) situacao = 'perto_teto'
  else if (item.alvoUnitario != null && item.precoOfertado < item.alvoUnitario) situacao = 'entre_piso_alvo'
  else situacao = 'no_alvo'

  return {
    situacao,
    margemUnitaria: arredondar(margemUnitaria),
    margemPercentual: arredondar(margemPercentual),
    totalItem,
  }
}

export const montarSnapshotItem = (item: ItemPrecoEntrada): ItemPrecoSnapshot => ({
  id: item.id,
  ordem: item.ordem,
  descricao: item.descricao,
  unidade: item.unidade,
  quantidade: item.quantidade,
  marcaModelo: item.marcaModelo,
  custoUnitario: item.custoUnitario,
  pisoUnitario: item.pisoUnitario,
  alvoUnitario: item.alvoUnitario,
  tetoUnitario: item.tetoUnitario,
  precoOfertado: item.precoOfertado,
  avaliacao: avaliarItemPreco(item),
})

export const calcularTotaisPlanilha = (itens: ItemPrecoEntrada[], valorEstimado: number | null): TotaisPlanilhaPrecos => {
  let totalGeral = 0
  let totalCusto = 0
  let itensAbaixoPiso = 0
  let itensAcimaTeto = 0

  for (const item of itens) {
    const quantidade = item.quantidade || 0
    const avaliacao = avaliarItemPreco(item)
    totalGeral += avaliacao.totalItem
    totalCusto += arredondar((item.custoUnitario ?? 0) * quantidade)
    if (avaliacao.situacao === 'abaixo_piso') itensAbaixoPiso += 1
    if (avaliacao.situacao === 'acima_teto') itensAcimaTeto += 1
  }

  const margemConsolidadaValor = arredondar(totalGeral - totalCusto)
  const margemConsolidadaPercentual = totalGeral > 0 ? arredondar((margemConsolidadaValor / totalGeral) * 100) : null
  const diferencaValorEstimado = valorEstimado != null ? arredondar(totalGeral - valorEstimado) : null
  const diferencaValorEstimadoPercentual =
    valorEstimado != null && valorEstimado > 0 ? arredondar((diferencaValorEstimado! / valorEstimado) * 100) : null

  return {
    quantidadeItens: itens.length,
    totalGeral: arredondar(totalGeral),
    totalCusto: arredondar(totalCusto),
    margemConsolidadaValor,
    margemConsolidadaPercentual,
    valorEstimado,
    diferencaValorEstimado,
    diferencaValorEstimadoPercentual,
    itensAbaixoPiso,
    itensAcimaTeto,
  }
}
