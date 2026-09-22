// app/api/participacoes/[id]/decisao/route.ts
// Ferramenta 5, Decisão de Participar — GET monta o agregado (sem gravar
// nada); POST registra a decisão, congelando os números e os alertas do
// momento. Alerta ativo nunca bloqueia, só exige ciência explícita.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { decisaoParticipacao, participacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { montarAgregadoDecisao, sugerirDataRetomada } from '@/lib/agregado-decisao'
import { DECISOES_PARTICIPACAO, DecisaoParticipacaoTipo, MOTIVOS_NAO_PARTICIPAR, MotivoNaoParticipar } from '@/types/decisao-tipos'

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

  const agregado = await montarAgregadoDecisao(id)
  const [decisaoExistente] = await db.select().from(decisaoParticipacao).where(eq(decisaoParticipacao.participacaoId, id)).limit(1)

  const dataRetomadaSugerida = sugerirDataRetomada(participacaoAtual.dataSessaoEm ? new Date(participacaoAtual.dataSessaoEm) : null)

  return NextResponse.json({ agregado, decisao: decisaoExistente ?? null, dataRetomadaSugerida })
}

interface CorpoPost {
  decisao?: string
  motivoNaoParticipar?: string
  motivoOutro?: string | null
  dataRetomadaEm?: string
  cienciaAlerta?: boolean
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
  if (!body?.decisao || !DECISOES_PARTICIPACAO.includes(body.decisao as DecisaoParticipacaoTipo)) {
    return NextResponse.json({ erro: `Decisão inválida. Use uma de: ${DECISOES_PARTICIPACAO.join(', ')}.` }, { status: 400 })
  }
  const decisao = body.decisao as DecisaoParticipacaoTipo

  if (decisao === 'nao_participar' && !body.motivoNaoParticipar) {
    return NextResponse.json({ erro: 'Informe o motivo de não participar.' }, { status: 400 })
  }
  if (body.motivoNaoParticipar && !MOTIVOS_NAO_PARTICIPAR.includes(body.motivoNaoParticipar as MotivoNaoParticipar)) {
    return NextResponse.json({ erro: `Motivo inválido. Use um de: ${MOTIVOS_NAO_PARTICIPAR.join(', ')}.` }, { status: 400 })
  }
  if (decisao === 'adiar' && !body.dataRetomadaEm) {
    return NextResponse.json({ erro: 'Informe a data de retomada.' }, { status: 400 })
  }

  const agregado = await montarAgregadoDecisao(id)
  if (!agregado) {
    return NextResponse.json({ erro: 'Não foi possível montar os dados da decisão.' }, { status: 500 })
  }

  if (agregado.alertas.length > 0 && !body.cienciaAlerta) {
    return NextResponse.json(
      { erro: 'Há alertas ativos — confirme a ciência antes de registrar a decisão.', alertas: agregado.alertas },
      { status: 409 }
    )
  }

  const valores = {
    decisao,
    motivoNaoParticipar: decisao === 'nao_participar' ? (body.motivoNaoParticipar as MotivoNaoParticipar) : null,
    motivoOutro: body.motivoNaoParticipar === 'outro' ? body.motivoOutro?.trim() || null : null,
    dataRetomadaEm: decisao === 'adiar' && body.dataRetomadaEm ? new Date(body.dataRetomadaEm) : null,
    alertasAtivos: agregado.alertas,
    cienciaAlertaConfirmada: agregado.alertas.length > 0,
    numerosCongelados: agregado.numerosCongelados,
    decididoPorUserId: session.user.id,
    decididoEm: new Date(),
    updatedAt: new Date(),
  }

  const [registrada] = await db
    .insert(decisaoParticipacao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: decisaoParticipacao.participacaoId, set: valores })
    .returning()

  // "Participar muda o estado e libera as ferramentas seguintes" / "Não
  // participar" descarta — "Adiar" mantém o estado como está.
  if (decisao === 'participar') {
    await db.update(participacao).set({ estado: 'aguardando_documentos', updatedAt: new Date() }).where(eq(participacao.id, id))
  } else if (decisao === 'nao_participar') {
    await db.update(participacao).set({ estado: 'descartada', updatedAt: new Date() }).where(eq(participacao.id, id))
  }

  return NextResponse.json({ decisao: registrada })
}
