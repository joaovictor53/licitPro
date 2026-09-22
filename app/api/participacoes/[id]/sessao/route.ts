// app/api/participacoes/[id]/sessao/route.ts
// Ferramenta 12, Registro da Sessão — só registro pós-fato (o sistema nunca
// acessa o portal nem acompanha a sessão ao vivo). GET traz o registro atual
// mais o lembrete do piso de cada item (Ferramenta 4/7); PATCH salva.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { itemPrecoParticipacao, participacao, registroSessao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { SituacaoResultadoSessao, SITUACOES_RESULTADO_SESSAO } from '@/types/sessao-tipos'
import { EstadoParticipacao } from '@/types/participacao-tipos'

const ESTADO_POR_SITUACAO: Record<SituacaoResultadoSessao, EstadoParticipacao> = {
  vencedora_provisoria: 'vencedora_provisoria',
  classificada: 'encerrada',
  desclassificada: 'encerrada',
  inabilitada: 'inabilitada',
}

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

  const [registro] = await db.select().from(registroSessao).where(eq(registroSessao.participacaoId, id)).limit(1)
  const itensPreco = await db
    .select({ descricao: itemPrecoParticipacao.descricao, pisoUnitario: itemPrecoParticipacao.pisoUnitario })
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))

  return NextResponse.json({
    registro: registro ?? null,
    dataSessaoEm: participacaoAtual.dataSessaoEm,
    fusoEdital: participacaoAtual.fusoEdital,
    linkPortalOrigem: participacaoAtual.linkPortalOrigem,
    lembretePisos: itensPreco.map((i) => ({ descricao: i.descricao, piso: i.pisoUnitario })),
  })
}

interface CorpoPatch {
  horarioAberturaEm?: string
  horarioEncerramentoEm?: string
  quantidadeParticipantes?: number
  lanceFinalEmpresa?: string
  menorLanceDisputa?: string
  classificacaoObtida?: string
  houveNegociacao?: boolean
  valorNegociado?: string
  valorVencedor?: string
  ocorrencias?: string
  anotacaoLivre?: string
  resultadoSituacao?: SituacaoResultadoSessao
  resultadoMotivo?: string
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

  if (body.resultadoSituacao != null && !SITUACOES_RESULTADO_SESSAO.includes(body.resultadoSituacao)) {
    return NextResponse.json({ erro: 'Situação de resultado inválida.' }, { status: 400 })
  }

  const valores = {
    horarioAberturaEm: body.horarioAberturaEm ? new Date(body.horarioAberturaEm) : null,
    horarioEncerramentoEm: body.horarioEncerramentoEm ? new Date(body.horarioEncerramentoEm) : null,
    quantidadeParticipantes: body.quantidadeParticipantes ?? null,
    lanceFinalEmpresa: body.lanceFinalEmpresa ?? null,
    menorLanceDisputa: body.menorLanceDisputa ?? null,
    classificacaoObtida: body.classificacaoObtida?.trim() || null,
    houveNegociacao: body.houveNegociacao ?? false,
    valorNegociado: body.valorNegociado ?? null,
    valorVencedor: body.valorVencedor ?? null,
    ocorrencias: body.ocorrencias?.trim() || null,
    anotacaoLivre: body.anotacaoLivre?.trim() || null,
    resultadoSituacao: body.resultadoSituacao ?? null,
    resultadoMotivo: body.resultadoMotivo?.trim() || null,
    registradoPorUserId: session.user.id,
    registradoEm: new Date(),
    updatedAt: new Date(),
  }

  const [salvo] = await db
    .insert(registroSessao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: registroSessao.participacaoId, set: valores })
    .returning()

  if (body.resultadoSituacao) {
    await db
      .update(participacao)
      .set({ estado: ESTADO_POR_SITUACAO[body.resultadoSituacao], updatedAt: new Date() })
      .where(eq(participacao.id, id))
  }

  return NextResponse.json({ registro: salvo })
}
