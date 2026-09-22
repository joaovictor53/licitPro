// app/api/participacoes/[id]/habilitacao/diligencias/[diligenciaId]/route.ts
// Ferramenta 13 — registra a resposta enviada a uma diligência.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { diligenciaHabilitacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

interface CorpoPatch {
  documentoComplementar?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; diligenciaId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, diligenciaId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as CorpoPatch

  const [atualizada] = await db
    .update(diligenciaHabilitacao)
    .set({ respostaEnviadaEm: new Date(), documentoComplementar: body.documentoComplementar?.trim() || null, updatedAt: new Date() })
    .where(and(eq(diligenciaHabilitacao.id, diligenciaId), eq(diligenciaHabilitacao.participacaoId, id)))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Diligência não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ diligencia: atualizada })
}
