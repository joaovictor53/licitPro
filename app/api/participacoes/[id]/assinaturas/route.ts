// app/api/participacoes/[id]/assinaturas/route.ts
// Ferramenta 9, Etapa 2 — lista de peças e o método/status de assinatura de
// cada uma. Garante as linhas (classificação padrão) antes de listar.

import { NextRequest, NextResponse } from 'next/server'
import { exigirUsuarioApi } from '@/lib/sessao'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { garantirLinhasAssinatura } from '@/lib/assinaturas-server'

export async function GET(
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

  const assinaturas = await garantirLinhasAssinatura(id)

  const pendenciasObrigatorias = assinaturas.filter((a) => a.metodoExigido !== 'nao_requer' && a.status !== 'assinado')

  return NextResponse.json({
    assinaturas,
    prontoParaEnvio: pendenciasObrigatorias.length === 0,
    pendencias: pendenciasObrigatorias.map((a) => a.peca),
  })
}
