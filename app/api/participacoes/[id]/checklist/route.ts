// app/api/participacoes/[id]/checklist/route.ts
// Ferramenta 6, Preparação Documental — checklist da participação (uma linha
// por exigência de habilitação da matriz) e o bloco de exigências acessórias,
// com os contadores da faixa do topo.

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { acessoriaParticipacao, checklistParticipacao, documentoEmpresa, exigenciaEdital } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'

export async function GET(
  _request: Request,
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
      id: checklistParticipacao.id,
      situacao: checklistParticipacao.situacao,
      marcoValidadoContra: checklistParticipacao.marcoValidadoContra,
      marcoDataEm: checklistParticipacao.marcoDataEm,
      vinculadoAutomaticamente: checklistParticipacao.vinculadoAutomaticamente,
      documentoEmpresaId: checklistParticipacao.documentoEmpresaId,
      documentoNome: documentoEmpresa.nome,
      documentoValidadeEm: documentoEmpresa.validadeEm,
      exigenciaId: exigenciaEdital.id,
      titulo: exigenciaEdital.titulo,
      oQueExige: exigenciaEdital.oQueExige,
      criterioAceitacao: exigenciaEdital.criterioAceitacao,
      trecho: exigenciaEdital.trecho,
      pagina: exigenciaEdital.pagina,
      clausula: exigenciaEdital.clausula,
      risco: exigenciaEdital.risco,
    })
    .from(checklistParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, checklistParticipacao.exigenciaEditalId))
    .leftJoin(documentoEmpresa, eq(documentoEmpresa.id, checklistParticipacao.documentoEmpresaId))
    .where(eq(checklistParticipacao.participacaoId, id))
    .orderBy(exigenciaEdital.ordem)

  const acessorias = await db
    .select({
      id: acessoriaParticipacao.id,
      status: acessoriaParticipacao.status,
      prazoLimiteEm: acessoriaParticipacao.prazoLimiteEm,
      custoEstimado: acessoriaParticipacao.custoEstimado,
      responsavel: acessoriaParticipacao.responsavel,
      comprovante: acessoriaParticipacao.comprovante,
      justificativa: acessoriaParticipacao.justificativa,
      titulo: exigenciaEdital.titulo,
      oQueExige: exigenciaEdital.oQueExige,
      trecho: exigenciaEdital.trecho,
      pagina: exigenciaEdital.pagina,
    })
    .from(acessoriaParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, acessoriaParticipacao.exigenciaEditalId))
    .where(eq(acessoriaParticipacao.participacaoId, id))
    .orderBy(exigenciaEdital.ordem)

  const documentosDisponiveis = await db
    .select({ id: documentoEmpresa.id, tipo: documentoEmpresa.tipo, nome: documentoEmpresa.nome, validadeEm: documentoEmpresa.validadeEm })
    .from(documentoEmpresa)
    .where(eq(documentoEmpresa.empresaId, participacaoAtual.empresaId))

  const contadores = {
    documentosPendentes: itens.filter((i) => i.situacao === 'faltando').length,
    vencendoAntesSessao: itens.filter((i) => i.situacao === 'vence_antes').length,
    exigenciasAcessoriasPendentes: acessorias.filter((a) => a.status === 'pendente').length,
    itensCriticosNaoConferidos: itens.filter((i) => i.situacao === 'a_verificar' && i.risco !== 'sanavel').length,
  }

  const pendenciaBloqueante =
    contadores.documentosPendentes > 0 ||
    contadores.vencendoAntesSessao > 0 ||
    itens.some((i) => i.situacao === 'nao_confere') ||
    contadores.exigenciasAcessoriasPendentes > 0

  return NextResponse.json({ itens, acessorias, documentosDisponiveis, contadores, pendenciaBloqueante })
}
