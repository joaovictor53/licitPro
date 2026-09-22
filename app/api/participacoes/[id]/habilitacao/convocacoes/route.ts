// app/api/participacoes/[id]/habilitacao/convocacoes/route.ts
// Ferramenta 13 — convocação do pregoeiro para envio de documento de
// habilitação. Criticidade máxima, costuma ser de horas.

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { convocacaoPregoeiro } from '@/app/src/db/schema'
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

  const convocacoes = await db
    .select()
    .from(convocacaoPregoeiro)
    .where(eq(convocacaoPregoeiro.participacaoId, id))
    .orderBy(asc(convocacaoPregoeiro.prazoLimiteEm))

  return NextResponse.json({ convocacoes })
}

interface CorpoPost {
  dataHoraConvocacaoEm?: string
  prazoLimiteEm?: string
  oQueFoiSolicitado?: string
  ondeEnviar?: string
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
  if (!body?.dataHoraConvocacaoEm || !body.prazoLimiteEm || !body.oQueFoiSolicitado?.trim()) {
    return NextResponse.json({ erro: 'Informe data/hora da convocação, prazo limite e o que foi solicitado.' }, { status: 400 })
  }

  const [criada] = await db
    .insert(convocacaoPregoeiro)
    .values({
      participacaoId: id,
      dataHoraConvocacaoEm: new Date(body.dataHoraConvocacaoEm),
      prazoLimiteEm: new Date(body.prazoLimiteEm),
      oQueFoiSolicitado: body.oQueFoiSolicitado.trim(),
      ondeEnviar: body.ondeEnviar?.trim() || null,
    })
    .returning()

  return NextResponse.json({ convocacao: criada })
}
