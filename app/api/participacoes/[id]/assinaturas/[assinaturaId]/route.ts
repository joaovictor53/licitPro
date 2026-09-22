// app/api/participacoes/[id]/assinaturas/[assinaturaId]/route.ts
// Ferramenta 9, Etapa 2 — sobrescrever o método exigido de uma peça e/ou
// registrar a assinatura feita fora do sistema.
//
// Regra que bloqueia de verdade (não avisa): peça que exige ICP-Brasil não
// é liberada com aceite gov.br. Assinatura escaneada (upload de imagem) não
// é aceita — só aceitamos o arquivo já assinado como PDF.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { assinaturaPeca } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { METODOS_ASSINATURA_USADOS, METODOS_EXIGENCIA_ASSINATURA, MetodoAssinaturaUsado, MetodoExigenciaAssinatura } from '@/types/assinatura-tipos'

interface CorpoPatch {
  metodoExigido?: MetodoExigenciaAssinatura
  assinadoPorNome?: string
  metodoUsado?: MetodoAssinaturaUsado
  linkValidacao?: string | null
  arquivoAssinadoNome?: string
  arquivoAssinadoBase64?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assinaturaId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, assinaturaId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [assinaturaAtual] = await db
    .select()
    .from(assinaturaPeca)
    .where(and(eq(assinaturaPeca.id, assinaturaId), eq(assinaturaPeca.participacaoId, id)))
    .limit(1)

  if (!assinaturaAtual) {
    return NextResponse.json({ erro: 'Peça não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const valores: Record<string, unknown> = { updatedAt: new Date() }

  if (body.metodoExigido !== undefined) {
    if (!METODOS_EXIGENCIA_ASSINATURA.includes(body.metodoExigido)) {
      return NextResponse.json({ erro: 'Método exigido inválido.' }, { status: 400 })
    }
    valores.metodoExigido = body.metodoExigido
    valores.metodoExigidoSobrescritoPorUserId = session.user.id
  }

  const registrandoAssinatura = body.assinadoPorNome !== undefined || body.metodoUsado !== undefined || body.arquivoAssinadoBase64 !== undefined

  if (registrandoAssinatura) {
    const metodoExigido = (body.metodoExigido ?? assinaturaAtual.metodoExigido) as MetodoExigenciaAssinatura
    if (!body.assinadoPorNome?.trim() || !body.metodoUsado || !body.arquivoAssinadoBase64 || !body.arquivoAssinadoNome) {
      return NextResponse.json({ erro: 'Informe quem assinou, o método usado e o arquivo já assinado.' }, { status: 400 })
    }
    if (!METODOS_ASSINATURA_USADOS.includes(body.metodoUsado)) {
      return NextResponse.json({ erro: 'Método usado inválido.' }, { status: 400 })
    }
    if (metodoExigido === 'icp_brasil_exigida' && body.metodoUsado !== 'icp_brasil') {
      return NextResponse.json({ erro: 'Esta peça exige ICP-Brasil — não é liberada com gov.br ou aceite interno.' }, { status: 409 })
    }

    valores.status = 'assinado'
    valores.assinadoPorNome = body.assinadoPorNome.trim()
    valores.assinadoEm = new Date()
    valores.metodoUsado = body.metodoUsado
    valores.linkValidacao = body.linkValidacao?.trim() || null
    valores.arquivoAssinadoNome = body.arquivoAssinadoNome
    valores.arquivoAssinadoBase64 = body.arquivoAssinadoBase64
  }

  const [atualizada] = await db
    .update(assinaturaPeca)
    .set(valores)
    .where(and(eq(assinaturaPeca.id, assinaturaId), eq(assinaturaPeca.participacaoId, id)))
    .returning()

  return NextResponse.json({ assinatura: atualizada })
}
