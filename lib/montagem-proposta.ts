// lib/montagem-proposta.ts
// Ferramenta 8, Montagem da Proposta — monta a lista de peças (o que a
// Ferramenta 6 e a Ferramenta 7 já produziram, mais a proposta em si) e a
// checagem final. Aqui a checagem BLOQUEIA de verdade (diferente das fases
// anteriores, que só avisam) — ver Regras da Ferramenta 8.
//
// Fora de escopo deste MVP (documentado, não escondido): anexos-modelo do
// edital preenchidos automaticamente (não há extração estruturada de
// formulário-anexo) e verificação de prazo de validade/entrega contra o
// exigido pelo edital (a Ferramenta 3 ainda não estrutura esses dois prazos
// como campos comparáveis) — por isso essas duas conferências do doc não
// aparecem na checagem abaixo.

import { desc, eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { acessoriaParticipacao, checklistParticipacao, exigenciaEdital, itemPrecoParticipacao, versaoPlanilhaPrecos } from '@/app/src/db/schema'
import { AgregadoMontagemProposta, PecaMontagem } from '@/types/proposta-tipos'

export const montarAgregadoProposta = async (participacaoId: string): Promise<AgregadoMontagemProposta> => {
  const itensChecklist = await db
    .select({
      titulo: exigenciaEdital.titulo,
      risco: exigenciaEdital.risco,
      situacao: checklistParticipacao.situacao,
    })
    .from(checklistParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, checklistParticipacao.exigenciaEditalId))
    .where(eq(checklistParticipacao.participacaoId, participacaoId))

  const acessorias = await db
    .select({ titulo: exigenciaEdital.titulo, status: acessoriaParticipacao.status })
    .from(acessoriaParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, acessoriaParticipacao.exigenciaEditalId))
    .where(eq(acessoriaParticipacao.participacaoId, participacaoId))

  const itensPreco = await db.select().from(itemPrecoParticipacao).where(eq(itemPrecoParticipacao.participacaoId, participacaoId))

  const [ultimaPlanilha] = await db
    .select({ id: versaoPlanilhaPrecos.id })
    .from(versaoPlanilhaPrecos)
    .where(eq(versaoPlanilhaPrecos.participacaoId, participacaoId))
    .orderBy(desc(versaoPlanilhaPrecos.versao))
    .limit(1)

  const pecas: PecaMontagem[] = []
  const pendencias: string[] = []

  pecas.push({
    peca: 'Proposta comercial',
    origem: 'gerada',
    situacao: itensPreco.length > 0 ? 'pronta' : 'faltando',
  })
  if (itensPreco.length === 0) pendencias.push('Cadastre ao menos um item em Composição de Preço antes de montar a proposta.')

  pecas.push({
    peca: 'Planilha de preços',
    origem: 'Ferramenta 7',
    situacao: ultimaPlanilha ? 'pronta' : 'faltando',
  })
  if (!ultimaPlanilha) pendencias.push('Gere a planilha de preços (Ferramenta 7) antes de montar a proposta.')

  for (const item of itensChecklist) {
    let situacao: PecaMontagem['situacao']
    let detalhe: string | undefined
    switch (item.situacao) {
      case 'ok':
        situacao = 'vinculada'
        break
      case 'vence_antes':
        situacao = 'vence_antes_sessao'
        detalhe = 'Documento vence antes da sessão.'
        break
      case 'nao_confere':
        situacao = 'faltando'
        detalhe = 'Documento vinculado não confere com a exigência.'
        break
      case 'a_verificar':
        situacao = 'faltando'
        detalhe = 'Aguardando conferência humana.'
        break
      default:
        situacao = 'faltando'
    }
    pecas.push({ peca: item.titulo, origem: 'dossiê', situacao, detalhe })

    const critico = item.risco !== 'sanavel'
    if (situacao !== 'vinculada' && critico) {
      pendencias.push(`"${item.titulo}" (${detalhe ?? 'pendente'}) — exigência que desclassifica/inabilita.`)
    }
  }

  for (const acessoria of acessorias) {
    const situacao: PecaMontagem['situacao'] = acessoria.status === 'cumprida' ? 'vinculada' : 'faltando'
    pecas.push({ peca: acessoria.titulo, origem: 'exigência acessória', situacao })
    if (situacao === 'faltando') pendencias.push(`Exigência acessória pendente: "${acessoria.titulo}".`)
  }

  const itensAcimaTeto = itensPreco.filter((item) => {
    if (item.tetoUnitario == null || item.precoOfertado == null) return false
    return Number(item.precoOfertado) > Number(item.tetoUnitario)
  })
  if (itensAcimaTeto.length > 0) {
    pendencias.push(`${itensAcimaTeto.length} item(ns) de preço acima do teto do edital.`)
  }

  const itensSemPreco = itensPreco.filter((item) => item.precoOfertado == null)
  if (itensSemPreco.length > 0) {
    pendencias.push(`${itensSemPreco.length} item(ns) ainda sem preço ofertado.`)
  }

  return {
    pecas,
    checagem: { podeGerar: pendencias.length === 0, pendencias },
  }
}
