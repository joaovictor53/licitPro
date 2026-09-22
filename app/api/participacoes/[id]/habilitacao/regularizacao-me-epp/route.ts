// app/api/participacoes/[id]/habilitacao/regularizacao-me-epp/route.ts
// Ferramenta 13 — regra padrão 5 dias úteis, prorrogáveis por igual período
// a critério da Administração; o edital sempre prevalece (por isso
// prazoDiasUteis é editável). Perder este prazo faz a empresa perder um
// contrato já ganho.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { regularizacaoMeEpp } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { adicionarDiasUteis } from '@/lib/dias-uteis'

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

  const [regularizacao] = await db.select().from(regularizacaoMeEpp).where(eq(regularizacaoMeEpp.participacaoId, id)).limit(1)

  let prazoFinalCalculado: Date | null = null
  if (regularizacao) {
    const diasTotais = regularizacao.prazoDiasUteis + (regularizacao.prorrogacaoDias ?? 0)
    prazoFinalCalculado = adicionarDiasUteis(new Date(regularizacao.dataDeclaracaoVencedoraEm), diasTotais)
  }

  return NextResponse.json({ regularizacao: regularizacao ?? null, prazoFinalCalculado })
}

interface CorpoPatch {
  dataDeclaracaoVencedoraEm?: string
  prazoDiasUteis?: number
  prorrogacaoDias?: number | null
  documentoPendente?: string
  protocoloEvidencia?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body?.dataDeclaracaoVencedoraEm) {
    return NextResponse.json({ erro: 'Informe a data da declaração de vencedora.' }, { status: 400 })
  }

  const valores = {
    dataDeclaracaoVencedoraEm: new Date(body.dataDeclaracaoVencedoraEm),
    prazoDiasUteis: body.prazoDiasUteis ?? 5,
    prorrogacaoDias: body.prorrogacaoDias ?? null,
    documentoPendente: body.documentoPendente?.trim() || null,
    protocoloEvidencia: body.protocoloEvidencia?.trim() || null,
    updatedAt: new Date(),
  }

  const [salva] = await db
    .insert(regularizacaoMeEpp)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: regularizacaoMeEpp.participacaoId, set: valores })
    .returning()

  return NextResponse.json({ regularizacao: salva })
}
