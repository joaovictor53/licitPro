// app/api/participacoes/[id]/resultado/route.ts
// Ferramenta 15, Resultado e Contrato — registro do desfecho. "Perdeu não
// ensina nada" — motivo estruturado é sempre exigido.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { participacao, resultadoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { RESULTADOS_DESFECHO, ResultadoDesfecho } from '@/types/resultado-tipos'
import { EstadoParticipacao } from '@/types/participacao-tipos'

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

  const [resultado] = await db.select().from(resultadoParticipacao).where(eq(resultadoParticipacao.participacaoId, id)).limit(1)
  return NextResponse.json({ resultado: resultado ?? null })
}

// Só "vencedora" segue para adjudicação/contrato — os demais já fecham o
// ciclo desta participação.
const ESTADO_POR_RESULTADO: Partial<Record<ResultadoDesfecho, EstadoParticipacao>> = {
  vencedora: 'adjudicada',
  perdedora: 'encerrada',
  desclassificada: 'encerrada',
  inabilitada: 'inabilitada',
  desistente: 'encerrada',
  certame_anulado: 'encerrada',
  revogado: 'encerrada',
  fracassado: 'encerrada',
  deserto: 'encerrada',
}

interface CorpoPatch {
  resultado?: ResultadoDesfecho
  motivoEstruturado?: string
  valorVencedorGlobal?: string
  diferencaParaVencedorAbsoluta?: string
  diferencaParaVencedorPercentual?: string
  dataResultadoEm?: string
  adjudicacaoDataEm?: string
  adjudicacaoQuem?: string
  homologacaoDataEm?: string
  homologacaoPublicacao?: string
}

export async function PATCH(
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

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body?.resultado || !RESULTADOS_DESFECHO.includes(body.resultado)) {
    return NextResponse.json({ erro: 'Resultado inválido.' }, { status: 400 })
  }
  if (!body.motivoEstruturado?.trim()) {
    return NextResponse.json({ erro: 'Motivo estruturado é obrigatório.' }, { status: 400 })
  }
  if (!body.dataResultadoEm) {
    return NextResponse.json({ erro: 'Informe a data do resultado.' }, { status: 400 })
  }

  const valores = {
    resultado: body.resultado,
    motivoEstruturado: body.motivoEstruturado.trim(),
    valorVencedorGlobal: body.valorVencedorGlobal ?? null,
    diferencaParaVencedorAbsoluta: body.diferencaParaVencedorAbsoluta ?? null,
    diferencaParaVencedorPercentual: body.diferencaParaVencedorPercentual ?? null,
    dataResultadoEm: new Date(body.dataResultadoEm),
    adjudicacaoDataEm: body.adjudicacaoDataEm ? new Date(body.adjudicacaoDataEm) : null,
    adjudicacaoQuem: body.adjudicacaoQuem?.trim() || null,
    homologacaoDataEm: body.homologacaoDataEm ? new Date(body.homologacaoDataEm) : null,
    homologacaoPublicacao: body.homologacaoPublicacao?.trim() || null,
    registradoPorUserId: session.user.id,
    updatedAt: new Date(),
  }

  const [salvo] = await db
    .insert(resultadoParticipacao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: resultadoParticipacao.participacaoId, set: valores })
    .returning()

  const novoEstado = ESTADO_POR_RESULTADO[body.resultado]
  if (novoEstado) {
    await db.update(participacao).set({ estado: novoEstado, updatedAt: new Date() }).where(eq(participacao.id, id))
  }

  return NextResponse.json({ resultado: salvo })
}
