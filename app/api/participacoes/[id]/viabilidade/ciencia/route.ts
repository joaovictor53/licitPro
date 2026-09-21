// app/api/participacoes/[id]/viabilidade/ciencia/route.ts
// "Estou ciente e quero seguir" para estouro de caixa/capacidade — não
// bloqueia, só registra quem viu, quando (Ferramenta 4, "Exposição de caixa").

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { viabilidadeParticipacao } from '@/app/src/db/schema'
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
    .update(viabilidadeParticipacao)
    .set({ cienciaEstouroConfirmada: true, cienciaEstouroPorUserId: session.user.id, cienciaEstouroEm: new Date(), updatedAt: new Date() })
    .where(eq(viabilidadeParticipacao.participacaoId, id))
    .returning()

  if (!atualizada) {
    return NextResponse.json({ erro: 'Calcule a viabilidade antes de confirmar ciência.' }, { status: 409 })
  }

  return NextResponse.json({ viabilidade: atualizada })
}
