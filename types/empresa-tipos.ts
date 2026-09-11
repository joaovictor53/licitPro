// types/empresa-tipos.ts

export const PORTES_EMPRESA = ['mei', 'me', 'epp', 'demais', 'nao_informado'] as const

export type PorteEmpresa = (typeof PORTES_EMPRESA)[number]

export interface RepresentanteLegal {
  nome: string
  cpf?: string
  poderes?: string
}

export interface IdentidadeVisual {
  logoUrl?: string
  telefone?: string
  email?: string
  inscricaoEstadual?: string
  inscricaoMunicipal?: string
  dadosBancarios?: string
  marcaDaguaUrl?: string
}

export interface ImpedimentoSancao {
  tipo: string
  motivo: string
  dataInicio: string
  dataFim?: string | null
  arquivoUrl?: string
}
