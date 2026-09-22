// types/recurso-fase-tipos.ts
// Ferramenta 14, Recurso — fase recursal (não confundir com a Ferramenta 2,
// Ficha do Recurso, que é análise prévia de risco/estratégia; esta aqui
// controla prazo e protocolo depois que a sessão já aconteceu).

export const ESTADOS_RECURSO_FASE = [
  'sem_evento',
  'evento_identificado',
  'aguardando_decisao_interna',
  'intencao_pendente',
  'intencao_registrada',
  'prazo_razoes_em_curso',
  'razoes_protocoladas',
  'aguardando_contrarrazoes',
  'contrarrazoes_recebidas',
  'decisao_recebida',
  'acolhido',
  'rejeitado',
  'prazo_perdido',
  'encerrado',
] as const
export type EstadoRecursoFase = (typeof ESTADOS_RECURSO_FASE)[number]

export const RESULTADOS_DECISAO_RECURSAL = ['acolhido', 'rejeitado', 'parcialmente_acolhido'] as const
export type ResultadoDecisaoRecursal = (typeof RESULTADOS_DECISAO_RECURSAL)[number]
