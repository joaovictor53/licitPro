// app/api/participacoes/[id]/condicoes-proposta/route.ts
// Ferramenta 8 — GET: o que o edital exige da proposta (com página e trecho) e o que já foi
// oferecido. PUT: grava as condições oferecidas; prazo pior que o do edital é recusado.

import { NextRequest, NextResponse } from 'next/server'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { condicoesPropostaParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { carregarCondicoes } from '@/lib/condicoes-proposta-server'
import { CAMPOS_POR_ITEM, conferirCondicao } from '@/lib/exigencias-proposta'
import type { CondicaoOferecida, CondicoesOferecidas } from '@/types/proposta-tipos'

const UNIDADES = new Set(['horas', 'dias', 'meses', 'anos'])

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

  return NextResponse.json(await carregarCondicoes(id))
}

export async function PUT(
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

  const body = (await request.json().catch(() => null)) as { valores?: Record<string, { valor?: unknown; unidade?: unknown }> } | null
  if (!body?.valores || typeof body.valores !== 'object') {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const { campos } = await carregarCondicoes(id)
  const idsExigidos = new Set(campos.filter((campo) => !CAMPOS_POR_ITEM.has(campo.id)).map((campo) => campo.id))

  const valores: CondicoesOferecidas = {}
  const recusas: string[] = []
  for (const [campoId, bruto] of Object.entries(body.valores)) {
    if (!idsExigidos.has(campoId)) continue // só guarda o que o edital realmente exige
    const valor = typeof bruto?.valor === 'string' || typeof bruto?.valor === 'number' ? String(bruto.valor).trim() : ''
    if (!valor) continue // campo vazio = não informado
    const unidade: CondicaoOferecida['unidade'] = typeof bruto.unidade === 'string' && UNIDADES.has(bruto.unidade) ? (bruto.unidade as CondicaoOferecida['unidade']) : null
    const campo = campos.find((c) => c.id === campoId)!
    const resultado = conferirCondicao(campo, { valor, unidade })
    if (!resultado.ok) recusas.push(resultado.mensagem)
    else valores[campoId] = { valor, unidade }
  }
  if (recusas.length) {
    return NextResponse.json({ erro: recusas.join(' '), recusas }, { status: 400 })
  }

  await db
    .insert(condicoesPropostaParticipacao)
    .values({ participacaoId: id, valores, atualizadoPorUserId: session.user.id })
    .onConflictDoUpdate({
      target: condicoesPropostaParticipacao.participacaoId,
      set: { valores, atualizadoPorUserId: session.user.id, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true, valores })
}
