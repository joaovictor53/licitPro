// app/api/empresa/documentos/[docId]/route.ts
// PATCH atualiza campos de um documento do dossiê (sem trocar de versão —
// isso é o botão "Renovar", em ./renovar/route.ts).

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { documentoEmpresa } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

interface CorpoPatch {
  nome?: string
  numero?: string | null
  validadeEm?: string | null
  evidencia?: string | null
  dadosBalanco?: {
    registroJuntaComercial: string | null
    dataRegistroEm: string | null
    exercicio: string | null
    certidaoAnexada: boolean
  } | null
}

const dataOuNula = (valor: string | null | undefined): Date | null => {
  if (!valor) return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

export async function PATCH(
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

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const [atualizado] = await db
    .update(documentoEmpresa)
    .set({
      ...(body.nome?.trim() ? { nome: body.nome.trim() } : {}),
      numero: body.numero?.trim() || null,
      validadeEm: dataOuNula(body.validadeEm),
      evidencia: body.evidencia?.trim() || null,
      dadosBalanco: body.dadosBalanco ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(documentoEmpresa.id, docId), eq(documentoEmpresa.empresaId, empresaAtual.id)))
    .returning()

  if (!atualizado) {
    return NextResponse.json({ erro: 'Documento não encontrado.' }, { status: 404 })
  }

  return NextResponse.json({ documento: atualizado })
}
