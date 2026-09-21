// app/api/participacoes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { edital, exigenciaEdital, participacao } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const [participacaoAtual] = await db
    .select()
    .from(participacao)
    .where(and(eq(participacao.id, id), eq(participacao.empresaId, empresaAtual.id)))
    .limit(1)

  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [editalAtual] = await db
    .select({
      id: edital.id,
      nomeArquivo: edital.nomeArquivo,
      numPaginas: edital.numPaginas,
      createdAt: edital.createdAt,
    })
    .from(edital)
    .where(eq(edital.participacaoId, id))
    .limit(1)

  const exigencias = await db
    .select()
    .from(exigenciaEdital)
    .where(eq(exigenciaEdital.participacaoId, id))
    .orderBy(asc(exigenciaEdital.ordem))

  return NextResponse.json({ participacao: participacaoAtual, edital: editalAtual ?? null, exigencias })
}
