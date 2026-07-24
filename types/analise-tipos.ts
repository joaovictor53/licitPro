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
  /**
   * Peso estratégico do apontamento para o êxito do recurso — escala de risco
   * granular (melhoria 2.6), INDEPENDENTE de `gravidade` (natureza jurídica) e
   * de `confianca` (base documental). Ajuda o usuário a saber onde focar.
   * Campo opcional para compatibilidade com análises antigas.
   */
  impacto_recurso?: 'alto' | 'medio' | 'baixo'
  /**
   * Nível de confiança na base documental do apontamento (camada anti-alucinação
   * — melhoria 2.5). Reportado pela IA e revisado por uma checagem determinística
   * no servidor. Campo opcional para compatibilidade com análises antigas.
   */
  confianca?: 'alta' | 'media' | 'baixa'
  /**
   * Quando `true`, o apontamento não tem base documental clara e deve ser
   * revisado manualmente antes de usar no recurso, em vez de tratado como
   * irregularidade confirmada.
   */
  requer_verificacao_manual?: boolean
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
