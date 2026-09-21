// app/api/participacoes/[id]/acessorias/[itemId]/route.ts
// Exigências acessórias (garantia, amostra, POC, visita técnica) — "Marcar
// como cumprida" exige comprovante ou justificativa (Ferramenta 6, Regras).

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { acessoriaParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { STATUS_ACESSORIA } from '@/types/documento-tipos'

interface CorpoPatch {
  status?: string
  prazoLimiteEm?: string | null
  custoEstimado?: string | null
  responsavel?: string | null
  comprovante?: string | null
  justificativa?: string | null
}

const dataOuNula = (valor: string | null | undefined): Date | null => {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, itemId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  if (body.status != null && !STATUS_ACESSORIA.includes(body.status as (typeof STATUS_ACESSORIA)[number])) {
    return NextResponse.json({ erro: `Status inválido. Use um de: ${STATUS_ACESSORIA.join(', ')}.` }, { status: 400 })
  }

  const comprovante = body.comprovante?.trim() || null
  const justificativa = body.justificativa?.trim() || null

  if (body.status === 'cumprida' && !comprovante && !justificativa) {
    return NextResponse.json({ erro: 'Informe comprovante ou justificativa para marcar como cumprida.' }, { status: 400 })
  }

  const [atualizado] = await db
    .update(acessoriaParticipacao)
    .set({
      ...(body.status != null ? { status: body.status as (typeof STATUS_ACESSORIA)[number] } : {}),
      prazoLimiteEm: dataOuNula(body.prazoLimiteEm),
      custoEstimado: body.custoEstimado || null,
      responsavel: body.responsavel?.trim() || null,
      comprovante,
      justificativa,
      marcadoPorUserId: session.user.id,
      marcadoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(acessoriaParticipacao.id, itemId), eq(acessoriaParticipacao.participacaoId, id)))
    .returning()

  if (!atualizado) {
    return NextResponse.json({ erro: 'Exigência acessória não encontrada.' }, { status: 404 })
  }

  return NextResponse.json({ item: atualizado })
}
