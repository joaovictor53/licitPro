// app/api/participacoes/[id]/itens-preco/route.ts
// Ferramenta 7, Composição de Preço — lista e cadastro de itens/lotes.
// Ver nota de escopo em types/preco-tipos.ts: sem extração estruturada de
// itens pela Ferramenta 3, o operador cadastra a linha aqui.

import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { itemPrecoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { avaliarItemPreco } from '@/lib/composicao-preco'

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

  const itens = await db
    .select()
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))
    .orderBy(asc(itemPrecoParticipacao.ordem))

  const itensComAvaliacao = itens.map((item) => ({
    ...item,
    avaliacao: avaliarItemPreco({
      id: item.id,
      ordem: item.ordem,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: Number(item.quantidade),
      marcaModelo: item.marcaModelo,
      custoUnitario: item.custoUnitario != null ? Number(item.custoUnitario) : null,
      pisoUnitario: item.pisoUnitario != null ? Number(item.pisoUnitario) : null,
      alvoUnitario: item.alvoUnitario != null ? Number(item.alvoUnitario) : null,
      tetoUnitario: item.tetoUnitario != null ? Number(item.tetoUnitario) : null,
      precoOfertado: item.precoOfertado != null ? Number(item.precoOfertado) : null,
    }),
  }))

  return NextResponse.json({ itens: itensComAvaliacao, valorEstimado: participacaoAtual.valorEstimado })
}

interface CorpoPost {
  descricao?: string
  unidade?: string | null
  quantidade?: string
  marcaModelo?: string | null
  custoUnitario?: string | null
  pisoUnitario?: string | null
  alvoUnitario?: string | null
  tetoUnitario?: string | null
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
  if (!body?.descricao?.trim()) {
    return NextResponse.json({ erro: 'Descrição do item é obrigatória.' }, { status: 400 })
  }

  const [{ maiorOrdem } = { maiorOrdem: 0 }] = await db
    .select({ maiorOrdem: itemPrecoParticipacao.ordem })
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))
    .orderBy(desc(itemPrecoParticipacao.ordem))
    .limit(1)

  const [criado] = await db
    .insert(itemPrecoParticipacao)
    .values({
      participacaoId: id,
      ordem: (maiorOrdem ?? 0) + 1,
      descricao: body.descricao.trim(),
      unidade: body.unidade?.trim() || null,
      quantidade: body.quantidade ?? '1',
      marcaModelo: body.marcaModelo?.trim() || null,
      custoUnitario: body.custoUnitario ?? null,
      pisoUnitario: body.pisoUnitario ?? null,
      alvoUnitario: body.alvoUnitario ?? null,
      tetoUnitario: body.tetoUnitario ?? null,
    })
    .returning()

  return NextResponse.json({ item: criado })
}
