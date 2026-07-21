// types/analise-tipos.ts

export interface NaoConformidade {
  id: number
  titulo: string
  item_edital: string
  problema: string
  evidencia?: string
  pagina?: number | null
  recomendacao?: string
  gravidade: 'material' | 'sanável'
  fundamento_legal: string
}

export interface ResultadoAnalise {
  resumo: string
  total_irregularidades: number
  nao_conformidades: NaoConformidade[]
  recurso_administrativo: string
  mensagem_pregoeiro: string
}

export interface ErroAnalise {
  erro: string
  detalhes?: string
}
