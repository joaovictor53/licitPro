// lib/janelas-coleta.ts
// Planejamento das janelas de coleta do Radar (porte da ideia do Caçador):
// o período é fatiado em janelas de N dias e cada combinação
// (janela × UF × modalidade) vira uma varredura registrada como completa,
// incompleta ou com erro. Janela completa do passado nunca é refeita; a
// janela que contém hoje ainda recebe publicações, então é sempre refeita.

export type StatusVarredura = 'completa' | 'incompleta' | 'erro'

export interface Janela {
  /** AAAAMMDD, inclusive */
  inicial: string
  /** AAAAMMDD, inclusive */
  final: string
}

export interface ChaveVarredura extends Janela {
  uf: string
  modalidade: number
}

export const formatarDataPncp = (data: Date): string =>
  `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, '0')}${String(data.getDate()).padStart(2, '0')}`

const somarDias = (data: Date, dias: number): Date => {
  const nova = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  nova.setDate(nova.getDate() + dias)
  return nova
}

/**
 * Fatia [hoje - dias, hoje] em janelas de `tamanho` dias, da mais recente para
 * a mais antiga (o que é novo é coletado primeiro se o tempo acabar).
 */
export const gerarJanelas = (hoje: Date, dias: number, tamanho: number): Janela[] => {
  const janelas: Janela[] = []
  const limite = somarDias(hoje, -dias)
  let final = somarDias(hoje, 0)
  while (final >= limite) {
    const inicioCandidato = somarDias(final, -(tamanho - 1))
    const inicio = inicioCandidato < limite ? limite : inicioCandidato
    janelas.push({ inicial: formatarDataPncp(inicio), final: formatarDataPncp(final) })
    final = somarDias(inicio, -1)
  }
  return janelas
}

export const chaveDaVarredura = (c: ChaveVarredura): string =>
  `${c.uf}|${c.modalidade}|${c.inicial}|${c.final}`

/**
 * Decide o que ainda precisa ser coletado. `registradas` traz o status já
 * gravado de cada chave. Pula só o que está completo e é do passado.
 */
export const planejarVarreduras = (params: {
  hoje: Date
  dias: number
  tamanhoJanela: number
  ufs: string[]
  modalidades: number[]
  registradas: Map<string, StatusVarredura>
  refazer?: boolean
}): ChaveVarredura[] => {
  const hojeTexto = formatarDataPncp(params.hoje)
  const pendentes: ChaveVarredura[] = []

  for (const janela of gerarJanelas(params.hoje, params.dias, params.tamanhoJanela)) {
    const contemHoje = janela.inicial <= hojeTexto && hojeTexto <= janela.final
    for (const uf of params.ufs) {
      for (const modalidade of params.modalidades) {
        const chave: ChaveVarredura = { ...janela, uf, modalidade }
        const status = params.registradas.get(chaveDaVarredura(chave))
        const jaResolvida = status === 'completa' && !contemHoje && !params.refazer
        if (!jaResolvida) pendentes.push(chave)
      }
    }
  }
  return pendentes
}
