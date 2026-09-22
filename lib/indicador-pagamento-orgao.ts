// lib/indicador-pagamento-orgao.ts
// Ferramenta 2, Ficha do Recurso — "Indicador de pagamento do órgão".
//
// A partir da Ferramenta 15 (Resultado e Contrato), este indicador passa a
// ter dado real: prazo médio entre o empenho e o pagamento efetivo, quantos
// contratos formaram a média e quantos pagamentos vieram atrasados — tudo
// só dentro da carteira desta EMPRESA (Regra Geral 8, isolamento
// multiempresa: nunca cruza dado de outra empresa para o mesmo órgão).
// Enquanto não houver pagamento registrado, a amostra continua zerada e
// isso aparece na tela como "sem histórico", nunca escondido.

import { and, eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { empenhoParticipacao, pagamentoContrato, participacao } from '@/app/src/db/schema'
import { IndicadorPagamentoOrgao } from '@/types/recurso-tipos'

export const obterIndicadorPagamentoOrgao = async (empresaId: string, orgao: string): Promise<IndicadorPagamentoOrgao> => {
  const participacoesDoOrgao = await db
    .select({ id: participacao.id })
    .from(participacao)
    .where(and(eq(participacao.empresaId, empresaId), eq(participacao.orgao, orgao)))

  if (participacoesDoOrgao.length === 0) {
    return { prazoMedioDias: null, quantidadeContratos: 0, atrasosRegistrados: 0 }
  }

  const idsParticipacoes = new Set(participacoesDoOrgao.map((p) => p.id))
  let somaDias = 0
  let quantidadeParaMedia = 0
  let atrasosRegistrados = 0
  const participacoesComPagamento = new Set<string>()

  for (const participacaoId of idsParticipacoes) {
    const [primeiroEmpenho] = await db
      .select({ dataEm: empenhoParticipacao.dataEm })
      .from(empenhoParticipacao)
      .where(eq(empenhoParticipacao.participacaoId, participacaoId))
      .orderBy(empenhoParticipacao.dataEm)
      .limit(1)

    const pagamentos = await db.select().from(pagamentoContrato).where(eq(pagamentoContrato.participacaoId, participacaoId))

    for (const pagamento of pagamentos) {
      if (pagamento.dataEfetivaPagamentoEm) {
        participacoesComPagamento.add(participacaoId)

        if (primeiroEmpenho?.dataEm) {
          const dias = Math.round((new Date(pagamento.dataEfetivaPagamentoEm).getTime() - new Date(primeiroEmpenho.dataEm).getTime()) / 86_400_000)
          if (dias >= 0) {
            somaDias += dias
            quantidadeParaMedia += 1
          }
        }

        if (pagamento.dataPrevistaPagamentoEm && new Date(pagamento.dataEfetivaPagamentoEm) > new Date(pagamento.dataPrevistaPagamentoEm)) {
          atrasosRegistrados += 1
        }
      }
    }
  }

  return {
    prazoMedioDias: quantidadeParaMedia > 0 ? Math.round(somaDias / quantidadeParaMedia) : null,
    quantidadeContratos: participacoesComPagamento.size,
    atrasosRegistrados,
  }
}
