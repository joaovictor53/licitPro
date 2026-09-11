// types/radar-tipos.ts

export const MODOS_BUSCA_RADAR = ['cnae', 'livre'] as const
export type ModoBuscaRadar = (typeof MODOS_BUSCA_RADAR)[number]

export interface RadarConfig {
  modoBusca: ModoBuscaRadar
  esfera: 'federal' | 'estadual' | 'municipal' | 'privado' | null
  estados: string[]
  orgaosIncluir: string[]
  orgaosExcluir: string[]
  textoLivre: string | null
  faixaValorMin: number | null
  faixaValorMax: number | null
  ativo: boolean
}

// Campos que a API de consulta do PNCP retorna para cada contratação, no
// endpoint /v1/contratacoes/publicacao — só o que o Radar usa hoje. A API
// pública não tem busca por palavra-chave/CNAE (confirmado na documentação
// disponível publicamente), então o filtro por objeto é sempre feito aqui,
// depois de buscar por UF/modalidade/data.
export interface ContratacaoPncp {
  numeroControlePNCP: string
  orgaoEntidade?: { cnpj?: string; razaoSocial?: string }
  unidadeOrgao?: { municipioNome?: string; ufSigla?: string; codigoIbge?: string }
  objetoCompra?: string
  valorTotalEstimado?: number | null
  dataAberturaProposta?: string | null
  dataEncerramentoProposta?: string | null
  dataPublicacaoPncp?: string | null
  modalidadeNome?: string | null
  numeroCompra?: string | null
  processo?: string | null
  linkSistemaOrigem?: string | null
}

export const FONTES_RADAR = ['pncp', 'portal_compras_publicas'] as const
export type FonteRadar = (typeof FONTES_RADAR)[number]

// Formato comum para o que vem de qualquer fonte do Radar (PNCP, Portal de
// Compras Públicas, e outras que entrarem depois) — o filtro local e o
// upsert em `participacao` trabalham só com isto, sem saber de onde veio.
export interface ContratacaoRadar {
  identificadorExterno: string
  fonte: FonteRadar
  orgao: string | null
  municipio: string | null
  uf: string | null
  objeto: string | null
  valorEstimado: number | null
  modalidade: string | null
  numeroProcesso: string | null
  dataSessaoEm: string | null
  linkPortalOrigem: string | null
}
