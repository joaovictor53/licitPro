// app/api/participacoes/[id]/checklist/[itemId]/route.ts
// Vincula (ou troca) o documento do dossiê associado a um item do checklist,
// ou confirma um vínculo que o sistema já havia sugerido. Em qualquer caso, a
// situação é recalculada por data/regras — nunca por conclusão da IA.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { checklistParticipacao, documentoEmpresa } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularSituacaoChecklist } from '@/lib/checklist-documental'

interface CorpoPatch {
  documentoEmpresaId?: string | null
  confirmar?: boolean
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, itemId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [item] = await db
    .select()
    .from(checklistParticipacao)
    .where(and(eq(checklistParticipacao.id, itemId), eq(checklistParticipacao.participacaoId, id)))
    .limit(1)

  if (!item) {
    return NextResponse.json({ erro: 'Item do checklist não encontrado.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  // Trocar de documento é sempre ação humana (não é "confirmação" de nada
  // sugerido) — se veio documentoEmpresaId, usa ele; senão mantém o vínculo
  // atual (caso seja só uma confirmação do que o sistema já havia sugerido).
  const documentoEmpresaId = body.documentoEmpresaId !== undefined ? body.documentoEmpresaId : item.documentoEmpresaId

  let documento = null
  if (documentoEmpresaId) {
    const [encontrado] = await db.select().from(documentoEmpresa).where(eq(documentoEmpresa.id, documentoEmpresaId)).limit(1)
    documento = encontrado ?? null
  }

  const situacao = calcularSituacaoChecklist(documento, item.marcoDataEm)

  const [atualizado] = await db
    .update(checklistParticipacao)
    .set({
      documentoEmpresaId: documento?.id ?? null,
      situacao,
      vinculadoAutomaticamente: false,
      vinculadoPorUserId: session.user.id,
      vinculadoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(checklistParticipacao.id, itemId))
    .returning()

  return NextResponse.json({ item: atualizado })
}
