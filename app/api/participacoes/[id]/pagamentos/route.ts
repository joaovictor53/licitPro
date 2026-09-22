// app/api/participacoes/[id]/pagamentos/route.ts
// Ferramenta 15 — "este é o dado que faz o semáforo da Ferramenta 2
// funcionar de verdade. Sem ele, o indicador do órgão fica vazio para
// sempre." Dias de atraso são calculados, nunca digitados.

import { NextRequest, NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { pagamentoContrato } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

const comDiasAtraso = <T extends { dataPrevistaPagamentoEm: Date | null; dataEfetivaPagamentoEm: Date | null }>(pagamento: T) => {
  const diasAtraso =
    pagamento.dataPrevistaPagamentoEm && pagamento.dataEfetivaPagamentoEm
      ? Math.max(0, Math.round((new Date(pagamento.dataEfetivaPagamentoEm).getTime() - new Date(pagamento.dataPrevistaPagamentoEm).getTime()) / 86_400_000))
      : null
  return { ...pagamento, diasAtraso }
}

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

  const pagamentos = await db.select().from(pagamentoContrato).where(eq(pagamentoContrato.participacaoId, id)).orderBy(asc(pagamentoContrato.dataNotaFiscalEm))
  return NextResponse.json({ pagamentos: pagamentos.map(comDiasAtraso) })
}

interface CorpoPost {
  dataNotaFiscalEm?: string
  valor?: string
  dataPrevistaPagamentoEm?: string
  dataEfetivaPagamentoEm?: string
}

export async function POST(
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

  const body = (await request.json().catch(() => null)) as CorpoPost | null
  if (!body?.dataNotaFiscalEm || !body.valor) {
    return NextResponse.json({ erro: 'Informe a data da nota fiscal e o valor.' }, { status: 400 })
  }

  const [criado] = await db
    .insert(pagamentoContrato)
    .values({
      participacaoId: id,
      dataNotaFiscalEm: new Date(body.dataNotaFiscalEm),
      valor: body.valor,
      dataPrevistaPagamentoEm: body.dataPrevistaPagamentoEm ? new Date(body.dataPrevistaPagamentoEm) : null,
      dataEfetivaPagamentoEm: body.dataEfetivaPagamentoEm ? new Date(body.dataEfetivaPagamentoEm) : null,
    })
    .returning()

  return NextResponse.json({ pagamento: comDiasAtraso(criado) })
}
