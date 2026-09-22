// app/api/participacoes/[id]/empenhos/route.ts
// Ferramenta 15 — "aqui o círculo fecha com a Ferramenta 2: o que era
// previsão de recurso vira empenho real."

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { empenhoParticipacao } from '@/app/src/db/schema'
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

  const empenhos = await db.select().from(empenhoParticipacao).where(eq(empenhoParticipacao.participacaoId, id)).orderBy(asc(empenhoParticipacao.dataEm))
  return NextResponse.json({ empenhos })
}

interface CorpoPost {
  numeroNotaEmpenho?: string
  dataEm?: string
  valorEmpenhado?: string
  saldo?: string
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
  if (!body?.numeroNotaEmpenho?.trim() || !body.dataEm || !body.valorEmpenhado) {
    return NextResponse.json({ erro: 'Informe número, data e valor do empenho.' }, { status: 400 })
  }

  const [criado] = await db
    .insert(empenhoParticipacao)
    .values({
      participacaoId: id,
      numeroNotaEmpenho: body.numeroNotaEmpenho.trim(),
      dataEm: new Date(body.dataEm),
      valorEmpenhado: body.valorEmpenhado,
      saldo: body.saldo ?? null,
    })
    .returning()

  return NextResponse.json({ empenho: criado })
}
