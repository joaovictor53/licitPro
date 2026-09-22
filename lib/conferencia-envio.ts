// lib/conferencia-envio.ts
// Ferramenta 10, Envio — a conferência final ANTES do registro do envio.
// Bloqueia de verdade: se falhar, a participação não pode ser marcada como
// enviada. Reaproveita o que a Ferramenta 8 já verifica (dossiê, preço,
// itens críticos) e soma as assinaturas obrigatórias (Ferramenta 9) e as
// acessórias com prazo já vencido (Ferramenta 6).
//
// Fora de escopo (mesma nota de Fase 8): prazo de validade da proposta e
// prazo de entrega contra o mínimo/admitido do edital — a Ferramenta 3 não
// estrutura esses dois prazos ainda.

import { eq } from 'drizzle-orm'
import { db } from '@/app/src'
import { acessoriaParticipacao, assinaturaPeca, exigenciaEdital } from '@/app/src/db/schema'
import { montarAgregadoProposta } from '@/lib/montagem-proposta'
import { ConferenciaFinalEnvio } from '@/types/envio-tipos'

export const conferirEnvio = async (participacaoId: string): Promise<ConferenciaFinalEnvio> => {
  const agregado = await montarAgregadoProposta(participacaoId)
  const pendencias = [...agregado.checagem.pendencias]

  const assinaturas = await db.select().from(assinaturaPeca).where(eq(assinaturaPeca.participacaoId, participacaoId))
  const assinaturasPendentes = assinaturas.filter((a) => a.metodoExigido !== 'nao_requer' && a.status !== 'assinado')
  if (assinaturasPendentes.length > 0) {
    pendencias.push(`Assinatura obrigatória pendente em ${assinaturasPendentes.length} peça(s): ${assinaturasPendentes.map((a) => a.peca).join(', ')}.`)
  }

  const acessorias = await db
    .select({ titulo: exigenciaEdital.titulo, status: acessoriaParticipacao.status, prazoLimiteEm: acessoriaParticipacao.prazoLimiteEm })
    .from(acessoriaParticipacao)
    .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, acessoriaParticipacao.exigenciaEditalId))
    .where(eq(acessoriaParticipacao.participacaoId, participacaoId))

  const agora = Date.now()
  const acessoriasVencidas = acessorias.filter((a) => a.status === 'pendente' && a.prazoLimiteEm != null && new Date(a.prazoLimiteEm).getTime() < agora)
  if (acessoriasVencidas.length > 0) {
    pendencias.push(`Exigência acessória com prazo já vencido e ainda pendente: ${acessoriasVencidas.map((a) => a.titulo).join(', ')}.`)
  }

  return { ok: pendencias.length === 0, pendencias }
}
