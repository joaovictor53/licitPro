// app/api/participacoes/[id]/recurso-proprio/route.ts
// Ferramenta 14 — quando a EMPRESA recorre. GET lista os eventos + material
// base (matriz/viabilidade/sessão, sem redigir peça); POST registra um novo
// evento recorrível (desclassificação, inabilitação, resultado desfavorável).

import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { recursoProprioParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { montarMaterialBaseRecurso } from '@/lib/material-base-recurso'

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
    .from(recursoProprioParticipacao)
    .where(eq(recursoProprioParticipacao.participacaoId, id))
    .orderBy(desc(recursoProprioParticipacao.dataHoraAtoEm))

  const materialBase = await montarMaterialBaseRecurso(id)

  return NextResponse.json({ recursos, materialBase })
}

interface CorpoPost {
  atoRecorrido?: string
  dataHoraAtoEm?: string
  prazoIntencaoEm?: string
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
  if (!body?.atoRecorrido?.trim() || !body.dataHoraAtoEm) {
    return NextResponse.json({ erro: 'Informe qual foi o ato e a data/hora.' }, { status: 400 })
  }

  const [criado] = await db
    .insert(recursoProprioParticipacao)
    .values({
      participacaoId: id,
      atoRecorrido: body.atoRecorrido.trim(),
      dataHoraAtoEm: new Date(body.dataHoraAtoEm),
      prazoIntencaoEm: body.prazoIntencaoEm ? new Date(body.prazoIntencaoEm) : null,
      estado: 'evento_identificado',
    })
    .returning()

  return NextResponse.json({ recurso: criado })
}
