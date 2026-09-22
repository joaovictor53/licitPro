// types/resultado-tipos.ts
// Ferramenta 15, Resultado e Contrato.

export const RESULTADOS_DESFECHO = [
  'vencedora', 'perdedora', 'desclassificada', 'inabilitada',
  'desistente', 'certame_anulado', 'revogado', 'fracassado', 'deserto',
] as const
export type ResultadoDesfecho = (typeof RESULTADOS_DESFECHO)[number]

export const TIPOS_CONTRATO = ['contrato', 'ata_registro_precos'] as const
export type TipoContrato = (typeof TIPOS_CONTRATO)[number]
