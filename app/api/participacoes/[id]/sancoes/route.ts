// app/api/participacoes/[id]/sancoes/route.ts
// Ferramenta 15 — alimenta o cadastro de impedimentos. Consolidar no
// cadastro central da empresa (empresa.impedimentosSancoes) é ação manual
// do operador — não há automação que altera o cadastro da empresa sozinha.

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { sancaoParticipacao } from '@/app/src/db/schema'
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

  const sancoes = await db.select().from(sancaoParticipacao).where(eq(sancaoParticipacao.participacaoId, id)).orderBy(asc(sancaoParticipacao.dataEm))
  return NextResponse.json({ sancoes })
}

interface CorpoPost {
  tipo?: string
  motivo?: string
  dataEm?: string
  vigenciaFimEm?: string
  documentoTexto?: string
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
  if (!body?.tipo?.trim() || !body.motivo?.trim() || !body.dataEm) {
    return NextResponse.json({ erro: 'Informe tipo, motivo e data da sanção.' }, { status: 400 })
  }

  const [criada] = await db
    .insert(sancaoParticipacao)
    .values({
      participacaoId: id,
      tipo: body.tipo.trim(),
      motivo: body.motivo.trim(),
      dataEm: new Date(body.dataEm),
      vigenciaFimEm: body.vigenciaFimEm ? new Date(body.vigenciaFimEm) : null,
      documentoTexto: body.documentoTexto?.trim() || null,
    })
    .returning()

  return NextResponse.json({ sancao: criada })
}
