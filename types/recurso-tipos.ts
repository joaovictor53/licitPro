// types/recurso-tipos.ts
// Tipos da Ferramenta 2, Ficha do Recurso.

export const ORIGENS_RECURSO = ['federal', 'estadual', 'municipal', 'misto', 'terceiro', 'nao_identificado'] as const
export type OrigemRecurso = (typeof ORIGENS_RECURSO)[number]

export const INSTRUMENTOS_RECURSO = [
  'dotacao_propria',
  'convenio',
  'contrato_repasse',
  'emenda_parlamentar',
  'termo_fomento',
  'financiamento',
  'outro',
] as const
export type InstrumentoRecurso = (typeof INSTRUMENTOS_RECURSO)[number]

export const SITUACOES_RECURSO = ['apenas_previsto', 'empenhado', 'liquidado', 'pago', 'nao_localizado'] as const
export type SituacaoRecurso = (typeof SITUACOES_RECURSO)[number]

export const SEMAFOROS_RECURSO = ['verde', 'amarelo', 'vermelho'] as const
export type SemaforoRecurso = (typeof SEMAFOROS_RECURSO)[number]

// Um campo de dotação orçamentária extraído do edital pela IA — ou vazio e
// marcado como não localizado, quando o edital não traz a informação.
export interface CampoDotacao {
  valor: string | null
  trecho: string | null
  pagina: number | null
}

export interface DotacaoOrcamentaria {
  programaTrabalho: CampoDotacao
  fonteRecurso: CampoDotacao
  elementoDespesa: CampoDotacao
  mencaoConvenioEmendaRepasse: CampoDotacao
}

// Fica zerado até a Ferramenta 15 (Resultado e Contrato) alimentar histórico
// real de pagamentos — a amostra vazia deve aparecer na tela, não ser escondida.
export interface IndicadorPagamentoOrgao {
  prazoMedioDias: number | null
  quantidadeContratos: number
  atrasosRegistrados: number
}

export interface FatorSemaforo {
  nivel: SemaforoRecurso
  motivo: string
}
