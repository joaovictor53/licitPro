// lib/dinheiro.ts
// Aritmética monetária exata, sem ponto flutuante. Portado de app/valores_proposta.py
// do Proposta Certa (Decimal, ROUND_HALF_UP).
//
// Os valores continuam entrando e saindo como `number` (é o que o resto do código
// e o JSON das rotas já usam), mas toda conta passa por inteiros BigInt em
// micro-unidades (6 casas) — o banco guarda numeric(14,4), então 6 casas
// cobrem preço unitário e quantidade sem perda.
//
// Arredondamento: metade para cima, afastando do zero (ROUND_HALF_UP do Decimal).
// Math.round(1.005 * 100) / 100 dá 1, e aqui dá 1.01.

const CASAS_INTERNAS = 6
const FATOR = BigInt(10) ** BigInt(CASAS_INTERNAS)

export const emMicro = (valor: number): bigint => {
  if (!Number.isFinite(valor)) throw new RangeError(`Valor monetário inválido: ${valor}`)
  return BigInt(valor.toFixed(CASAS_INTERNAS).replace('.', ''))
}

export const deMicro = (micro: bigint): number => Number(micro) / Number(FATOR)

/** num/den arredondado para o inteiro mais próximo, metade afastando do zero. */
export const dividirArredondado = (num: bigint, den: bigint): bigint => {
  if (den < BigInt(0)) {
    num = -num
    den = -den
  }
  const negativo = num < BigInt(0)
  const absoluto = negativo ? -num : num
  const quociente = (BigInt(2) * absoluto + den) / (BigInt(2) * den)
  return negativo ? -quociente : quociente
}

const micro10 = (casas: number): bigint => BigInt(10) ** BigInt(CASAS_INTERNAS - casas)

/** Arredonda para `casas` casas decimais (metade para cima). */
export const arredondar = (valor: number, casas = 2): number => {
  const unidade = micro10(casas)
  return deMicro(dividirArredondado(emMicro(valor), unidade) * unidade)
}

export const arredondarCentavos = (valor: number): number => arredondar(valor, 2)

/** a × b, com o resultado já arredondado para centavos (preço unitário × quantidade). */
export const multiplicarEmCentavos = (a: number, b: number): number =>
  deMicro(dividirArredondado(emMicro(a) * emMicro(b), FATOR * micro10(2)) * micro10(2))

/** a − b, exato (sem arredondar). */
export const subtrair = (a: number, b: number): number => deMicro(emMicro(a) - emMicro(b))

/** Soma exata (sem arredondar); o chamador arredonda se quiser. */
export const somar = (valores: number[]): number => deMicro(valores.reduce((total, v) => total + emMicro(v), BigInt(0)))

/** (numerador / denominador) × 100, arredondado a 2 casas. `null` se o denominador não for positivo. */
export const percentual = (numerador: number, denominador: number): number | null => {
  const den = emMicro(denominador)
  if (den <= BigInt(0)) return null
  return Number(dividirArredondado(emMicro(numerador) * BigInt(10000), den)) / 100
}

/** a ≥ b × fracao, exato (fracao em centésimos: 95 = 95%). */
export const atingeFracao = (a: number, b: number, centesimos: number): boolean =>
  emMicro(a) * BigInt(100) >= emMicro(b) * BigInt(centesimos)

/** Lê texto digitado ("12,3456", "1.234,50", "12.5") em micro-unidades. `null` se não for número. */
export interface DecimalLido {
  micro: bigint
  /** O texto tinha dígitos não nulos além das 6 casas internas (o excedente foi cortado). */
  cortou: boolean
}

export const lerDecimal = (texto: string): DecimalLido | null => {
  let t = texto.trim().replace(/^R\$\s*/, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const m = t.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!m) return null
  const [, sinal, inteiro, fracao = ''] = m
  const dentro = fracao.slice(0, CASAS_INTERNAS).padEnd(CASAS_INTERNAS, '0')
  const micro = BigInt(`${inteiro}${dentro}`) * (sinal ? -BigInt(1) : BigInt(1))
  return { micro, cortou: /[1-9]/.test(fracao.slice(CASAS_INTERNAS)) }
}

/** Quantas casas o valor usa (0 a 6), ignorando zeros à direita. */
export const casasUsadas = (micro: bigint): number => {
  let casas = CASAS_INTERNAS
  let m = micro < BigInt(0) ? -micro : micro
  while (casas > 0 && m % BigInt(10) === BigInt(0)) {
    m /= BigInt(10)
    casas -= 1
  }
  return casas
}

export const truncarMicro = (micro: bigint, casas: number): bigint => {
  const unidade = micro10(casas)
  return (micro / unidade) * unidade // BigInt trunca em direção ao zero
}

export const microParaTexto = (micro: bigint, casas: number): string => {
  const negativo = micro < BigInt(0)
  const absoluto = (negativo ? -micro : micro) / micro10(casas)
  const texto = absoluto.toString().padStart(casas + 1, '0')
  const inteiro = texto.slice(0, texto.length - casas)
  const fracao = casas > 0 ? `.${texto.slice(texto.length - casas)}` : ''
  return `${negativo ? '-' : ''}${inteiro}${fracao}`
}
