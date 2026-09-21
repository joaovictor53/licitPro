// lib/indicador-pagamento-orgao.ts
// Ferramenta 2, Ficha do Recurso — "Indicador de pagamento do órgão".
//
// Calculado a partir dos contratos da carteira (prazo médio entre empenho e
// pagamento, quantidade de contratos que formaram a média, atrasos
// registrados). Esse histórico só existe a partir da Ferramenta 15
// (Resultado e Contrato), que ainda não foi construída — por isso, por ora,
// a amostra fica sempre zerada. Isso deve aparecer na tela como "sem
// histórico", nunca ser escondido ou disfarçado de dado real.
import { IndicadorPagamentoOrgao } from '@/types/recurso-tipos'

export const obterIndicadorPagamentoOrgao = async (_orgao: string): Promise<IndicadorPagamentoOrgao> => {
  return { prazoMedioDias: null, quantidadeContratos: 0, atrasosRegistrados: 0 }
}
