// types/decisao-tipos.ts
// Ferramenta 5, Decisão de Participar.

export const DECISOES_PARTICIPACAO = ['participar', 'nao_participar', 'adiar'] as const
export type DecisaoParticipacaoTipo = (typeof DECISOES_PARTICIPACAO)[number]

export const MOTIVOS_NAO_PARTICIPAR = [
  'fora_do_ramo',
  'valor_abaixo_do_minimo',
  'valor_acima_da_capacidade',
  'margem_insuficiente',
  'retorno_abaixo_do_pretendido',
  'prazo_inexequivel',
  'exigencia_que_a_empresa_nao_atende',
  'risco_de_recebimento',
  'falta_de_caixa',
  'prazo_curto_demais_para_preparar',
  'outro',
] as const
export type MotivoNaoParticipar = (typeof MOTIVOS_NAO_PARTICIPAR)[number]

export const STATUS_APROVACAO_EMPRESA = ['nao_enviada', 'aguardando', 'aprovada', 'recusada'] as const
export type StatusAprovacaoEmpresa = (typeof STATUS_APROVACAO_EMPRESA)[number]

export interface AlertaDecisao {
  motivo: string
}

// Congelado no momento da decisão — "seis meses depois, é preciso saber o
// que se sabia naquele dia" (Ferramenta 5, Regras).
export interface NumerosCongeladosDecisao {
  diasAteSessao: number | null
  semaforoRecurso: string | null
  itensCriticosNaoConferidos: number
  itensAVerificar: number
  documentosVencendoAntesSessao: number
  acessoriasPendentes: number
  piso: number | null
  alvo: number | null
  teto: number | null
  margemBasePercentual: number | null
  margemConservadoraPercentual: number | null
  investimentoNecessario: number | null
  retornoSobreInvestidoPercentual: number | null
  cicloDias: number | null
  picoCaixaNegativo: number | null
  estouraCaixaLivre: boolean
  estouraCapacidadeEntrega: boolean
}
