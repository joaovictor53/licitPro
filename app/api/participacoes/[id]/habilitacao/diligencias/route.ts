// app/api/participacoes/[id]/habilitacao/diligencias/route.ts
// Ferramenta 13 — diligência mal respondida vira motivo de inabilitação.

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { diligenciaHabilitacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const diligencias = await db
    .select()
    .from(diligenciaHabilitacao)
    .where(eq(diligenciaHabilitacao.participacaoId, id))
    .orderBy(asc(diligenciaHabilitacao.prazoRespostaEm))

  return NextResponse.json({ diligencias })
}

interface CorpoPost {
  oQueFoiQuestionado?: string
  prazoRespostaEm?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPost | null
  if (!body?.oQueFoiQuestionado?.trim() || !body.prazoRespostaEm) {
    return NextResponse.json({ erro: 'Informe o que foi questionado e o prazo de resposta.' }, { status: 400 })
  }

  const [criada] = await db
    .insert(diligenciaHabilitacao)
    .values({ participacaoId: id, oQueFoiQuestionado: body.oQueFoiQuestionado.trim(), prazoRespostaEm: new Date(body.prazoRespostaEm) })
    .returning()

  return NextResponse.json({ diligencia: criada })
}
