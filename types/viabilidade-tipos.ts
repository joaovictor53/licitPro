// types/viabilidade-tipos.ts
// Ferramenta 4, Viabilidade Financeira e Retorno.

export const FORMAS_GARANTIA = ['nenhuma', 'caucao_dinheiro', 'seguro_garantia', 'fianca_bancaria', 'titulo_publico'] as const
export type FormaGarantia = (typeof FORMAS_GARANTIA)[number]

// "Caução em dinheiro" e "título público" travam caixa (entram na exposição,
// não no custo); "seguro-garantia" e "fiança bancária" são despesa.
export const GARANTIAS_QUE_SAO_DESPESA: FormaGarantia[] = ['seguro_garantia', 'fianca_bancaria']

export const SITUACOES_PRECO = ['abaixo_piso', 'entre_piso_alvo', 'no_alvo', 'perto_teto', 'acima_teto'] as const
export type SituacaoPreco = (typeof SITUACOES_PRECO)[number]

export interface ComposicaoCusto {
  custoAquisicaoUnitario: number
  freteRateadoUnitario: number
  entregaParceladaUnitario: number
  perdaEsperadaUnitario: number
  armazenagemUnitario: number
  maoObraUnitario: number
  rateioCustoFixoUnitario: number
  custoOperacionalUnitario: number
  custoPrazoRecebimentoUnitario: number
  garantiaDespesaUnitario: number
  contingenciaUnitario: number
  tributoEmbutidoUnitario: number
  custoRealUnitario: number
}

export interface PisoAlvoTeto {
  piso: number
  alvo: number
  teto: number
}

export interface AvaliacaoPreco {
  situacao: SituacaoPreco
  margemRealUnitaria: number
  margemRealPercentual: number
}

export interface AnaliseRetorno {
  investimentoBruto: number
  investimentoNovoDesembolso: number
  cabeNoCapitalDisponivel: boolean
  faltaCapital: number
  lucroLiquidoTotal: number
  retornoSobreInvestido: number | null
  cicloDias: number
  retornoAoMes: number | null
  precoNecessarioParaRetornoDesejado: number
  precoNecessarioCabeNoTeto: boolean
}

export interface ExposicaoCaixa {
  picoCaixaNegativo: number
  diasExposicao: number
  estouraCaixaLivre: boolean
  faltaCaixa: number
  estouraCapacidadeEntrega: boolean
}

export interface CenarioViabilidade {
  composicao: ComposicaoCusto
  pisoAlvoTeto: PisoAlvoTeto
  avaliacaoPreco: AvaliacaoPreco | null
  retorno: AnaliseRetorno
}

export interface ResultadoViabilidade {
  base: CenarioViabilidade
  conservador: CenarioViabilidade
  exposicaoCaixa: ExposicaoCaixa
  resumoComparativo: string
}
