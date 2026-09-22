// lib/material-base-recurso.ts
// Ferramenta 14 — "material com fonte, para quem vai redigir. O sistema não
// redige peça recursal." Só reúne o que já existe (matriz, viabilidade,
// registro da sessão) com página/cláusula/fonte, sem gerar texto.
//
// A Ferramenta 16 (Verificação de Autenticidade) já existe no código para o
// fluxo antigo de análise de concorrente (`app/api/analisar`), mas ainda não
// está religada a uma participação específica — por isso "o que foi
// conferido no concorrente" fica de fora deste agregado por enquanto.

import { eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { exigenciaEdital, registroSessao, viabilidadeParticipacao } from '@/app/src/db/schema'

export const montarMaterialBaseRecurso = async (participacaoId: string) => {
  const exigencias = await db
    .select({ titulo: exigenciaEdital.titulo, trecho: exigenciaEdital.trecho, pagina: exigenciaEdital.pagina, clausula: exigenciaEdital.clausula, risco: exigenciaEdital.risco })
    .from(exigenciaEdital)
    .where(eq(exigenciaEdital.participacaoId, participacaoId))

  const [viabilidade] = await db.select().from(viabilidadeParticipacao).where(eq(viabilidadeParticipacao.participacaoId, participacaoId)).limit(1)
  const [sessao] = await db.select().from(registroSessao).where(eq(registroSessao.participacaoId, participacaoId)).limit(1)

  return {
    daMatriz: exigencias,
    daViabilidade: viabilidade?.resultado
      ? { piso: viabilidade.resultado.base.pisoAlvoTeto.piso, alvo: viabilidade.resultado.base.pisoAlvoTeto.alvo, teto: viabilidade.resultado.base.pisoAlvoTeto.teto }
      : null,
    doRegistroDaSessao: sessao
      ? {
          lanceFinalEmpresa: sessao.lanceFinalEmpresa,
          menorLanceDisputa: sessao.menorLanceDisputa,
          classificacaoObtida: sessao.classificacaoObtida,
          valorVencedor: sessao.valorVencedor,
          ocorrencias: sessao.ocorrencias,
        }
      : null,
  }
}
