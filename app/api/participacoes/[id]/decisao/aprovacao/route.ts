// app/api/participacoes/[id]/decisao/aprovacao/route.ts
// "Aprovação do cliente" — sem portal do cliente no sistema, o operador
// registra manualmente o que a empresa respondeu por fora (a mesma
// limitação já documentada na Preparação Documental). O envio automático
// pelo portal, com os relatórios anexados, fica para quando esse portal existir.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { decisaoParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { STATUS_APROVACAO_EMPRESA, StatusAprovacaoEmpresa } from '@/types/decisao-tipos'

interface CorpoPatch {
  status?: string
  observacao?: string | null
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
  if (!body?.status || !STATUS_APROVACAO_EMPRESA.includes(body.status as StatusAprovacaoEmpresa)) {
    return NextResponse.json({ erro: `Status inválido. Use um de: ${STATUS_APROVACAO_EMPRESA.join(', ')}.` }, { status: 400 })
  }

  const [atualizada] = await db
    .update(decisaoParticipacao)
    .set({
      aprovacaoStatus: body.status as StatusAprovacaoEmpresa,
      aprovacaoObservacao: body.observacao?.trim() || null,
      aprovacaoRegistradaPorUserId: session.user.id,
      aprovacaoRegistradaEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(decisaoParticipacao.participacaoId, id))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Registre a decisão antes de registrar a aprovação.' }, { status: 409 })
  }

  return NextResponse.json({ decisao: atualizada })
}
