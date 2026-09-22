// app/api/participacoes/[id]/habilitacao/route.ts
// Ferramenta 13, Habilitação — liberada quando o estado for
// 'vencedora_provisoria'. GET revalida CADA documento contra HOJE (não a
// data da sessão), reaproveitando a mesma função pura da Ferramenta 6 com
// marco = hoje ("este é o momento em que se perde contrato já ganho").

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { checklistParticipacao, documentoEmpresa, exigenciaEdital, habilitacaoParticipacao, participacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularSituacaoChecklist } from '@/lib/checklist-documental'
import { RESULTADOS_HABILITACAO, ResultadoHabilitacao } from '@/types/habilitacao-tipos'
import { EstadoParticipacao } from '@/types/participacao-tipos'

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

  const itens = await db
    .select({
      exigenciaId: exigenciaEdital.id,
      titulo: exigenciaEdital.titulo,
      risco: exigenciaEdital.risco,
      situacaoNaSessao: checklistParticipacao.situacao,
      tipoDocumento: documentoEmpresa.tipo,
      validadeEm: documentoEmpresa.validadeEm,
      dadosBalanco: documentoEmpresa.dadosBalanco,
    })
    .from(checklistParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, checklistParticipacao.exigenciaEditalId))
    .leftJoin(documentoEmpresa, eq(documentoEmpresa.id, checklistParticipacao.documentoEmpresaId))
    .where(eq(checklistParticipacao.participacaoId, id))
    .orderBy(exigenciaEdital.ordem)

  const revalidacao = itens.map((item) => ({
    titulo: item.titulo,
    risco: item.risco,
    situacaoNaSessao: item.situacaoNaSessao,
    situacaoHoje: calcularSituacaoChecklist(
      item.tipoDocumento ? { tipo: item.tipoDocumento, validadeEm: item.validadeEm, dadosBalanco: item.dadosBalanco } : null,
      null
    ),
  }))

  const vencidosOuVencendo = revalidacao.filter((r) => r.situacaoHoje === 'vence_antes' || r.situacaoHoje === 'faltando' || r.situacaoHoje === 'nao_confere')

  const [habilitacao] = await db.select().from(habilitacaoParticipacao).where(eq(habilitacaoParticipacao.participacaoId, id)).limit(1)

  return NextResponse.json({ revalidacao, vencidosOuVencendoPrimeiro: [...vencidosOuVencendo, ...revalidacao.filter((r) => !vencidosOuVencendo.includes(r))], habilitacao: habilitacao ?? null })
}

const ESTADO_POR_RESULTADO: Record<ResultadoHabilitacao, EstadoParticipacao> = {
  habilitada: 'habilitada',
  inabilitada: 'inabilitada',
  em_diligencia: 'em_habilitacao',
}

interface CorpoPatch {
  resultado?: ResultadoHabilitacao
  motivoInabilitacao?: string
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
  if (!body?.resultado || !RESULTADOS_HABILITACAO.includes(body.resultado)) {
    return NextResponse.json({ erro: 'Resultado inválido.' }, { status: 400 })
  }
  if (body.resultado === 'inabilitada' && !body.motivoInabilitacao?.trim()) {
    return NextResponse.json({ erro: 'Motivo estruturado é obrigatório ao inabilitar.' }, { status: 400 })
  }

  const valores = {
    resultado: body.resultado,
    motivoInabilitacao: body.resultado === 'inabilitada' ? body.motivoInabilitacao!.trim() : null,
    registradoPorUserId: session.user.id,
    registradoEm: new Date(),
    updatedAt: new Date(),
  }

  const [salvo] = await db
    .insert(habilitacaoParticipacao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: habilitacaoParticipacao.participacaoId, set: valores })
    .returning()

  await db.update(participacao).set({ estado: ESTADO_POR_RESULTADO[body.resultado], updatedAt: new Date() }).where(eq(participacao.id, id))

  return NextResponse.json({ habilitacao: salvo })
}
