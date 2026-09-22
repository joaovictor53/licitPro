// lib/assinaturas-server.ts
// Ferramenta 9 — garante uma linha de assinatura por peça da montagem
// (Ferramenta 8), com a classificação padrão, sem sobrescrever linhas já
// existentes (o operador pode já ter registrado assinatura ou sobrescrito
// o método exigido).

import { eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { assinaturaPeca } from '@/app/src/db/schema'
import { montarAgregadoProposta } from '@/lib/montagem-proposta'
import { classificarMetodoExigidoPadrao } from '@/lib/classificacao-assinatura'

export const garantirLinhasAssinatura = async (participacaoId: string) => {
  const agregado = await montarAgregadoProposta(participacaoId)

  for (const peca of agregado.pecas) {
    await db
      .insert(assinaturaPeca)
      .values({
        participacaoId,
        peca: peca.peca,
        metodoExigido: classificarMetodoExigidoPadrao(peca),
      })
      .onConflictDoNothing({ target: [assinaturaPeca.participacaoId, assinaturaPeca.peca] })
  }

  return db.select().from(assinaturaPeca).where(eq(assinaturaPeca.participacaoId, participacaoId))
}
