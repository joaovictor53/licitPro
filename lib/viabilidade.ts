// lib/viabilidade.ts
// Ferramenta 4, Viabilidade Financeira e Retorno — cálculo puro (sem IA: é
// aritmética financeira, nunca "conclusão"). Tributo NUNCA é calculado por
// alíquota legal — é sempre o percentual informado pelo contador (Regra Geral
// do produto); aqui só aplicamos esse percentual já informado.
//
// Decisões de modelagem assumidas (documentadas aqui porque o doc do produto
// não fecha a fórmula exata):
// - Tributo e margem mínima são sempre sobre a RECEITA (gross-up em cascata):
//   PISO = custoRealSemImposto / (1 - aliquota), ALVO = PISO / (1 - margemMinima).
//   Isso é o que torna "o retorno sempre líquido, depois de imposto" (Regra)
//   matematicamente consistente — se apenas somássemos os percentuais sobre o
//   custo, o preço resultante não cobriria de fato o imposto sobre a venda.
// - Rateio de custo fixo usa o teto do edital (ou o preço ofertado, quando
//   já digitado) como proxy do "valor do contrato" — é o único preço
//   disponível antes de a composição estar fechada.
// - Custo do prazo de recebimento e ciclo do investimento usam os mesmos
//   "dias financiados" (prazo de recebimento menos prazo de pagamento ao
//   fornecedor) — é o mesmo intervalo em que o dinheiro da empresa fica exposto.

import { FormaGarantia, GARANTIAS_QUE_SAO_DESPESA, AnaliseRetorno, AvaliacaoPreco, CenarioViabilidade, ComposicaoCusto, ExposicaoCaixa, PisoAlvoTeto, ResultadoViabilidade, SituacaoPreco } from '@/types/viabilidade-tipos'

export interface InsumosViabilidade {
  quantidadeTotal: number
  custoAquisicaoUnitario: number
  freteTotal: number
  numeroEntregas: number
  armazenagemTotal: number
  maoObraTotal: number
  prazoPagamentoFornecedorDias: number
  prazoRecebimentoDias: number
  formaGarantia: FormaGarantia
  custoGarantia: number
  valorGarantiaCaucao: number
  tetoEdital: number
  precoOfertadoUnitario: number | null

  perdaEsperadaPercentual: number
  custoFixoMensal: number
  faturamentoMedioMensal: number
  custoDinheiroMensalPercentual: number
  contingenciaPercentual: number
  margemMinimaPercentual: number
  aliquotaEfetivaPercentual: number

  capitalDisponivel: number
  retornoDesejadoPercentual: number
  estoqueJaDisponivelValor: number
  caixaLivre: number
  creditoDisponivel: number
  capacidadeEntregaMensal: number

  cenarioConservadorFornecedorPercentual: number
  cenarioConservadorPrazoPercentual: number
  cenarioConservadorPerdaPontosPercentuais: number
}

const arredondar = (valor: number): number => Math.round(valor * 100) / 100

const calcularComposicao = (
  insumos: InsumosViabilidade,
  ajuste: { custoAquisicaoUnitario: number; prazoRecebimentoDias: number; perdaEsperadaPercentual: number }
): ComposicaoCusto => {
  const q = insumos.quantidadeTotal || 1
  const precoBaseParaRateio = insumos.precoOfertadoUnitario ?? insumos.tetoEdital

  const freteRateadoUnitario = insumos.freteTotal / q
  const entregaParceladaUnitario = freteRateadoUnitario * Math.max(0, insumos.numeroEntregas - 1)
  const perdaEsperadaUnitario = ajuste.custoAquisicaoUnitario * (ajuste.perdaEsperadaPercentual / 100)
  const armazenagemUnitario = insumos.armazenagemTotal / q
  const maoObraUnitario = insumos.maoObraTotal / q
  const percentualCustoFixo = insumos.faturamentoMedioMensal > 0 ? insumos.custoFixoMensal / insumos.faturamentoMedioMensal : 0
  const rateioCustoFixoUnitario = precoBaseParaRateio * percentualCustoFixo

  const custoOperacionalUnitario =
    ajuste.custoAquisicaoUnitario +
    freteRateadoUnitario +
    entregaParceladaUnitario +
    perdaEsperadaUnitario +
    armazenagemUnitario +
    maoObraUnitario +
    rateioCustoFixoUnitario

  const diasFinanciados = Math.max(0, ajuste.prazoRecebimentoDias - insumos.prazoPagamentoFornecedorDias)
  const custoPrazoRecebimentoUnitario =
    ajuste.custoAquisicaoUnitario * (insumos.custoDinheiroMensalPercentual / 100) * (diasFinanciados / 30)

  const garantiaDespesaUnitario = GARANTIAS_QUE_SAO_DESPESA.includes(insumos.formaGarantia)
    ? insumos.custoGarantia / q
    : 0

  const subtotalAntesContingencia = custoOperacionalUnitario + custoPrazoRecebimentoUnitario + garantiaDespesaUnitario
  const contingenciaUnitario = subtotalAntesContingencia * (insumos.contingenciaPercentual / 100)
  const custoRealSemImposto = subtotalAntesContingencia + contingenciaUnitario

  const aliquota = Math.min(insumos.aliquotaEfetivaPercentual / 100, 0.95)
  const custoRealUnitario = custoRealSemImposto / (1 - aliquota)
  const tributoEmbutidoUnitario = custoRealUnitario - custoRealSemImposto

  return {
    custoAquisicaoUnitario: arredondar(ajuste.custoAquisicaoUnitario),
    freteRateadoUnitario: arredondar(freteRateadoUnitario),
    entregaParceladaUnitario: arredondar(entregaParceladaUnitario),
    perdaEsperadaUnitario: arredondar(perdaEsperadaUnitario),
    armazenagemUnitario: arredondar(armazenagemUnitario),
    maoObraUnitario: arredondar(maoObraUnitario),
    rateioCustoFixoUnitario: arredondar(rateioCustoFixoUnitario),
    custoOperacionalUnitario: arredondar(custoOperacionalUnitario),
    custoPrazoRecebimentoUnitario: arredondar(custoPrazoRecebimentoUnitario),
    garantiaDespesaUnitario: arredondar(garantiaDespesaUnitario),
    contingenciaUnitario: arredondar(contingenciaUnitario),
    tributoEmbutidoUnitario: arredondar(tributoEmbutidoUnitario),
    custoRealUnitario: arredondar(custoRealUnitario),
  }
}

const calcularPisoAlvoTeto = (custoRealUnitario: number, margemMinimaPercentual: number, tetoEdital: number): PisoAlvoTeto => {
  const margem = Math.min(margemMinimaPercentual / 100, 0.95)
  const piso = custoRealUnitario
  const alvo = piso / (1 - margem)
  return { piso: arredondar(piso), alvo: arredondar(alvo), teto: arredondar(tetoEdital) }
}

const avaliarPreco = (
  precoOfertadoUnitario: number,
  pisoAlvoTeto: PisoAlvoTeto,
  aliquotaPercentual: number,
  custoRealSemImposto: number
): AvaliacaoPreco => {
  const aliquota = Math.min(aliquotaPercentual / 100, 0.95)
  const margemRealUnitaria = precoOfertadoUnitario * (1 - aliquota) - custoRealSemImposto
  const margemRealPercentual = precoOfertadoUnitario > 0 ? (margemRealUnitaria / precoOfertadoUnitario) * 100 : 0

  let situacao: SituacaoPreco
  if (precoOfertadoUnitario > pisoAlvoTeto.teto) situacao = 'acima_teto'
  else if (margemRealUnitaria < 0) situacao = 'abaixo_piso'
  else if (precoOfertadoUnitario >= pisoAlvoTeto.teto * 0.95) situacao = 'perto_teto'
  else if (precoOfertadoUnitario < pisoAlvoTeto.alvo) situacao = 'entre_piso_alvo'
  else situacao = 'no_alvo'

  return { situacao, margemRealUnitaria: arredondar(margemRealUnitaria), margemRealPercentual: arredondar(margemRealPercentual) }
}

const calcularRetorno = (
  insumos: InsumosViabilidade,
  composicao: ComposicaoCusto,
  prazoRecebimentoDias: number,
  custoRealSemImposto: number
): AnaliseRetorno => {
  const q = insumos.quantidadeTotal || 1
  const valorCaucao = insumos.formaGarantia === 'caucao_dinheiro' || insumos.formaGarantia === 'titulo_publico' ? insumos.valorGarantiaCaucao : 0

  const investimentoBruto =
    composicao.custoAquisicaoUnitario * q + insumos.freteTotal * insumos.numeroEntregas + insumos.armazenagemTotal + insumos.maoObraTotal + valorCaucao
  const investimentoNovoDesembolso = Math.max(0, investimentoBruto - insumos.estoqueJaDisponivelValor)

  const cabeNoCapitalDisponivel = investimentoNovoDesembolso <= insumos.capitalDisponivel
  const faltaCapital = Math.max(0, investimentoNovoDesembolso - insumos.capitalDisponivel)

  const precoParaLucro = insumos.precoOfertadoUnitario ?? insumos.tetoEdital
  const aliquota = Math.min(insumos.aliquotaEfetivaPercentual / 100, 0.95)
  const lucroLiquidoUnitario = precoParaLucro * (1 - aliquota) - custoRealSemImposto
  const lucroLiquidoTotal = lucroLiquidoUnitario * q

  const retornoSobreInvestido = investimentoNovoDesembolso > 0 ? (lucroLiquidoTotal / investimentoNovoDesembolso) * 100 : null

  const cicloDias = Math.max(0, prazoRecebimentoDias - insumos.prazoPagamentoFornecedorDias)
  const retornoAoMes = retornoSobreInvestido != null && cicloDias > 0 ? (retornoSobreInvestido / cicloDias) * 30 : null

  // Preço necessário para bater o retorno desejado: resolve P tal que
  // P*(1-aliquota) - custoRealSemImposto = retornoDesejado% * investimentoNovoDesembolso / Q
  const lucroUnitarioDesejado = (insumos.retornoDesejadoPercentual / 100) * (investimentoNovoDesembolso / q)
  const precoNecessarioParaRetornoDesejado = (custoRealSemImposto + lucroUnitarioDesejado) / (1 - aliquota)

  return {
    investimentoBruto: arredondar(investimentoBruto),
    investimentoNovoDesembolso: arredondar(investimentoNovoDesembolso),
    cabeNoCapitalDisponivel,
    faltaCapital: arredondar(faltaCapital),
    lucroLiquidoTotal: arredondar(lucroLiquidoTotal),
    retornoSobreInvestido: retornoSobreInvestido != null ? arredondar(retornoSobreInvestido) : null,
    cicloDias,
    retornoAoMes: retornoAoMes != null ? arredondar(retornoAoMes) : null,
    precoNecessarioParaRetornoDesejado: arredondar(precoNecessarioParaRetornoDesejado),
    precoNecessarioCabeNoTeto: precoNecessarioParaRetornoDesejado <= insumos.tetoEdital,
  }
}

const montarCenario = (
  insumos: InsumosViabilidade,
  ajuste: { custoAquisicaoUnitario: number; prazoRecebimentoDias: number; perdaEsperadaPercentual: number }
): CenarioViabilidade => {
  const composicao = calcularComposicao(insumos, ajuste)
  const custoRealSemImposto = composicao.custoRealUnitario - composicao.tributoEmbutidoUnitario
  const pisoAlvoTeto = calcularPisoAlvoTeto(composicao.custoRealUnitario, insumos.margemMinimaPercentual, insumos.tetoEdital)
  const avaliacaoPreco =
    insumos.precoOfertadoUnitario != null
      ? avaliarPreco(insumos.precoOfertadoUnitario, pisoAlvoTeto, insumos.aliquotaEfetivaPercentual, custoRealSemImposto)
      : null
  const retorno = calcularRetorno(insumos, composicao, ajuste.prazoRecebimentoDias, custoRealSemImposto)

  return { composicao, pisoAlvoTeto, avaliacaoPreco, retorno }
}

const calcularExposicaoCaixa = (insumos: InsumosViabilidade, retornoBase: AnaliseRetorno): ExposicaoCaixa => {
  const capacidadeMensal = insumos.capacidadeEntregaMensal
  return {
    picoCaixaNegativo: arredondar(retornoBase.investimentoNovoDesembolso),
    diasExposicao: retornoBase.cicloDias,
    estouraCaixaLivre: retornoBase.investimentoNovoDesembolso > insumos.caixaLivre + insumos.creditoDisponivel,
    faltaCaixa: arredondar(Math.max(0, retornoBase.investimentoNovoDesembolso - (insumos.caixaLivre + insumos.creditoDisponivel))),
    estouraCapacidadeEntrega: capacidadeMensal > 0 ? insumos.quantidadeTotal > capacidadeMensal : false,
  }
}

export const calcularViabilidade = (insumos: InsumosViabilidade): ResultadoViabilidade => {
  const base = montarCenario(insumos, {
    custoAquisicaoUnitario: insumos.custoAquisicaoUnitario,
    prazoRecebimentoDias: insumos.prazoRecebimentoDias,
    perdaEsperadaPercentual: insumos.perdaEsperadaPercentual,
  })

  const conservador = montarCenario(insumos, {
    custoAquisicaoUnitario: insumos.custoAquisicaoUnitario * (1 + insumos.cenarioConservadorFornecedorPercentual / 100),
    prazoRecebimentoDias: insumos.prazoRecebimentoDias * (1 + insumos.cenarioConservadorPrazoPercentual / 100),
    perdaEsperadaPercentual: insumos.perdaEsperadaPercentual + insumos.cenarioConservadorPerdaPontosPercentuais,
  })

  const exposicaoCaixa = calcularExposicaoCaixa(insumos, base.retorno)

  const margemBase = base.avaliacaoPreco?.margemRealPercentual
  const margemConservadora = conservador.avaliacaoPreco?.margemRealPercentual
  const resumoComparativo =
    margemBase != null && margemConservadora != null
      ? `No base a margem é ${margemBase.toFixed(1)}%, no conservador ${margemConservadora >= margemBase ? 'sobe' : 'cai'} para ${margemConservadora.toFixed(1)}%, e o investimento necessário passa de ${base.retorno.investimentoNovoDesembolso.toFixed(0)} para ${conservador.retorno.investimentoNovoDesembolso.toFixed(0)}.`
      : 'Informe o preço ofertado para comparar a margem entre os cenários base e conservador.'

  return { base, conservador, exposicaoCaixa, resumoComparativo }
}
