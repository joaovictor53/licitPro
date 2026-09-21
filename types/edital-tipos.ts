// types/edital-tipos.ts
// Ferramenta 3, Leitura do Edital — ver LicitPro_Analise_Ferramentas.md.
// Escopo da "leitura padrão" (o restante — marca/modelo, condições
// comerciais etc — é o botão "Aprofundar" do doc, ainda não implementado):
// o que desclassifica, o que inabilita, exigências de habilitação com
// critério, objeto/especificação e prazos/datas.

export const TIPOS_EXIGENCIA = [
  'habilitacao',
  'proposta',
  'tecnica',
  'acessoria',
  'prazo',
  'comercial',
] as const
export type TipoExigencia = (typeof TIPOS_EXIGENCIA)[number]

export const SITUACOES_EXIGENCIA = ['atende', 'nao_atende', 'parcial', 'a_verificar'] as const
export type SituacaoExigencia = (typeof SITUACOES_EXIGENCIA)[number]

export const RISCOS_EXIGENCIA = ['desclassifica', 'inabilita', 'sanavel'] as const
export type RiscoExigencia = (typeof RISCOS_EXIGENCIA)[number]

export const CONFIANCAS_LEITURA = ['alta', 'media', 'baixa'] as const
export type ConfiancaLeitura = (typeof CONFIANCAS_LEITURA)[number]

// Uma linha da matriz de conformidade, como extraída pela IA a partir do
// texto do edital — antes de qualquer conferência humana.
export interface ExigenciaExtraida {
  titulo: string
  tipo: TipoExigencia
  obrigatorio: boolean
  o_que_exige: string
  criterio_aceitacao: string
  trecho: string
  pagina: number | null
  clausula: string | null
  risco: RiscoExigencia
  confianca: ConfiancaLeitura
}
