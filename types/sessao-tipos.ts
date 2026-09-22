// types/sessao-tipos.ts
// Ferramenta 12, Registro da Sessão — só registro pós-fato, nunca
// acompanhamento ao vivo (Regra Geral 1 e regras próprias da ferramenta).

export const SITUACOES_RESULTADO_SESSAO = ['vencedora_provisoria', 'classificada', 'desclassificada', 'inabilitada'] as const
export type SituacaoResultadoSessao = (typeof SITUACOES_RESULTADO_SESSAO)[number]
