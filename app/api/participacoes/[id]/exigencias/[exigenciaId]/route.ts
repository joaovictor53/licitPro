// app/api/participacoes/[id]/exigencias/[exigenciaId]/route.ts
// Conferência humana de um item da matriz de conformidade — a IA extrai a
// exigência, só o operador decide a situação (atende/não atende/parcial).

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { exigenciaEdital, participacao } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'
import { SITUACOES_EXIGENCIA, SituacaoExigencia } from '@/types/edital-tipos'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exigenciaId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, exigenciaId } = await params
  const body = await request.json().catch(() => null)
  const situacao = body?.situacao as SituacaoExigencia | undefined

  if (!situacao || !SITUACOES_EXIGENCIA.includes(situacao)) {
    return NextResponse.json({ erro: `Situação inválida. Use uma de: ${SITUACOES_EXIGENCIA.join(', ')}.` }, { status: 400 })
  }

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const [participacaoAtual] = await db
    .select({ id: participacao.id })
    .from(participacao)
    .where(and(eq(participacao.id, id), eq(participacao.empresaId, empresaAtual.id)))
    .limit(1)

  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [atualizado] = await db
    .update(exigenciaEdital)
    .set({
      situacao,
      conferidoPorUserId: session.user.id,
      conferidoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(exigenciaEdital.id, exigenciaId), eq(exigenciaEdital.participacaoId, id)))
    .returning()

  if (!atualizado) {
    return NextResponse.json({ erro: 'Exigência não encontrada.' }, { status: 404 })
  }

  return NextResponse.json(atualizado)
}
