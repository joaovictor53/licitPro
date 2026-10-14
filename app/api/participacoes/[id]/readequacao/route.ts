// app/api/participacoes/[id]/readequacao/route.ts
// Ferramenta 12/13 — proposta readequada depois dos lances. POST calcula os novos preços
// unitários (proporcional ou item a item) a partir do lance, aplicando as regras do edital
// ("vedado aumentar o unitário", "total igual ao lance"); com `aplicar: true` e sem violação,
// grava os preços. Depois de aplicar, gere a proposta de novo (nova versão).

import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { edital, itemPrecoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { lerDecimal } from '@/lib/dinheiro'
import {
  ajustarItemAItem, ajustarProporcional, REGRAS_PADRAO, sugerirRegrasNoTexto, type RegrasReadequacao, type ResultadoReadequacao,
} from '@/lib/readequacao-proposta'

interface Corpo {
  modo?: 'proporcional' | 'item_a_item'
  lance?: string
  precos?: Record<string, string>
  /** O operador confirma ou troca as regras sugeridas pelo edital. */
  regras?: { vedadoAumentarUnitario?: boolean; totalIgualAoLance?: boolean }
  aplicar?: boolean
}

const numero = (texto: string | undefined): number | null => {
  const lido = texto ? lerDecimal(texto) : null
  return lido ? Number(lido.micro) / 1_000_000 : null
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

  const body = (await request.json().catch(() => null)) as Corpo | null
  if (!body || (body.modo !== 'proporcional' && body.modo !== 'item_a_item')) {
    return NextResponse.json({ erro: "Informe o modo: 'proporcional' ou 'item_a_item'." }, { status: 400 })
  }

  const itens = await db
    .select()
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))
    .orderBy(asc(itemPrecoParticipacao.ordem))
  const entrada = itens.map((item) => ({
    id: item.id,
    ordem: item.ordem,
    quantidade: Number(item.quantidade),
    precoOfertado: item.precoOfertado != null ? Number(item.precoOfertado) : null,
  }))

  const [doEdital] = await db.select({ texto: edital.textoExtraido }).from(edital).where(eq(edital.participacaoId, id)).limit(1)
  const sugerida = doEdital ? sugerirRegrasNoTexto(doEdital.texto) : null
  const regras: RegrasReadequacao = {
    ...(sugerida ?? REGRAS_PADRAO),
    ...(body.regras?.vedadoAumentarUnitario != null ? { vedadoAumentarUnitario: body.regras.vedadoAumentarUnitario } : {}),
    ...(body.regras?.totalIgualAoLance != null ? { totalIgualAoLance: body.regras.totalIgualAoLance } : {}),
  }

  const lance = numero(body.lance)
  let resultado: ResultadoReadequacao
  if (body.modo === 'proporcional') {
    if (lance == null) return NextResponse.json({ erro: 'Informe o lance (valor final).' }, { status: 400 })
    resultado = ajustarProporcional(entrada, lance, regras)
  } else {
    const novos: Record<string, number> = {}
    for (const [itemId, texto] of Object.entries(body.precos ?? {})) {
      const valor = numero(texto)
      if (valor != null) novos[itemId] = valor
    }
    resultado = ajustarItemAItem(entrada, novos, regras, lance)
  }

  let aplicado = false
  if (body.aplicar && !resultado.bloqueada) {
    for (const [itemId, preco] of Object.entries(resultado.novosPrecos)) {
      await db
        .update(itemPrecoParticipacao)
        .set({ precoOfertado: preco.toFixed(4), precoDefinidoPorUserId: session.user.id, precoDefinidoEm: new Date(), updatedAt: new Date() })
        .where(and(eq(itemPrecoParticipacao.id, itemId), eq(itemPrecoParticipacao.participacaoId, id)))
    }
    aplicado = true
  }

  return NextResponse.json({ resultado, regras, regrasVieramDoEdital: Boolean(sugerida), aplicado })
}
