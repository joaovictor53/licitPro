// app/api/participacoes/[id]/itens-preco/[itemId]/route.ts
// Ferramenta 7, Composição de Preço — edição/remoção de um item.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { itemPrecoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

interface CorpoPatch {
  descricao?: string
  unidade?: string | null
  quantidade?: string
  marcaModelo?: string | null
  custoUnitario?: string | null
  pisoUnitario?: string | null
  alvoUnitario?: string | null
  tetoUnitario?: string | null
  precoOfertado?: string | null
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

  const valores: Record<string, unknown> = { updatedAt: new Date() }
  if (body.descricao !== undefined) valores.descricao = body.descricao.trim()
  if (body.unidade !== undefined) valores.unidade = body.unidade?.trim() || null
  if (body.quantidade !== undefined) valores.quantidade = body.quantidade
  if (body.marcaModelo !== undefined) valores.marcaModelo = body.marcaModelo?.trim() || null
  if (body.custoUnitario !== undefined) valores.custoUnitario = body.custoUnitario
  if (body.pisoUnitario !== undefined) valores.pisoUnitario = body.pisoUnitario
  if (body.alvoUnitario !== undefined) valores.alvoUnitario = body.alvoUnitario
  if (body.tetoUnitario !== undefined) valores.tetoUnitario = body.tetoUnitario
  if (body.precoOfertado !== undefined) {
    valores.precoOfertado = body.precoOfertado
    valores.precoDefinidoPorUserId = session.user.id
    valores.precoDefinidoEm = new Date()
  }

  const [atualizado] = await db
    .update(itemPrecoParticipacao)
    .set(valores)
    .where(and(eq(itemPrecoParticipacao.id, itemId), eq(itemPrecoParticipacao.participacaoId, id)))
    .returning()

  if (!atualizado) {
    return NextResponse.json({ erro: 'Item não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ item: atualizado })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, itemId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  await db
    .delete(itemPrecoParticipacao)
    .where(and(eq(itemPrecoParticipacao.id, itemId), eq(itemPrecoParticipacao.participacaoId, id)))

  return NextResponse.json({ ok: true })
}
