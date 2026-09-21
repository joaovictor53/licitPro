// app/api/empresa/documentos/route.ts
// Dossiê documental da empresa (Ferramenta 6) — GET lista, POST cadastra um
// novo documento. Reaproveitado em todas as participações.

import { NextRequest, NextResponse } from 'next/server'
import { and, desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { documentoEmpresa } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'
import { TIPOS_DOCUMENTO_DOSSIE } from '@/types/documento-tipos'

export async function GET() {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const documentos = await db
    .select()
    .from(documentoEmpresa)
    .where(and(eq(documentoEmpresa.empresaId, empresaAtual.id), eq(documentoEmpresa.ativo, true)))
    .orderBy(desc(documentoEmpresa.createdAt))

  return NextResponse.json({ documentos })
}

interface CorpoPost {
  tipo?: string
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

export async function POST(request: NextRequest) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPost | null
  if (!body || !body.tipo || !body.nome?.trim()) {
    return NextResponse.json({ erro: 'Informe ao menos o tipo e o nome do documento.' }, { status: 400 })
  }
  if (!TIPOS_DOCUMENTO_DOSSIE.includes(body.tipo as (typeof TIPOS_DOCUMENTO_DOSSIE)[number])) {
    return NextResponse.json({ erro: `Tipo inválido. Use um de: ${TIPOS_DOCUMENTO_DOSSIE.join(', ')}.` }, { status: 400 })
  }

  const [criado] = await db
    .insert(documentoEmpresa)
    .values({
      empresaId: empresaAtual.id,
      tipo: body.tipo as (typeof TIPOS_DOCUMENTO_DOSSIE)[number],
      nome: body.nome.trim(),
      numero: body.numero?.trim() || null,
      validadeEm: dataOuNula(body.validadeEm),
      evidencia: body.evidencia?.trim() || null,
      dadosBalanco: body.dadosBalanco ?? null,
      criadoPorUserId: session.user.id,
    })
    .returning()

  return NextResponse.json({ documento: criado })
}
