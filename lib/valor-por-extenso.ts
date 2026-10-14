// lib/valor-por-extenso.ts
// Valor em reais por extenso ("mil duzentos e cinquenta reais e cinquenta centavos").
// Portado de app/valor_por_extenso.py do Proposta Certa. Vários modelos de proposta pedem
// "valor total por extenso" ou "valor total da proposta em número e por extenso".

import { arredondarCentavos, emMicro } from '@/lib/dinheiro'

const UNIDADES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze',
  'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
const ESCALAS: Array<[number, string, string]> = [
  [1e12, 'trilhão', 'trilhões'],
  [1e9, 'bilhão', 'bilhões'],
  [1e6, 'milhão', 'milhões'],
  [1e3, 'mil', 'mil'],
]
/** Exclusivo: valores a partir de 10^15 não têm extenso (devolve texto vazio). */
export const LIMITE = 1e15

const ate999 = (n: number): string => {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const centena = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (centena) partes.push(CENTENAS[centena])
  if (resto) {
    if (resto < 20) partes.push(UNIDADES[resto])
    else {
      const dezena = Math.floor(resto / 10)
      const unidade = resto % 10
      partes.push(DEZENAS[dezena] + (unidade ? ` e ${UNIDADES[unidade]}` : ''))
    }
  }
  return partes.join(' e ')
}

/** Inteiro não negativo por extenso (até 10^15 - 1). */
export const inteiroPorExtenso = (n: number): string => {
  if (!Number.isInteger(n) || n < 0 || n >= LIMITE) throw new RangeError('número fora do intervalo suportado')
  if (n === 0) return 'zero'
  const partes: Array<[number, string]> = []
  let resto = n
  for (const [valor, singular, plural] of ESCALAS) {
    const quociente = Math.floor(resto / valor)
    resto = resto % valor
    if (quociente) {
      partes.push([quociente, valor === 1e3 && quociente === 1 ? 'mil' : `${ate999(quociente)} ${quociente === 1 ? singular : plural}`])
    }
  }
  if (resto) partes.push([resto, ate999(resto)])
  if (partes.length === 1) return partes[0][1]
  const ultimoValor = partes[partes.length - 1][0]
  // "mil e cinquenta", "dois milhões e duzentos mil", "mil duzentos e cinquenta"
  const conector = ultimoValor < 100 || ultimoValor % 100 === 0 ? ' e ' : ' '
  return partes.slice(0, -1).map((p) => p[1]).join(' ') + conector + partes[partes.length - 1][1]
}

/**
 * 1250.5 -> "mil duzentos e cinquenta reais e cinquenta centavos".
 * `null`, negativo, não numérico ou acima do limite -> texto vazio (nunca inventa).
 */
export const valorPorExtenso = (valor: number | null | undefined): string => {
  if (valor == null || !Number.isFinite(valor) || valor < 0 || valor >= LIMITE) return ''
  const micro = emMicro(arredondarCentavos(valor))
  const reais = Number(micro / BigInt(1000000))
  const centavos = Number((micro % BigInt(1000000)) / BigInt(10000))
  if (reais >= LIMITE) return ''

  const partes: string[] = []
  if (reais || !centavos) {
    const sufixo = reais === 1 ? 'real' : reais >= 1e6 && reais % 1e6 === 0 ? 'de reais' : 'reais'
    partes.push(`${inteiroPorExtenso(reais)} ${sufixo}`)
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`)
  return partes.join(' e ')
}
