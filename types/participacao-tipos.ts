// types/participacao-tipos.ts

// Lista fechada de 22 estados (LicitPro_Analise_Ferramentas.md, Anexos).
// SUSPENSA entra entre ENVIADA e EM_DISPUTA.
export const ESTADOS_PARTICIPACAO = [
  'identificada',
  'em_triagem',
  'descartada',
  'em_analise_profunda',
  'aguardando_documentos',
  'aguardando_cotacao',
  'em_composicao_de_preco',
  'em_elaboracao',
  'aguardando_aprovacao',
  'aguardando_assinatura',
  'pronta_para_envio',
  'enviada',
  'suspensa',
  'em_disputa',
  'em_habilitacao',
  'habilitada',
  'inabilitada',
  'vencedora_provisoria',
  'adjudicada',
  'homologada',
  'contratada',
  'encerrada',
] as const

export type EstadoParticipacao = (typeof ESTADOS_PARTICIPACAO)[number]

export const ESFERAS = ['federal', 'estadual', 'municipal', 'privado'] as const

export type Esfera = (typeof ESFERAS)[number]
