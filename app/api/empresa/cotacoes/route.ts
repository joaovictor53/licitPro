// app/api/empresa/cotacoes/route.ts
// Ferramenta 4 — histórico de cotações de fornecedor. GET aceita ?item= para
// trazer o histórico do mesmo item (mostrado ao lado ao digitar de novo).

import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq, ilike } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { cotacaoFornecedor } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

export async function GET(request: NextRequest) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const item = request.nextUrl.searchParams.get('item')

  const cotacoes = await db
    .select()
    .from(cotacaoFornecedor)
    .where(
      item
        ? and(eq(cotacaoFornecedor.empresaId, empresaAtual.id), ilike(cotacaoFornecedor.item, `%${item}%`))
        : eq(cotacaoFornecedor.empresaId, empresaAtual.id)
    )
    .orderBy(desc(cotacaoFornecedor.cotadoEm))

  return NextResponse.json({ cotacoes })
}

interface CorpoPost {
  fornecedor?: string
  item?: string
  valorUnitario?: string
  cotadoEm?: string
  validaAteEm?: string | null
}

export async function POST(request: NextRequest) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPost | null
  if (!body?.fornecedor?.trim() || !body.item?.trim() || !body.valorUnitario) {
    return NextResponse.json({ erro: 'Informe fornecedor, item e valor unitário.' }, { status: 400 })
  }

  const [criada] = await db
    .insert(cotacaoFornecedor)
    .values({
      empresaId: empresaAtual.id,
      fornecedor: body.fornecedor.trim(),
      item: body.item.trim(),
      valorUnitario: body.valorUnitario,
      cotadoEm: body.cotadoEm ? new Date(body.cotadoEm) : new Date(),
      validaAteEm: body.validaAteEm ? new Date(body.validaAteEm) : null,
      criadoPorUserId: session.user.id,
    })
    .returning()

  return NextResponse.json({ cotacao: criada })
}
