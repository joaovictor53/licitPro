// app/api/participacoes/[id]/contrato/encerrar/route.ts
// Ferramenta 15 — "vigência acabada e obrigações cumpridas, a participação
// vai para ENCERRADA." Confirmação explícita do operador, não automática.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { participacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

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

  const [atualizada] = await db
    .update(participacao)
    .set({ estado: 'encerrada', updatedAt: new Date() })
    .where(eq(participacao.id, id))
    .returning()

  return NextResponse.json({ participacao: atualizada })
}
