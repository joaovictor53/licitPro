// app/api/participacoes/[id]/proposta/[versaoId]/arquivo/route.ts
// Ferramenta 8, Montagem da Proposta — download de uma versão gerada.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { versaoProposta } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versaoId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, versaoId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [versao] = await db
    .select()
    .from(versaoProposta)
    .where(and(eq(versaoProposta.id, versaoId), eq(versaoProposta.participacaoId, id)))
    .limit(1)

  if (!versao) {
    return NextResponse.json({ erro: 'Versão não encontrada.' }, { status: 404 })
  }

  const bytes = Buffer.from(versao.arquivoBase64, 'base64')
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${versao.arquivoNome}"`,
    },
  })
}
