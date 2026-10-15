// lib/etapas-participacao.ts
// As etapas do processo de uma participação, na ordem em que acontecem, e em qual delas cada um dos
// 22 estados cai. Puro (sem React nem banco): alimenta a faixa de etapas da participação e o painel.

import type { EstadoParticipacao } from '@/types/participacao-tipos'

export interface PaginaDaEtapa {
  /** Trecho depois de /participacoes/[id]; '' é a página principal (a leitura do edital). */
  caminho: string
  rotulo: string
}

export interface Etapa {
  id: string
  rotulo: string
  /** Estados em que a participação está "nesta etapa". */
  estados: EstadoParticipacao[]
  /** Páginas (ferramentas) que pertencem à etapa; a primeira é a principal. */
  paginas: PaginaDaEtapa[]
}

export const ETAPAS: Etapa[] = [
  {
    id: 'edital',
    rotulo: 'Edital',
    estados: ['identificada', 'em_triagem', 'em_analise_profunda', 'aguardando_documentos'],
    paginas: [
      { caminho: '', rotulo: 'Leitura do edital' },
      { caminho: 'recurso', rotulo: 'Ficha do recurso' },
      { caminho: 'documentos', rotulo: 'Documentos' },
    ],
  },
  {
    id: 'viabilidade',
    rotulo: 'Viabilidade',
    estados: ['aguardando_cotacao'],
    paginas: [
      { caminho: 'viabilidade', rotulo: 'Viabilidade financeira' },
      { caminho: 'decisao', rotulo: 'Decisão de participar' },
    ],
  },
  { id: 'preco', rotulo: 'Preço', estados: ['em_composicao_de_preco'], paginas: [{ caminho: 'precos', rotulo: 'Composição de preço' }] },
  { id: 'proposta', rotulo: 'Proposta', estados: ['em_elaboracao'], paginas: [{ caminho: 'proposta', rotulo: 'Montagem da proposta' }] },
  {
    id: 'assinatura',
    rotulo: 'Assinatura',
    estados: ['aguardando_aprovacao', 'aguardando_assinatura'],
    paginas: [{ caminho: 'aprovacao', rotulo: 'Aprovação e assinatura' }],
  },
  {
    id: 'envio',
    rotulo: 'Envio',
    estados: ['pronta_para_envio', 'enviada'],
    paginas: [
      { caminho: 'upload', rotulo: 'Preparação de upload' },
      { caminho: 'envio', rotulo: 'Envio' },
    ],
  },
  { id: 'sessao', rotulo: 'Sessão', estados: ['suspensa', 'em_disputa'], paginas: [{ caminho: 'sessao', rotulo: 'Registro da sessão' }] },
  {
    id: 'habilitacao',
    rotulo: 'Habilitação',
    estados: ['vencedora_provisoria', 'em_habilitacao', 'habilitada', 'inabilitada'],
    paginas: [
      { caminho: 'habilitacao', rotulo: 'Habilitação' },
      { caminho: 'recurso-fase', rotulo: 'Fase recursal' },
    ],
  },
  {
    id: 'resultado',
    rotulo: 'Resultado',
    estados: ['adjudicada', 'homologada', 'contratada', 'encerrada'],
    paginas: [{ caminho: 'resultado', rotulo: 'Resultado e contrato' }],
  },
]

export const ROTULOS_ESTADO: Record<EstadoParticipacao, string> = {
  identificada: 'Identificada',
  em_triagem: 'Em triagem',
  descartada: 'Descartada',
  em_analise_profunda: 'Em análise profunda',
  aguardando_documentos: 'Aguardando documentos',
  aguardando_cotacao: 'Aguardando cotação',
  em_composicao_de_preco: 'Em composição de preço',
  em_elaboracao: 'Em elaboração',
  aguardando_aprovacao: 'Aguardando aprovação',
  aguardando_assinatura: 'Aguardando assinatura',
  pronta_para_envio: 'Pronta para envio',
  enviada: 'Enviada',
  suspensa: 'Suspensa',
  em_disputa: 'Em disputa',
  em_habilitacao: 'Em habilitação',
  habilitada: 'Habilitada',
  inabilitada: 'Inabilitada',
  vencedora_provisoria: 'Vencedora provisória',
  adjudicada: 'Adjudicada',
  homologada: 'Homologada',
  contratada: 'Contratada',
  encerrada: 'Encerrada',
}

/** Índice da etapa em que o estado cai; `null` para descartada (fora do fluxo) ou estado desconhecido. */
export const indiceDaEtapaDoEstado = (estado: string): number | null => {
  const indice = ETAPAS.findIndex((etapa) => (etapa.estados as string[]).includes(estado))
  return indice === -1 ? null : indice
}

/** Índice da etapa a que uma página da participação pertence (`/participacoes/[id]/<caminho>`). */
export const indiceDaEtapaDaPagina = (caminho: string): number | null => {
  const indice = ETAPAS.findIndex((etapa) => etapa.paginas.some((pagina) => pagina.caminho === caminho))
  return indice === -1 ? null : indice
}

export type SituacaoEtapa = 'concluida' | 'atual' | 'futura'

export const situacaoDaEtapa = (indiceEtapa: number, estado: string): SituacaoEtapa => {
  const atual = indiceDaEtapaDoEstado(estado)
  if (atual === null) return 'futura'
  if (indiceEtapa < atual) return 'concluida'
  return indiceEtapa === atual ? 'atual' : 'futura'
}

/** Quanto do processo já passou, de 0 a 100 (etapas concluídas + a atual como metade). */
export const progressoDoProcesso = (estado: string): number => {
  const atual = indiceDaEtapaDoEstado(estado)
  if (atual === null) return 0
  return Math.round(((atual + 0.5) / ETAPAS.length) * 100)
}

/** Fases agrupadas para o painel: o que o operador precisa fazer, em palavras de operação. */
export const FASES_DO_PAINEL: Array<{ id: string; rotulo: string; etapas: string[] }> = [
  { id: 'preparar', rotulo: 'Preparar', etapas: ['edital', 'viabilidade'] },
  { id: 'propor', rotulo: 'Propor', etapas: ['preco', 'proposta', 'assinatura', 'envio'] },
  { id: 'disputar', rotulo: 'Disputar', etapas: ['sessao', 'habilitacao'] },
  { id: 'concluir', rotulo: 'Concluir', etapas: ['resultado'] },
]

export const faseDoPainelDoEstado = (estado: string): string | null => {
  const indice = indiceDaEtapaDoEstado(estado)
  if (indice === null) return null
  const etapa = ETAPAS[indice].id
  return FASES_DO_PAINEL.find((fase) => fase.etapas.includes(etapa))?.id ?? null
}
