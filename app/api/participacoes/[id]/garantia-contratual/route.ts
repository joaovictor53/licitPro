// app/api/participacoes/[id]/garantia-contratual/route.ts
// Ferramenta 15 — não apresentar a garantia no prazo pode gerar sanção e
// perda do contrato; o prazo de apresentação tem alerta próprio.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { garantiaContratual } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularNivelAlertaPrazoEnvio } from '@/lib/alerta-prazo-envio'
import { FORMAS_GARANTIA, FormaGarantia } from '@/types/viabilidade-tipos'

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

  const [garantia] = await db.select().from(garantiaContratual).where(eq(garantiaContratual.participacaoId, id)).limit(1)
  const nivelAlerta = calcularNivelAlertaPrazoEnvio(garantia?.prazoApresentacaoEm ? new Date(garantia.prazoApresentacaoEm) : null)

  return NextResponse.json({ garantia: garantia ?? null, nivelAlerta })
}

interface CorpoPatch {
  formaEscolhida?: FormaGarantia
  valor?: string
  prazoApresentacaoEm?: string
  vigenciaInicioEm?: string
  vigenciaFimEm?: string
  comprovanteTexto?: string
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
  if (body?.formaEscolhida && !FORMAS_GARANTIA.includes(body.formaEscolhida)) {
    return NextResponse.json({ erro: 'Forma de garantia inválida.' }, { status: 400 })
  }

  const valores = {
    formaEscolhida: body?.formaEscolhida ?? 'nenhuma',
    valor: body?.valor ?? null,
    prazoApresentacaoEm: body?.prazoApresentacaoEm ? new Date(body.prazoApresentacaoEm) : null,
    vigenciaInicioEm: body?.vigenciaInicioEm ? new Date(body.vigenciaInicioEm) : null,
    vigenciaFimEm: body?.vigenciaFimEm ? new Date(body.vigenciaFimEm) : null,
    comprovanteTexto: body?.comprovanteTexto?.trim() || null,
    updatedAt: new Date(),
  }

  const [salva] = await db
    .insert(garantiaContratual)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: garantiaContratual.participacaoId, set: valores })
    .returning()

  return NextResponse.json({ garantia: salva })
}
