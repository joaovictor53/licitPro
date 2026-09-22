// app/api/participacoes/[id]/proposta/[versaoId]/aprovar/route.ts
// Ferramenta 8 — marca uma versão como aprovada (referência para a
// Ferramenta 9, Aprovação e Assinatura, que ainda não existe). Não altera o
// conteúdo da versão — só o rótulo.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { versaoProposta } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versaoId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, versaoId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  await db.update(versaoProposta).set({ aprovada: false }).where(eq(versaoProposta.participacaoId, id))

  const [atualizada] = await db
    .update(versaoProposta)
    .set({ aprovada: true })
    .where(and(eq(versaoProposta.id, versaoId), eq(versaoProposta.participacaoId, id)))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Versão não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ versao: atualizada })
}
