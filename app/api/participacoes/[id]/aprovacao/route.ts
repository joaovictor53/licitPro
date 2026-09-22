// app/api/participacoes/[id]/aprovacao/route.ts
// Ferramenta 9, Aprovação e Assinatura — Etapa 1, aprovação comercial.
// GET traz o resumo (Ferramenta 7/8/4/3/2) e o status atual; POST "Enviar
// para aprovação" cria/reabre o registro sobre a última versão da proposta;
// PATCH decide (aprovar/devolver/recusar).

import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { aprovacaoProposta, fichaRecurso, itemPrecoParticipacao, participacao, versaoProposta, viabilidadeParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

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

  const [aprovacao] = await db.select().from(aprovacaoProposta).where(eq(aprovacaoProposta.participacaoId, id)).limit(1)
  const [ultimaVersao] = await db
    .select()
    .from(versaoProposta)
    .where(eq(versaoProposta.participacaoId, id))
    .orderBy(desc(versaoProposta.versao))
    .limit(1)
  const [viabilidade] = await db.select().from(viabilidadeParticipacao).where(eq(viabilidadeParticipacao.participacaoId, id)).limit(1)
  const [ficha] = await db.select().from(fichaRecurso).where(eq(fichaRecurso.participacaoId, id)).limit(1)
  const itensPreco = await db.select().from(itemPrecoParticipacao).where(eq(itemPrecoParticipacao.participacaoId, id))

  const totalGeral = itensPreco.reduce((soma, item) => soma + (item.precoOfertado != null ? Number(item.precoOfertado) * Number(item.quantidade) : 0), 0)

  return NextResponse.json({
    aprovacao: aprovacao ?? null,
    ultimaVersaoProposta: ultimaVersao ?? null,
    resumo: {
      totalGeral,
      itensPreco: itensPreco.length,
      margemBasePercentual: viabilidade?.resultado?.base.avaliacaoPreco?.margemRealPercentual ?? null,
      retornoSobreInvestidoPercentual: viabilidade?.resultado?.base.retorno.retornoSobreInvestido ?? null,
      cicloDias: viabilidade?.resultado?.base.retorno.cicloDias ?? null,
      prazoEstimadoPagamentoEm: ficha?.prazoEstimadoPagamentoEm ?? null,
    },
  })
}

export async function POST(
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

  const [ultimaVersao] = await db
    .select()
    .from(versaoProposta)
    .where(eq(versaoProposta.participacaoId, id))
    .orderBy(desc(versaoProposta.versao))
    .limit(1)

  if (!ultimaVersao) {
    return NextResponse.json({ erro: 'Gere a proposta (Ferramenta 8) antes de enviar para aprovação.' }, { status: 400 })
  }

  const valores = {
    versaoPropostaId: ultimaVersao.id,
    status: 'aguardando' as const,
    observacao: null,
    motivoRecusa: null,
    decididoPorUserId: null,
    decididoEm: null,
    updatedAt: new Date(),
  }

  const [criada] = await db
    .insert(aprovacaoProposta)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: aprovacaoProposta.participacaoId, set: valores })
    .returning()

  await db.update(participacao).set({ estado: 'aguardando_aprovacao', updatedAt: new Date() }).where(eq(participacao.id, id))

  return NextResponse.json({ aprovacao: criada })
}

interface CorpoPatch {
  acao?: 'aprovar' | 'devolver' | 'recusar'
  observacao?: string
  motivoRecusa?: string
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
  if (!body?.acao || !['aprovar', 'devolver', 'recusar'].includes(body.acao)) {
    return NextResponse.json({ erro: 'Ação inválida. Use "aprovar", "devolver" ou "recusar".' }, { status: 400 })
  }

  const [aprovacaoAtual] = await db.select().from(aprovacaoProposta).where(eq(aprovacaoProposta.participacaoId, id)).limit(1)
  if (!aprovacaoAtual) {
    return NextResponse.json({ erro: 'Nenhuma aprovação em andamento — envie para aprovação primeiro.' }, { status: 400 })
  }

  if (body.acao === 'devolver' && !body.observacao?.trim()) {
    return NextResponse.json({ erro: 'Informe uma observação ao devolver.' }, { status: 400 })
  }
  if (body.acao === 'recusar' && !body.motivoRecusa?.trim()) {
    return NextResponse.json({ erro: 'Informe o motivo da recusa.' }, { status: 400 })
  }

  const statusPorAcao = { aprovar: 'aprovada', devolver: 'devolvida', recusar: 'recusada' } as const
  const estadoPorAcao = { aprovar: 'aguardando_assinatura', devolver: 'em_elaboracao', recusar: 'descartada' } as const

  const [atualizada] = await db
    .update(aprovacaoProposta)
    .set({
      status: statusPorAcao[body.acao],
      observacao: body.acao === 'devolver' ? body.observacao!.trim() : aprovacaoAtual.observacao,
      motivoRecusa: body.acao === 'recusar' ? body.motivoRecusa!.trim() : aprovacaoAtual.motivoRecusa,
      decididoPorUserId: session.user.id,
      decididoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aprovacaoProposta.participacaoId, id))
    .returning()

  // "Aprovar congela a versão" — a versão já não é alterada por design
  // (toda geração cria uma nova), aqui só marcamos qual é a aprovada.
  if (body.acao === 'aprovar') {
    await db.update(versaoProposta).set({ aprovada: false }).where(eq(versaoProposta.participacaoId, id))
    await db.update(versaoProposta).set({ aprovada: true }).where(eq(versaoProposta.id, aprovacaoAtual.versaoPropostaId))
  }

  await db.update(participacao).set({ estado: estadoPorAcao[body.acao], updatedAt: new Date() }).where(eq(participacao.id, id))

  if (body.acao === 'aprovar') {
    // Garante as linhas de assinatura para as peças atuais da montagem,
    // com a classificação padrão — o operador ajusta a partir daqui.
    const { garantirLinhasAssinatura } = await import('@/lib/assinaturas-server')
    await garantirLinhasAssinatura(id)
  }

  return NextResponse.json({ aprovacao: atualizada })
}
