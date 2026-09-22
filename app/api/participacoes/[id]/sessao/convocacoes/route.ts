// app/api/participacoes/[id]/sessao/convocacoes/route.ts
// Ferramenta 12 — convocação de anexo pós-sessão: criticidade máxima,
// prazo curto. O pacote já está pronto na Ferramenta 11.

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { convocacaoAnexoSessao } from '@/app/src/db/schema'
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
    .from(convocacaoAnexoSessao)
    .where(eq(convocacaoAnexoSessao.participacaoId, id))
    .orderBy(asc(convocacaoAnexoSessao.prazoLimiteEm))

  return NextResponse.json({ convocacoes })
}

interface CorpoPost {
  dataHoraConvocacaoEm?: string
  prazoLimiteEm?: string
  oQueFoiSolicitado?: string
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
    .insert(convocacaoAnexoSessao)
    .values({
      participacaoId: id,
      dataHoraConvocacaoEm: new Date(body.dataHoraConvocacaoEm),
      prazoLimiteEm: new Date(body.prazoLimiteEm),
      oQueFoiSolicitado: body.oQueFoiSolicitado.trim(),
    })
    .returning()

  return NextResponse.json({ convocacao: criada })
}
