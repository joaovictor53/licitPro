// app/api/participacoes/[id]/assinaturas/[assinaturaId]/arquivo/route.ts
// Ferramenta 9 — download do arquivo assinado registrado para uma peça.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { assinaturaPeca } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assinaturaId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, assinaturaId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [assinatura] = await db
    .select()
    .from(assinaturaPeca)
    .where(and(eq(assinaturaPeca.id, assinaturaId), eq(assinaturaPeca.participacaoId, id)))
    .limit(1)

  if (!assinatura?.arquivoAssinadoBase64) {
    return NextResponse.json({ erro: 'Nenhum arquivo assinado registrado para esta peça.' }, { status: 404 })
  }

  const bytes = Buffer.from(assinatura.arquivoAssinadoBase64, 'base64')
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${assinatura.arquivoAssinadoNome ?? 'assinado.pdf'}"`,
    },
  })
}
