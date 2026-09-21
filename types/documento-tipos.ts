// types/documento-tipos.ts
// Ferramenta 6, Preparação Documental — dossiê documental da empresa e o
// checklist que cruza a matriz de conformidade (Ferramenta 3) com ele.

export const TIPOS_DOCUMENTO_DOSSIE = [
  'certidao_federal',
  'certidao_estadual',
  'certidao_municipal',
  'fgts',
  'trabalhista',
  'contrato_social',
  'balanco_patrimonial',
  'atestado_capacidade_tecnica',
  'alvara_funcionamento',
  'inscricao_estadual',
  'inscricao_municipal',
  'outro',
] as const
export type TipoDocumentoDossie = (typeof TIPOS_DOCUMENTO_DOSSIE)[number]

export const SITUACOES_CHECKLIST = ['ok', 'vence_antes', 'faltando', 'nao_confere', 'a_verificar'] as const
export type SituacaoChecklist = (typeof SITUACOES_CHECKLIST)[number]

export const STATUS_ACESSORIA = ['pendente', 'cumprida'] as const
export type StatusAcessoria = (typeof STATUS_ACESSORIA)[number]

// Balanço sem registro na Junta Comercial não serve para habilitação
// (Ferramenta 6, Regras) — sem estes campos, a situação é sempre "não confere".
export interface DadosBalancoPatrimonial {
  registroJuntaComercial: string | null
  dataRegistroEm: string | null
  exercicio: string | null
  certidaoAnexada: boolean
}
