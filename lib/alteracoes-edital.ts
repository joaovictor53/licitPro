// lib/alteracoes-edital.ts
// Diferença entre o que já temos de um edital e o que o PNCP devolve agora.
// Só os campos que mudam o que a empresa faz (objeto, valor, prazos, link)
// geram alteração — o resto é ruído de reprocessamento.

export const CAMPOS_MONITORADOS = [
  { campo: 'objeto', rotulo: 'Objeto' },
  { campo: 'valorEstimado', rotulo: 'Valor estimado' },
  { campo: 'dataAberturaProposta', rotulo: 'Abertura das propostas' },
  { campo: 'dataEncerramentoProposta', rotulo: 'Encerramento das propostas' },
  { campo: 'modalidade', rotulo: 'Modalidade' },
  { campo: 'linkOrigem', rotulo: 'Link do processo' },
] as const

export type CampoMonitorado = (typeof CAMPOS_MONITORADOS)[number]['campo']

export type EditalComparavel = Partial<Record<CampoMonitorado, string | number | Date | null | undefined>>

export interface Alteracao {
  campo: CampoMonitorado
  antes: string | null
  depois: string | null
}

const normalizar = (campo: CampoMonitorado, valor: string | number | Date | null | undefined): string | null => {
  if (valor === null || valor === undefined || valor === '') return null
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor.toISOString()
  if (campo === 'valorEstimado') {
    const numero = Number(valor)
    return Number.isNaN(numero) ? String(valor) : numero.toFixed(2)
  }
  if (campo === 'objeto') return String(valor).replace(/\s+/g, ' ').trim()
  return String(valor).trim()
}

export const compararEditais = (anterior: EditalComparavel, atual: EditalComparavel): Alteracao[] => {
  const alteracoes: Alteracao[] = []
  for (const { campo } of CAMPOS_MONITORADOS) {
    const antes = normalizar(campo, anterior[campo])
    const depois = normalizar(campo, atual[campo])
    // Campo que o PNCP deixou de devolver não é alteração: a resposta pode vir parcial.
    if (depois === null) continue
    if (antes !== depois) alteracoes.push({ campo, antes, depois })
  }
  return alteracoes
}

export const rotuloDoCampo = (campo: string): string =>
  CAMPOS_MONITORADOS.find((c) => c.campo === campo)?.rotulo ?? campo
