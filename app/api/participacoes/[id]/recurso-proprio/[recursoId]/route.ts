// app/api/participacoes/[id]/recurso-proprio/[recursoId]/route.ts
// Ferramenta 14 — três ações sequenciais sobre um evento recorrível próprio.
// "Acolhido em favor da empresa devolve a participação ao estado
// correspondente" fica para o operador decidir manualmente: qual estado é
// "o correspondente" depende do que a participação estava fazendo antes do
// evento, e isso varia caso a caso — não é seguro inferir automaticamente.

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { recursoProprioParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { adicionarDiasUteis } from '@/lib/dias-uteis'
import { RESULTADOS_DECISAO_RECURSAL, ResultadoDecisaoRecursal } from '@/types/recurso-fase-tipos'

interface CorpoPatch {
  acao?: 'registrar_intencao' | 'protocolar_razoes' | 'registrar_decisao'
  intencaoAlegacao?: string
  prazoRazoesDiasUteis?: number
  razoesProtocoloNumero?: string
  razoesArquivoNome?: string
  razoesArquivoBase64?: string
  decisaoResultado?: ResultadoDecisaoRecursal
  decisaoArquivoNome?: string
  decisaoArquivoBase64?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recursoId: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id, recursoId } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [atual] = await db
    .select()
    .from(recursoProprioParticipacao)
    .where(and(eq(recursoProprioParticipacao.id, recursoId), eq(recursoProprioParticipacao.participacaoId, id)))
    .limit(1)
  if (!atual) {
    return NextResponse.json({ erro: 'Recurso não encontrado.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body?.acao) {
    return NextResponse.json({ erro: 'Informe a ação.' }, { status: 400 })
  }

  if (body.acao === 'registrar_intencao') {
    const agora = new Date()
    const prazoRazoesEm = adicionarDiasUteis(agora, body.prazoRazoesDiasUteis ?? 3)
    const [atualizado] = await db
      .update(recursoProprioParticipacao)
      .set({
        intencaoRegistradaEm: agora,
        intencaoAlegacao: body.intencaoAlegacao?.trim() || null,
        prazoRazoesEm,
        estado: 'prazo_razoes_em_curso',
        updatedAt: new Date(),
      })
      .where(eq(recursoProprioParticipacao.id, recursoId))
      .returning()
    return NextResponse.json({ recurso: atualizado })
  }

  if (body.acao === 'protocolar_razoes') {
    if (!body.razoesProtocoloNumero?.trim()) {
      return NextResponse.json({ erro: 'Informe o número de protocolo.' }, { status: 400 })
    }
    const [atualizado] = await db
      .update(recursoProprioParticipacao)
      .set({
        razoesProtocoloNumero: body.razoesProtocoloNumero.trim(),
        razoesArquivoNome: body.razoesArquivoNome ?? null,
        razoesArquivoBase64: body.razoesArquivoBase64 ?? null,
        razoesProtocoladoEm: new Date(),
        estado: 'razoes_protocoladas',
        updatedAt: new Date(),
      })
      .where(eq(recursoProprioParticipacao.id, recursoId))
      .returning()
    return NextResponse.json({ recurso: atualizado })
  }

  if (body.acao === 'registrar_decisao') {
    if (!body.decisaoResultado || !RESULTADOS_DECISAO_RECURSAL.includes(body.decisaoResultado)) {
      return NextResponse.json({ erro: 'Resultado da decisão inválido.' }, { status: 400 })
    }
    const estadoFinal = body.decisaoResultado === 'rejeitado' ? 'rejeitado' : body.decisaoResultado === 'acolhido' ? 'acolhido' : 'decisao_recebida'
    const [atualizado] = await db
      .update(recursoProprioParticipacao)
      .set({
        decisaoResultado: body.decisaoResultado,
        decisaoEm: new Date(),
        decisaoArquivoNome: body.decisaoArquivoNome ?? null,
        decisaoArquivoBase64: body.decisaoArquivoBase64 ?? null,
        estado: estadoFinal,
        updatedAt: new Date(),
      })
      .where(eq(recursoProprioParticipacao.id, recursoId))
      .returning()
    return NextResponse.json({ recurso: atualizado })
  }

  return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
}
