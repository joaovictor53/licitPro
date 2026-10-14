// lib/condicoes-proposta-server.ts
// Ferramenta 8 — carrega o que o edital exige da proposta (lido do texto dele, com página) e o
// que o operador oferece, e junta as pendências. Usado pela montagem, pela geração e pela rota.

import { eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { condicoesPropostaParticipacao, edital } from '@/app/src/db/schema'
import { lerCamposExigidos, type CampoExigidoProposta } from '@/lib/exigencias-proposta'
import type { CondicoesOferecidas } from '@/types/proposta-tipos'

export interface CondicoesDaParticipacao {
  campos: CampoExigidoProposta[]
  valores: CondicoesOferecidas
  /** Há edital enviado? Sem edital não dá para saber o que ele exige. */
  temEdital: boolean
}

export const carregarCondicoes = async (participacaoId: string): Promise<CondicoesDaParticipacao> => {
  const [doEdital] = await db.select({ texto: edital.textoExtraido }).from(edital).where(eq(edital.participacaoId, participacaoId)).limit(1)
  const [salvas] = await db
    .select({ valores: condicoesPropostaParticipacao.valores })
    .from(condicoesPropostaParticipacao)
    .where(eq(condicoesPropostaParticipacao.participacaoId, participacaoId))
    .limit(1)
  return {
    campos: doEdital ? lerCamposExigidos(doEdital.texto) : [],
    valores: salvas?.valores ?? {},
    temEdital: Boolean(doEdital),
  }
}
