// types/preco-tipos.ts
// Ferramenta 7, Composição de Preço.
//
// Decisão de escopo: a Ferramenta 3 (Leitura do Edital) ainda não extrai uma
// lista estruturada de itens/quantidades do objeto (ela extrai exigências de
// habilitação, que é uma matriz diferente) — por isso os itens aqui são
// cadastrados pelo operador, com o custo/piso/alvo herdados manualmente do
// que a Ferramenta 4 calculou (ela também é hoje um agregado único, não por
// item). Quando a extração estruturada de itens existir, isto passa a
// nascer da leitura em vez de ser digitado.

import { SituacaoPreco } from '@/types/viabilidade-tipos'

export type { SituacaoPreco }

export interface AvaliacaoItemPreco {
  situacao: SituacaoPreco | null
  margemUnitaria: number | null
  margemPercentual: number | null
  totalItem: number
}

export interface TotaisPlanilhaPrecos {
  quantidadeItens: number
  totalGeral: number
  totalCusto: number
  margemConsolidadaValor: number
  margemConsolidadaPercentual: number | null
  valorEstimado: number | null
  diferencaValorEstimado: number | null
  diferencaValorEstimadoPercentual: number | null
  itensAbaixoPiso: number
  itensAcimaTeto: number
}

export interface ItemPrecoSnapshot {
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
  avaliacao: AvaliacaoItemPreco
}
