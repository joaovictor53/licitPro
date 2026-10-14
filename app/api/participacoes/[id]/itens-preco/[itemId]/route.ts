// app/api/participacoes/[id]/itens-preco/[itemId]/route.ts
// Ferramenta 7, Composição de Preço — edição/remoção de um item.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { edital, itemPrecoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { aplicarRegra, sugerirNoTexto } from '@/lib/casas-decimais'

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
  let avisoCasas = ''
  if (body.precoOfertado !== undefined) {
    let precoGravado = body.precoOfertado
    if (precoGravado != null && precoGravado.trim() !== '') {
      // Casas decimais do preço: lidas do edital (com página); sem regra, vale o padrão de 2 casas.
      // Nunca arredonda em silêncio: ou cabe, ou é truncado avisando, ou é recusado.
      const [editalDaParticipacao] = await db
        .select({ texto: edital.textoExtraido })
        .from(edital)
        .where(eq(edital.participacaoId, id))
        .limit(1)
      const casas = aplicarRegra(precoGravado, editalDaParticipacao ? sugerirNoTexto(editalDaParticipacao.texto) : null)
      if (casas.valor === null) {
        return NextResponse.json({ erro: casas.mensagem }, { status: 400 })
      }
      precoGravado = casas.valor
      avisoCasas = casas.mensagem
    }
    valores.precoOfertado = precoGravado === '' ? null : precoGravado
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

  return NextResponse.json({ item: atualizado, ...(avisoCasas ? { aviso: avisoCasas } : {}) })
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
