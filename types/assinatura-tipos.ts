// types/assinatura-tipos.ts
// Ferramenta 9, Aprovação e Assinatura.
//
// Sem acesso à API do gov.br (empresa privada, sem domínio oficial — o
// próprio doc do produto registra isso) e sem assinatura ICP-Brasil
// integrada: o sistema nunca assina em nome de ninguém. O que existe aqui é
// orientação (qual método cada peça exige) e registro (quem assinou, quando,
// com qual método, e o arquivo já assinado, subido pelo operador).

export const METODOS_EXIGENCIA_ASSINATURA = [
  'nao_requer',
  'assinatura_representante_legal',
  'assinatura_eletronica_aceita',
  'icp_brasil_exigida',
  'assinatura_portal',
  'reconhecimento_firma',
  'autenticacao_copia',
  'apresentacao_original',
] as const
export type MetodoExigenciaAssinatura = (typeof METODOS_EXIGENCIA_ASSINATURA)[number]

export const METODOS_ASSINATURA_USADOS = ['gov_br', 'icp_brasil', 'outro'] as const
export type MetodoAssinaturaUsado = (typeof METODOS_ASSINATURA_USADOS)[number]

export const STATUS_ASSINATURA_PECA = ['pendente', 'assinado'] as const
export type StatusAssinaturaPeca = (typeof STATUS_ASSINATURA_PECA)[number]

export const STATUS_APROVACAO_PROPOSTA = ['aguardando', 'aprovada', 'devolvida', 'recusada'] as const
export type StatusAprovacaoProposta = (typeof STATUS_APROVACAO_PROPOSTA)[number]
