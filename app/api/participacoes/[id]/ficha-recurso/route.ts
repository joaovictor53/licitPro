// app/api/participacoes/[id]/ficha-recurso/route.ts
// Ferramenta 2, Ficha do Recurso — GET traz o que existe (ou uma ficha vazia,
// sem gravar nada); PATCH salva o preenchimento do operador e recalcula o
// semáforo. O semáforo nunca bloqueia, só avisa — a gravação sempre acontece.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { fichaRecurso } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { obterIndicadorPagamentoOrgao } from '@/lib/indicador-pagamento-orgao'
import { calcularSemaforo } from '@/lib/semaforo-recurso'
import { INSTRUMENTOS_RECURSO, ORIGENS_RECURSO, SITUACOES_RECURSO } from '@/types/recurso-tipos'

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

  const [ficha] = await db.select().from(fichaRecurso).where(eq(fichaRecurso.participacaoId, id)).limit(1)
  const indicadorPagamento = await obterIndicadorPagamentoOrgao(participacaoAtual.empresaId, participacaoAtual.orgao)

  return NextResponse.json({ ficha: ficha ?? null, indicadorPagamento })
}

interface CorpoPatch {
  origem?: string | null
  origemPercentuais?: Record<string, number> | null
  instrumento?: string | null
  situacao?: string | null
  numeroInstrumento?: string | null
  valorRecurso?: string | null
  vigenciaEm?: string | null
  prazoEstimadoPagamentoEm?: string | null
  evidencia?: string | null
  anotacaoOperador?: string | null
}

const dataOuNula = (valor: string | null | undefined): Date | null => {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
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
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  if (body.origem != null && !ORIGENS_RECURSO.includes(body.origem as (typeof ORIGENS_RECURSO)[number])) {
    return NextResponse.json({ erro: `Origem inválida. Use uma de: ${ORIGENS_RECURSO.join(', ')}.` }, { status: 400 })
  }
  if (body.instrumento != null && !INSTRUMENTOS_RECURSO.includes(body.instrumento as (typeof INSTRUMENTOS_RECURSO)[number])) {
    return NextResponse.json({ erro: `Instrumento inválido. Use um de: ${INSTRUMENTOS_RECURSO.join(', ')}.` }, { status: 400 })
  }
  if (body.situacao != null && !SITUACOES_RECURSO.includes(body.situacao as (typeof SITUACOES_RECURSO)[number])) {
    return NextResponse.json({ erro: `Situação inválida. Use uma de: ${SITUACOES_RECURSO.join(', ')}.` }, { status: 400 })
  }

  const vigenciaEm = dataOuNula(body.vigenciaEm)
  const indicadorPagamento = await obterIndicadorPagamentoOrgao(participacaoAtual.empresaId, participacaoAtual.orgao)
  const { semaforo, fatores } = calcularSemaforo({
    origem: (body.origem as (typeof ORIGENS_RECURSO)[number] | null) ?? null,
    instrumento: (body.instrumento as (typeof INSTRUMENTOS_RECURSO)[number] | null) ?? null,
    situacao: (body.situacao as (typeof SITUACOES_RECURSO)[number] | null) ?? null,
    vigenciaEm,
    indicadorPagamento,
  })

  const valores = {
    origem: (body.origem as (typeof ORIGENS_RECURSO)[number] | null) ?? null,
    origemPercentuais: body.origemPercentuais ?? null,
    instrumento: (body.instrumento as (typeof INSTRUMENTOS_RECURSO)[number] | null) ?? null,
    situacao: (body.situacao as (typeof SITUACOES_RECURSO)[number] | null) ?? null,
    numeroInstrumento: body.numeroInstrumento?.trim() || null,
    valorRecurso: body.valorRecurso || null,
    vigenciaEm,
    prazoEstimadoPagamentoEm: dataOuNula(body.prazoEstimadoPagamentoEm),
    evidencia: body.evidencia?.trim() || null,
    anotacaoOperador: body.anotacaoOperador?.trim() || null,
    anotacaoAutorId: body.anotacaoOperador?.trim() ? session.user.id : null,
    anotacaoEm: body.anotacaoOperador?.trim() ? new Date() : null,
    semaforo,
    semaforoFatores: fatores,
    preenchidoPorUserId: session.user.id,
    updatedAt: new Date(),
  }

  const [atualizado] = await db
    .insert(fichaRecurso)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: fichaRecurso.participacaoId, set: valores })
    .returning()

  return NextResponse.json({ ficha: atualizado, indicadorPagamento })
}
