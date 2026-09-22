// lib/agregado-decisao.ts
// Ferramenta 5, Decisão de Participar — "não tem campo para preencher, é
// tudo que já existe, reunido". Nenhum cálculo novo: só lê o que as
// Ferramentas 1 a 4 já produziram e monta os blocos da tela + os alertas.

import { eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { acessoriaParticipacao, checklistParticipacao, edital, exigenciaEdital, fichaRecurso, participacao, viabilidadeParticipacao } from '@/app/src/db/schema'
import { obterIndicadorPagamentoOrgao } from '@/lib/indicador-pagamento-orgao'
import { AlertaDecisao, NumerosCongeladosDecisao } from '@/types/decisao-tipos'

const numeroOuNulo = (valor: string | null | undefined): number | null => {
  if (valor == null) return null
  const n = parseFloat(valor)
  return Number.isFinite(n) ? n : null
}

export const montarAgregadoDecisao = async (participacaoId: string) => {
  const [participacaoAtual] = await db.select().from(participacao).where(eq(participacao.id, participacaoId)).limit(1)
  if (!participacaoAtual) return null

  const [editalAtual] = await db.select().from(edital).where(eq(edital.participacaoId, participacaoId)).limit(1)
  const [ficha] = await db.select().from(fichaRecurso).where(eq(fichaRecurso.participacaoId, participacaoId)).limit(1)
  const [viabilidade] = await db.select().from(viabilidadeParticipacao).where(eq(viabilidadeParticipacao.participacaoId, participacaoId)).limit(1)

  const itensChecklist = await db
    .select({ situacao: checklistParticipacao.situacao, risco: exigenciaEdital.risco })
    .from(checklistParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, checklistParticipacao.exigenciaEditalId))
    .where(eq(checklistParticipacao.participacaoId, participacaoId))

  const acessorias = await db
    .select({
      status: acessoriaParticipacao.status,
      prazoLimiteEm: acessoriaParticipacao.prazoLimiteEm,
      custoEstimado: acessoriaParticipacao.custoEstimado,
      titulo: exigenciaEdital.titulo,
    })
    .from(acessoriaParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, acessoriaParticipacao.exigenciaEditalId))
    .where(eq(acessoriaParticipacao.participacaoId, participacaoId))

  const indicadorPagamento = await obterIndicadorPagamentoOrgao(participacaoAtual.empresaId, participacaoAtual.orgao)

  const itensCriticosNaoConferidos = itensChecklist.filter((i) => i.situacao === 'a_verificar' && i.risco !== 'sanavel').length
  const itensAVerificar = itensChecklist.filter((i) => i.situacao === 'a_verificar').length
  const documentosVencendoAntesSessao = itensChecklist.filter((i) => i.situacao === 'vence_antes').length
  const documentosFaltando = itensChecklist.filter((i) => i.situacao === 'faltando').length
  const acessoriasPendentes = acessorias.filter((a) => a.status === 'pendente').length

  const diasAteSessao = participacaoAtual.dataSessaoEm
    ? Math.ceil((new Date(participacaoAtual.dataSessaoEm).getTime() - Date.now()) / 86_400_000)
    : null

  const resultado = viabilidade?.resultado ?? null

  const alertas: AlertaDecisao[] = []
  if (itensCriticosNaoConferidos > 0) alertas.push({ motivo: `${itensCriticosNaoConferidos} item(ns) crítico(s) da matriz ainda não conferido(s)` })
  if (ficha?.semaforo === 'vermelho') alertas.push({ motivo: 'Semáforo do recurso está vermelho' })
  if (resultado?.exposicaoCaixa.estouraCaixaLivre) alertas.push({ motivo: 'Estouro de caixa livre projetado' })
  if (resultado?.exposicaoCaixa.estouraCapacidadeEntrega) alertas.push({ motivo: 'Volume excede a capacidade de entrega cadastrada' })
  if (documentosFaltando > 0) alertas.push({ motivo: `${documentosFaltando} documento(s) de habilitação faltando` })

  const numerosCongelados: NumerosCongeladosDecisao = {
    diasAteSessao,
    semaforoRecurso: ficha?.semaforo ?? null,
    itensCriticosNaoConferidos,
    itensAVerificar,
    documentosVencendoAntesSessao,
    acessoriasPendentes,
    piso: resultado?.base.pisoAlvoTeto.piso ?? null,
    alvo: resultado?.base.pisoAlvoTeto.alvo ?? null,
    teto: resultado?.base.pisoAlvoTeto.teto ?? null,
    margemBasePercentual: resultado?.base.avaliacaoPreco?.margemRealPercentual ?? null,
    margemConservadoraPercentual: resultado?.conservador.avaliacaoPreco?.margemRealPercentual ?? null,
    investimentoNecessario: resultado?.base.retorno.investimentoNovoDesembolso ?? null,
    retornoSobreInvestidoPercentual: resultado?.base.retorno.retornoSobreInvestido ?? null,
    cicloDias: resultado?.base.retorno.cicloDias ?? null,
    picoCaixaNegativo: resultado?.exposicaoCaixa.picoCaixaNegativo ?? null,
    estouraCaixaLivre: resultado?.exposicaoCaixa.estouraCaixaLivre ?? false,
    estouraCapacidadeEntrega: resultado?.exposicaoCaixa.estouraCapacidadeEntrega ?? false,
  }

  return {
    participacao: participacaoAtual,
    edital: editalAtual ? { nomeArquivo: editalAtual.nomeArquivo, numPaginas: editalAtual.numPaginas } : null,
    ficha: ficha ?? null,
    indicadorPagamento,
    viabilidadeResultado: resultado,
    acessoriasComPrazoECusto: acessorias.map((a) => ({ titulo: a.titulo, prazoLimiteEm: a.prazoLimiteEm, custoEstimado: numeroOuNulo(a.custoEstimado) })),
    alertas,
    numerosCongelados,
  }
}

/** Metade do tempo restante até a sessão, com piso de três dias antes (Ferramenta 5, "Adiar"). */
export const sugerirDataRetomada = (dataSessaoEm: Date | null): Date => {
  const agora = Date.now()
  if (!dataSessaoEm) {
    return new Date(agora + 7 * 86_400_000)
  }
  const restanteMs = dataSessaoEm.getTime() - agora
  const metadeMs = agora + restanteMs / 2
  const pisoMs = dataSessaoEm.getTime() - 3 * 86_400_000
  return new Date(Math.min(metadeMs, pisoMs))
}
