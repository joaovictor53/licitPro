// app/api/radar/participacoes/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { participacao } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

// "Analisar a fundo" (que baixa o edital e segue para a Ferramenta 3) e
// "Descartar" — por ora só a transição de estado. O download do edital e a
// leitura entram na Fase 2 (Leitura do Edital).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const body = await request.json().catch(() => null)
  const acao = body?.acao

  if (acao !== 'analisar' && acao !== 'descartar') {
    return NextResponse.json({ erro: 'Ação inválida. Use "analisar" ou "descartar".' }, { status: 400 })
  }

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const [existente] = await db
    .select()
    .from(participacao)
    .where(and(eq(participacao.id, id), eq(participacao.empresaId, empresaAtual.id)))
    .limit(1)

  if (!existente) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  if (existente.estado !== 'identificada' && existente.estado !== 'em_triagem') {
    return NextResponse.json({ erro: 'Esta participação já saiu da triagem do radar.' }, { status: 409 })
  }

  const [atualizado] = await db
    .update(participacao)
    .set(
      acao === 'analisar'
        ? {
            estado: 'em_analise_profunda',
            analisadoPorUserId: session.user.id,
            analisadoEm: new Date(),
            updatedAt: new Date(),
          }
        : { estado: 'descartada', updatedAt: new Date() }
    )
    .where(eq(participacao.id, id))
    .returning()

  return NextResponse.json(atualizado)
}
