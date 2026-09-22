// app/api/participacoes/[id]/sessao/convocacoes/[convocacaoId]/route.ts
// Ferramenta 12 — marca uma convocação de anexo como atendida.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { convocacaoAnexoSessao } from '@/app/src/db/schema'
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
    .update(convocacaoAnexoSessao)
    .set({ atendidoEm: new Date(), updatedAt: new Date() })
    .where(and(eq(convocacaoAnexoSessao.id, convocacaoId), eq(convocacaoAnexoSessao.participacaoId, id)))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Convocação não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ convocacao: atualizada })
}
