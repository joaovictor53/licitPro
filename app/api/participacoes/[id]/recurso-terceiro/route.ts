// app/api/participacoes/[id]/recurso-terceiro/route.ts
// Ferramenta 14 — quando OUTRO recorre contra a empresa. "Tão importante
// quanto o primeiro e costuma ser esquecido: empresa que ganhou e não
// apresenta contrarrazões pode perder por omissão."

import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { recursoTerceiroParticipacao } from '@/app/src/db/schema'
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

  const recursos = await db
    .select()
    .from(recursoTerceiroParticipacao)
    .where(eq(recursoTerceiroParticipacao.participacaoId, id))
    .orderBy(desc(recursoTerceiroParticipacao.dataIdentificacaoEm))

  return NextResponse.json({ recursos })
}

interface CorpoPost {
  quem?: string
  contraOQue?: string
  dataIdentificacaoEm?: string
  prazoContrarrazoesDiasUteis?: number
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
  if (!body?.quem?.trim() || !body.contraOQue?.trim() || !body.dataIdentificacaoEm) {
    return NextResponse.json({ erro: 'Informe quem recorreu, contra o quê e a data.' }, { status: 400 })
  }

  const { adicionarDiasUteis } = await import('@/lib/dias-uteis')
  const dataIdentificacaoEm = new Date(body.dataIdentificacaoEm)

  const [criado] = await db
    .insert(recursoTerceiroParticipacao)
    .values({
      participacaoId: id,
      quem: body.quem.trim(),
      contraOQue: body.contraOQue.trim(),
      dataIdentificacaoEm,
      prazoContrarrazoesEm: adicionarDiasUteis(dataIdentificacaoEm, body.prazoContrarrazoesDiasUteis ?? 3),
      estado: 'aguardando_contrarrazoes',
    })
    .returning()

  return NextResponse.json({ recurso: criado })
}
