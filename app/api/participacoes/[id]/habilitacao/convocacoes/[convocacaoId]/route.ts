// app/api/participacoes/[id]/habilitacao/convocacoes/[convocacaoId]/route.ts
// Ferramenta 13 — marca uma convocação do pregoeiro como atendida.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { convocacaoPregoeiro } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; convocacaoId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, convocacaoId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [atualizada] = await db
    .update(convocacaoPregoeiro)
    .set({ atendidoEm: new Date(), updatedAt: new Date() })
    .where(and(eq(convocacaoPregoeiro.id, convocacaoId), eq(convocacaoPregoeiro.participacaoId, id)))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Convocação não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ convocacao: atualizada })
}
