// app/api/empresa/documentos/[docId]/renovar/route.ts
// "Documento renovado durante a participação": o sistema não troca sozinho.
// Cria uma linha nova (substituiDocumentoId aponta pra anterior) e desativa
// a antiga — quem já vinculou a versão antiga a um checklist continua vendo
// aquela versão até revincular manualmente (Ferramenta 6, Regras).

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { documentoEmpresa } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

interface CorpoRenovar {
  numero?: string | null
  validadeEm?: string | null
  evidencia?: string | null
}

const dataOuNula = (valor: string | null | undefined): Date | null => {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { docId } = await params
  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const [anterior] = await db
    .select()
    .from(documentoEmpresa)
    .where(and(eq(documentoEmpresa.id, docId), eq(documentoEmpresa.empresaId, empresaAtual.id)))
    .limit(1)

  if (!anterior) {
    return NextResponse.json({ erro: 'Documento não encontrado.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoRenovar | null

  const [novo] = await db
    .insert(documentoEmpresa)
    .values({
      empresaId: empresaAtual.id,
      tipo: anterior.tipo,
      nome: anterior.nome,
      numero: body?.numero?.trim() || anterior.numero,
      validadeEm: dataOuNula(body?.validadeEm) ?? anterior.validadeEm,
      evidencia: body?.evidencia?.trim() || anterior.evidencia,
      dadosBalanco: anterior.dadosBalanco,
      substituiDocumentoId: anterior.id,
      criadoPorUserId: session.user.id,
    })
    .returning()

  await db.update(documentoEmpresa).set({ ativo: false, updatedAt: new Date() }).where(eq(documentoEmpresa.id, docId))

  return NextResponse.json({ documento: novo })
}
