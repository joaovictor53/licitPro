// app/api/participacoes/[id]/itens-preco/aplicar/route.ts
// Ferramenta 7, Composição de Preço — preenchimento rápido: aplicar
// preço-alvo em tudo, ou desconto linear sobre o preço já digitado.
// "Copiar de participação anterior" fica fora deste MVP — depende de saber
// identificar "mesmo objeto no mesmo órgão" de forma confiável, o que ainda
// não existe (comparação de objeto é texto livre, sem normalização).

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { itemPrecoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

interface CorpoAplicar {
  acao?: 'aplicar_alvo' | 'desconto_linear'
  percentualDesconto?: number
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

  const body = (await request.json().catch(() => null)) as CorpoAplicar | null
  if (!body?.acao || !['aplicar_alvo', 'desconto_linear'].includes(body.acao)) {
    return NextResponse.json({ erro: 'Ação inválida. Use "aplicar_alvo" ou "desconto_linear".' }, { status: 400 })
  }

  const itens = await db.select().from(itemPrecoParticipacao).where(eq(itemPrecoParticipacao.participacaoId, id))

  for (const item of itens) {
    let novoPreco: number | null = null

    if (body.acao === 'aplicar_alvo') {
      novoPreco = item.alvoUnitario != null ? Number(item.alvoUnitario) : null
    } else {
      const percentual = body.percentualDesconto ?? 0
      const base = item.precoOfertado != null ? Number(item.precoOfertado) : item.alvoUnitario != null ? Number(item.alvoUnitario) : null
      novoPreco = base != null ? base * (1 - percentual / 100) : null
    }

    if (novoPreco == null) continue

    await db
      .update(itemPrecoParticipacao)
      .set({
        precoOfertado: novoPreco.toFixed(4),
        precoDefinidoPorUserId: session.user.id,
        precoDefinidoEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(itemPrecoParticipacao.id, item.id))
  }

  const itensAtualizados = await db.select().from(itemPrecoParticipacao).where(eq(itemPrecoParticipacao.participacaoId, id))
  return NextResponse.json({ itens: itensAtualizados })
}
