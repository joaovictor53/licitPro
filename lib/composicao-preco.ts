// lib/composicao-preco.ts
// Ferramenta 7, Composição de Preço — cálculo puro (sem IA), na mesma linha
// de lib/viabilidade.ts: o operador digita preço, o sistema só soma e avalia.

import { AvaliacaoItemPreco, ItemPrecoSnapshot, SituacaoPreco, TotaisPlanilhaPrecos } from '@/types/preco-tipos'

import { arredondarCentavos as arredondar, atingeFracao, multiplicarEmCentavos, percentual, somar, subtrair } from '@/lib/dinheiro'

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
  const totalItem = multiplicarEmCentavos(item.precoOfertado ?? 0, quantidade)

  if (item.precoOfertado == null || item.custoUnitario == null) {
    return { situacao: null, margemUnitaria: null, margemPercentual: null, totalItem }
  }

  const margemUnitaria = subtrair(item.precoOfertado, item.custoUnitario)
  const margemPercentual = percentual(margemUnitaria, item.precoOfertado) ?? 0

  let situacao: SituacaoPreco
  if (item.tetoUnitario != null && item.precoOfertado > item.tetoUnitario) situacao = 'acima_teto'
  else if (item.pisoUnitario != null && item.precoOfertado < item.pisoUnitario) situacao = 'abaixo_piso'
  else if (item.tetoUnitario != null && atingeFracao(item.precoOfertado, item.tetoUnitario, 95)) situacao = 'perto_teto'
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
  const totaisItens: number[] = []
  const custosItens: number[] = []
  let itensAbaixoPiso = 0
  let itensAcimaTeto = 0

  for (const item of itens) {
    const quantidade = item.quantidade || 0
    const avaliacao = avaliarItemPreco(item)
    totaisItens.push(avaliacao.totalItem)
    custosItens.push(multiplicarEmCentavos(item.custoUnitario ?? 0, quantidade))
    if (avaliacao.situacao === 'abaixo_piso') itensAbaixoPiso += 1
    if (avaliacao.situacao === 'acima_teto') itensAcimaTeto += 1
  }

  const totalGeral = somar(totaisItens)
  const totalCusto = somar(custosItens)
  const margemConsolidadaValor = arredondar(subtrair(totalGeral, totalCusto))
  const margemConsolidadaPercentual = percentual(margemConsolidadaValor, totalGeral)
  const diferencaValorEstimado = valorEstimado != null ? arredondar(subtrair(totalGeral, valorEstimado)) : null
  const diferencaValorEstimadoPercentual = valorEstimado != null && diferencaValorEstimado != null ? percentual(diferencaValorEstimado, valorEstimado) : null

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
