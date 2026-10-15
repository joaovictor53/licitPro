// lib/semaforo-orgao.ts
// Semáforo do órgão comprador para a lista do Radar, a partir do histórico
// de pagamento da PRÓPRIA empresa com o órgão (porte das regras do Caçador):
// cada indicador vale 0, 1 ou 2 pontos (quanto mais, pior) e o CINZA é o
// padrão — sempre com o motivo escrito. Falta de dado nunca vira verde.

import type { IndicadorPagamentoOrgao } from '@/types/recurso-tipos'

export type CorSemaforoOrgao = 'verde' | 'amarelo' | 'vermelho' | 'cinza'

export interface SemaforoOrgao {
  cor: CorSemaforoOrgao
  pontos: number | null
  motivos: string[]
}

/** Menos contratos com pagamento que isto: amostra pequena demais para dar cor. */
export const MIN_CONTRATOS_SEMAFORO = 3

const pontosDoPrazo = (dias: number): number => (dias <= 30 ? 0 : dias <= 60 ? 1 : 2)
const pontosDosAtrasos = (atrasos: number): number => (atrasos === 0 ? 0 : atrasos <= 2 ? 1 : 2)

export const calcularSemaforoOrgao = (indicador: IndicadorPagamentoOrgao): SemaforoOrgao => {
  if (indicador.quantidadeContratos === 0) {
    return { cor: 'cinza', pontos: null, motivos: ['Sem histórico de pagamento seu com este órgão'] }
  }
  if (indicador.quantidadeContratos < MIN_CONTRATOS_SEMAFORO) {
    return {
      cor: 'cinza',
      pontos: null,
      motivos: [`Só ${indicador.quantidadeContratos} contrato(s) com pagamento: amostra pequena demais (mínimo ${MIN_CONTRATOS_SEMAFORO})`],
    }
  }
  if (indicador.prazoMedioDias === null) {
    return { cor: 'cinza', pontos: null, motivos: ['Prazo médio de pagamento não pôde ser medido (falta empenho ou data de pagamento)'] }
  }

  const prazo = pontosDoPrazo(indicador.prazoMedioDias)
  const atrasos = pontosDosAtrasos(indicador.atrasosRegistrados)
  const pontos = prazo + atrasos

  return {
    cor: pontos === 0 ? 'verde' : pontos <= 2 ? 'amarelo' : 'vermelho',
    pontos,
    motivos: [
      `Prazo médio de pagamento: ${indicador.prazoMedioDias} dia(s) (${prazo} ponto(s))`,
      `Atrasos registrados: ${indicador.atrasosRegistrados} em ${indicador.quantidadeContratos} contrato(s) (${atrasos} ponto(s))`,
    ],
  }
}
