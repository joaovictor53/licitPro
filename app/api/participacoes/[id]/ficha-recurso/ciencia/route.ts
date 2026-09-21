// app/api/participacoes/[id]/ficha-recurso/ciencia/route.ts
// "Estou ciente e quero seguir" — registra quem confirmou, quando, com qual
// semáforo e quais fatores estavam ativos no momento. Não bloqueia nada: só
// garante que o operador viu (Ferramenta 2, "Tela de ciência").

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { fichaRecurso } from '@/app/src/db/schema'
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

  const [ficha] = await db.select().from(fichaRecurso).where(eq(fichaRecurso.participacaoId, id)).limit(1)
  if (!ficha) {
    return NextResponse.json({ erro: 'Preencha a ficha do recurso antes de confirmar ciência.' }, { status: 409 })
  }

  const [atualizada] = await db
    .update(fichaRecurso)
    .set({
      cienciaConfirmada: true,
      cienciaConfirmadaPorUserId: session.user.id,
      cienciaConfirmadaEm: new Date(),
      cienciaSemaforo: ficha.semaforo,
      cienciaFatores: ficha.semaforoFatores,
      updatedAt: new Date(),
    })
    .where(eq(fichaRecurso.participacaoId, id))
    .returning()

  return NextResponse.json({ ficha: atualizada })
}
