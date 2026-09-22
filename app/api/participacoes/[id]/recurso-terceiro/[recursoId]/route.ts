// app/api/participacoes/[id]/recurso-terceiro/[recursoId]/route.ts
// Ferramenta 14 — protocolar contrarrazões e registrar a decisão.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { recursoTerceiroParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { RESULTADOS_DECISAO_RECURSAL, ResultadoDecisaoRecursal } from '@/types/recurso-fase-tipos'

interface CorpoPatch {
  acao?: 'protocolar_contrarrazoes' | 'registrar_decisao'
  contrarrazoesProtocoloNumero?: string
  contrarrazoesArquivoNome?: string
  contrarrazoesArquivoBase64?: string
  decisaoResultado?: ResultadoDecisaoRecursal
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recursoId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, recursoId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [atual] = await db
    .select()
    .from(recursoTerceiroParticipacao)
    .where(and(eq(recursoTerceiroParticipacao.id, recursoId), eq(recursoTerceiroParticipacao.participacaoId, id)))
    .limit(1)
  if (!atual) {
    return NextResponse.json({ erro: 'Recurso não encontrado.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body?.acao) {
    return NextResponse.json({ erro: 'Informe a ação.' }, { status: 400 })
  }

  if (body.acao === 'protocolar_contrarrazoes') {
    if (!body.contrarrazoesProtocoloNumero?.trim()) {
      return NextResponse.json({ erro: 'Informe o número de protocolo.' }, { status: 400 })
    }
    const [atualizado] = await db
      .update(recursoTerceiroParticipacao)
      .set({
        contrarrazoesProtocoloNumero: body.contrarrazoesProtocoloNumero.trim(),
        contrarrazoesArquivoNome: body.contrarrazoesArquivoNome ?? null,
        contrarrazoesArquivoBase64: body.contrarrazoesArquivoBase64 ?? null,
        contrarrazoesProtocoladoEm: new Date(),
        estado: 'contrarrazoes_recebidas',
        updatedAt: new Date(),
      })
      .where(eq(recursoTerceiroParticipacao.id, recursoId))
      .returning()
    return NextResponse.json({ recurso: atualizado })
  }

  if (body.acao === 'registrar_decisao') {
    if (!body.decisaoResultado || !RESULTADOS_DECISAO_RECURSAL.includes(body.decisaoResultado)) {
      return NextResponse.json({ erro: 'Resultado da decisão inválido.' }, { status: 400 })
    }
    const estadoFinal = body.decisaoResultado === 'rejeitado' ? 'rejeitado' : body.decisaoResultado === 'acolhido' ? 'acolhido' : 'decisao_recebida'
    const [atualizado] = await db
      .update(recursoTerceiroParticipacao)
      .set({ decisaoResultado: body.decisaoResultado, decisaoEm: new Date(), estado: estadoFinal, updatedAt: new Date() })
      .where(eq(recursoTerceiroParticipacao.id, recursoId))
      .returning()
    return NextResponse.json({ recurso: atualizado })
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
}
