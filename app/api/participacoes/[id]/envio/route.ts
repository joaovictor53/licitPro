// app/api/participacoes/[id]/envio/route.ts
// Ferramenta 10, Envio — GET traz a conferência final e o registro atual;
// PATCH salva prazo/plataforma e registra o envio feito manualmente no
// portal (nunca o sistema quem envia).

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { envioParticipacao, participacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { conferirEnvio } from '@/lib/conferencia-envio'
import { calcularNivelAlertaPrazoEnvio } from '@/lib/alerta-prazo-envio'

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

  const [envio] = await db.select().from(envioParticipacao).where(eq(envioParticipacao.participacaoId, id)).limit(1)
  const conferenciaFinal = await conferirEnvio(id)
  const nivelAlerta = calcularNivelAlertaPrazoEnvio(envio?.prazoFinalEnvioEm ? new Date(envio.prazoFinalEnvioEm) : null)

  return NextResponse.json({
    envio: envio ?? null,
    conferenciaFinal,
    nivelAlerta,
    plataforma: participacaoAtual.plataforma,
    linkPortalOrigem: participacaoAtual.linkPortalOrigem,
    fusoEdital: participacaoAtual.fusoEdital,
  })
}

interface CorpoPatch {
  acao?: 'definir_prazo' | 'registrar_envio' | 'registrar_nao_enviada'
  prazoFinalEnvioEm?: string
  dataHoraEnvioEm?: string
  numeroProtocolo?: string
  comprovanteTexto?: string
  observacao?: string
  naoEnviadaMotivo?: string
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
  if (!body?.acao) {
    return NextResponse.json({ erro: 'Informe a ação.' }, { status: 400 })
  }

  if (body.acao === 'definir_prazo') {
    const [salvo] = await db
      .insert(envioParticipacao)
      .values({ participacaoId: id, prazoFinalEnvioEm: body.prazoFinalEnvioEm ? new Date(body.prazoFinalEnvioEm) : null })
      .onConflictDoUpdate({
        target: envioParticipacao.participacaoId,
        set: { prazoFinalEnvioEm: body.prazoFinalEnvioEm ? new Date(body.prazoFinalEnvioEm) : null, updatedAt: new Date() },
      })
      .returning()
    return NextResponse.json({ envio: salvo })
  }

  if (body.acao === 'registrar_envio') {
    const conferenciaFinal = await conferirEnvio(id)
    if (!conferenciaFinal.ok) {
      return NextResponse.json({ erro: 'A conferência final não passou — corrija as pendências antes de registrar o envio.', pendencias: conferenciaFinal.pendencias }, { status: 409 })
    }
    if (!body.numeroProtocolo?.trim()) {
      return NextResponse.json({ erro: 'Informe o número de protocolo do envio.' }, { status: 400 })
    }

    const valores = {
      dataHoraEnvioEm: body.dataHoraEnvioEm ? new Date(body.dataHoraEnvioEm) : new Date(),
      numeroProtocolo: body.numeroProtocolo.trim(),
      comprovanteTexto: body.comprovanteTexto?.trim() || null,
      enviadoPorUserId: session.user.id,
      observacao: body.observacao?.trim() || null,
      naoEnviadaMotivo: null,
      updatedAt: new Date(),
    }

    const [salvo] = await db
      .insert(envioParticipacao)
      .values({ participacaoId: id, ...valores })
      .onConflictDoUpdate({ target: envioParticipacao.participacaoId, set: valores })
      .returning()

    await db.update(participacao).set({ estado: 'enviada', updatedAt: new Date() }).where(eq(participacao.id, id))

    return NextResponse.json({ envio: salvo })
  }

  if (body.acao === 'registrar_nao_enviada') {
    if (!body.naoEnviadaMotivo?.trim()) {
      return NextResponse.json({ erro: 'Informe o motivo.' }, { status: 400 })
    }
    const valores = { naoEnviadaMotivo: body.naoEnviadaMotivo.trim(), updatedAt: new Date() }
    const [salvo] = await db
      .insert(envioParticipacao)
      .values({ participacaoId: id, ...valores })
      .onConflictDoUpdate({ target: envioParticipacao.participacaoId, set: valores })
      .returning()
    await db.update(participacao).set({ estado: 'encerrada', updatedAt: new Date() }).where(eq(participacao.id, id))
    return NextResponse.json({ envio: salvo })
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
}
