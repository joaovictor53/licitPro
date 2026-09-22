// types/habilitacao-tipos.ts
// Ferramenta 13, Habilitação.

export const RESULTADOS_HABILITACAO = ['habilitada', 'inabilitada', 'em_diligencia'] as const
export type ResultadoHabilitacao = (typeof RESULTADOS_HABILITACAO)[number]
