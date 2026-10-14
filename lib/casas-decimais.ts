// lib/casas-decimais.ts
// Casas decimais do preço, LIDAS do edital (com página e item) — nunca um padrão universal.
// Portado de app/regra_casas_decimais.py do Proposta Certa.
//
// O edital diz quantas casas o preço tem ("com duas casas decimais depois da vírgula")
// e, às vezes, o que fazer com o excesso ("somente serão consideradas as duas primeiras"
// = TRUNCAR, sem arredondar). Sem regra no edital vale o padrão: preço unitário com no
// máximo 2 casas — mais que isso é RECUSADO, nunca arredondado em silêncio.
//
// Sem IA: leitura determinística por expressões regulares, com citação do trecho.

import { dividirEmBlocosComPagina } from '@/lib/texto-blocos'
import { normalizarParaBusca } from '@/lib/normalizar-busca'
import { casasUsadas, lerDecimal, microParaTexto, truncarMicro } from '@/lib/dinheiro'

export const CASAS_PADRAO = 2
export const MAXIMO_DE_CASAS = 6

export interface ReferenciaEdital {
  pagina: number | null
  item: string | null
  trecho: string
}

export interface RegraCasasDecimais {
  casas: number
  /** 'maximo': até N casas, o excesso é recusado. 'truncar': só as N primeiras valem. */
  modo: 'maximo' | 'truncar'
  /** O edital cita números diferentes (ou só um mínimo): o operador confere. */
  conferir: boolean
  referencia: ReferenciaEdital
}

const NUMEROS_POR_EXTENSO: Record<string, number> = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 }
const NUM = '(\\d{1,2}|uma|um|duas|dois|tres|quatro|cinco|seis)'
// "duas casas decimais", "três casas após a vírgula", "duas casas depois da vírgula"
const RE_CASAS = new RegExp(`${NUM}\\s*(?:\\(\\w+\\)\\s*)?casas?\\s+(?:decimais?|(?:apos|depois)\\s+(?:d?[ao]\\s+)?virgula)`, 'g')
const RE_TRUNCAR = new RegExp(
  `(?:somente|apenas|so|tao somente)\\s+(?:serao|sera|sao|ser)?\\s*(?:considerad\\w+\\s+)?(?:as\\s+)?${NUM}\\s+primeiras?(?:\\s+casas?(?:\\s+decimais?)?)?|` +
    `(?:considerar|considerad\\w+|valer\\w*)\\s+(?:apenas|somente)\\s+(?:as\\s+)?${NUM}\\s+(?:primeiras\\s+)?casas?|` +
    'desprezad\\w+\\s+(?:todas\\s+)?as\\s+demais'
)
// Palavras INTEIRAS que mostram que as casas são do PREÇO (não vale "realizado" por causa de "real").
const RE_PRECO = /\b(?:precos?|valor(?:es)?|lances?|propostas?|unitari[oa]s?|moeda|reais|real|cotad[oa]s?|cotacao|centavos)\b|r\$/
// Casas de desconto, percentual, índice ou taxa NÃO são as do preço unitário.
const RE_NAO_PRECO = /\b(?:descontos?|percentuais?|percentagem|indices?|liquidez|taxas?|coeficientes?|fatores?|margens?|reajustes?|quantidades?)\b|%/
const JANELA = 200

const numeroDe = (token: string | undefined): number | null => {
  if (!token) return null
  const t = token.trim().toLowerCase()
  const n = /^\d+$/.test(t) ? Number(t) : NUMEROS_POR_EXTENSO[t]
  return n != null && n >= 0 && n <= MAXIMO_DE_CASAS ? n : null
}

const casasSaoDoPreco = (norma: string, inicio: number, fim: number): boolean => {
  const janela = norma.slice(Math.max(0, inicio - JANELA), fim + JANELA)
  if (!RE_PRECO.test(janela)) return false
  return janela.includes('unitari') || !RE_NAO_PRECO.test(janela)
}

/** Quando o trecho fala de DUAS regras ("total com duas casas; unitário com até seis"), vale a junto de "unitário". */
const mencaoDoPrecoUnitario = (norma: string, mencoes: RegExpExecArray[]): RegExpExecArray => {
  let melhor = mencoes[0]
  let melhorPontos: number | null = null
  let fimAnterior = 0
  for (const m of mencoes) {
    const antes = norma.slice(Math.max(fimAnterior, m.index - 120), m.index)
    const pontos = antes.includes('unitari') ? 1 : /\b(?:total|global)\b/.test(antes) ? -1 : 0
    if (melhorPontos === null || pontos > melhorPontos) {
      melhor = m
      melhorPontos = pontos
    }
    fimAnterior = m.index + m[0].length
  }
  return melhor
}

interface Achado {
  casas: number
  pagina: number | null
  item: string | null
  texto: string
  trunca: boolean
  soMinimo: boolean
}

/** A regra de casas decimais do preço escrita no edital, com página e trecho; `null` se o texto não fala de casas. */
export const sugerirNoTexto = (textoEdital: string): RegraCasasDecimais | null => {
  const achados: Achado[] = []

  for (const bloco of dividirEmBlocosComPagina(textoEdital ?? '')) {
    const norma = normalizarParaBusca(bloco.texto)
    if (!norma.includes('casa') || (!norma.includes('decima') && !norma.includes('virgula'))) continue

    const doPreco = [...norma.matchAll(RE_CASAS)].filter(
      (m) => casasSaoDoPreco(norma, m.index!, m.index! + m[0].length) && numeroDe(m[1]) !== null
    )
    const escolhida = doPreco.length ? mencaoDoPrecoUnitario(norma, doPreco) : null
    const casas = escolhida ? numeroDe(escolhida[1]) : null
    // "no mínimo três casas" não é teto: o sistema não sabe o limite de cima, então manda conferir.
    const soMinimo =
      escolhida !== null && /\b(?:minimo|minimas?|pelo menos|ao menos)\b/.test(norma.slice(Math.max(0, escolhida.index - 30), escolhida.index))

    let trunca = RE_TRUNCAR.exec(norma)
    if (trunca && !casasSaoDoPreco(norma, trunca.index, trunca.index + trunca[0].length)) trunca = null
    const casasTrunca = trunca ? trunca.slice(1).map(numeroDe).find((n) => n !== null) ?? null : null

    if (casas === null && casasTrunca === null) continue
    achados.push({
      casas: (casasTrunca ?? casas)!,
      pagina: bloco.pagina,
      item: bloco.texto.match(/^(\d+(?:\.\d+)*)[.)]?\s/)?.[1] ?? null,
      texto: bloco.texto,
      trunca: trunca !== null,
      soMinimo,
    })
  }

  if (!achados.length) return null
  // Prefere o bloco que manda truncar: é o que diz o que fazer com o excesso.
  const escolhido = achados.find((a) => a.trunca) ?? achados[0]
  const distintos = new Set(achados.map((a) => a.casas))
  return {
    casas: escolhido.casas,
    modo: escolhido.trunca ? 'truncar' : 'maximo',
    conferir: distintos.size > 1 || escolhido.soMinimo,
    referencia: { pagina: escolhido.pagina, item: escolhido.item, trecho: escolhido.texto.slice(0, 500) },
  }
}

export const casasDaRegra = (regra: RegraCasasDecimais | null): number => regra?.casas ?? CASAS_PADRAO

const ondeEstaNoEdital = (regra: RegraCasasDecimais): string =>
  `${regra.referencia.pagina != null ? `pág. ${regra.referencia.pagina}` : 'edital'}${regra.referencia.item ? `, item ${regra.referencia.item}` : ''}`

export interface ResultadoCasas {
  /** Valor a usar, como texto decimal ("12.34"); `null` = recusado (veja `mensagem`). */
  valor: string | null
  /** Recusa, ou aviso de que o valor foi truncado e o operador precisa saber. */
  mensagem: string
}

/**
 * Aplica a regra ao valor DIGITADO (texto, para não perder casas que o `number` esconderia).
 * Nunca arredonda em silêncio: ou cabe, ou é truncado dizendo-se isso, ou é recusado.
 */
export const aplicarRegra = (digitado: string, regra: RegraCasasDecimais | null): ResultadoCasas => {
  const lido = lerDecimal(digitado)
  if (!lido) return { valor: null, mensagem: 'Informe um valor numérico válido.' }

  const casas = casasDaRegra(regra)
  const excede = lido.cortou || casasUsadas(lido.micro) > casas
  if (!excede) return { valor: microParaTexto(lido.micro, Math.max(casasUsadas(lido.micro), 0)), mensagem: '' }

  if (regra?.modo === 'truncar') {
    const cortado = truncarMicro(lido.micro, casas)
    return {
      valor: microParaTexto(cortado, casas),
      mensagem:
        `O edital manda considerar só as ${casas} primeiras casas decimais (${ondeEstaNoEdital(regra)}): ` +
        `o valor ${digitado.trim()} vale ${microParaTexto(cortado, casas)} (as demais casas são desprezadas, sem arredondar).`,
    }
  }

  const origem = regra ? ` (edital, ${ondeEstaNoEdital(regra)})` : ' (padrão do sistema: o edital não diz quantas casas)'
  return { valor: null, mensagem: `O preço tem mais de ${casas} casas decimais${origem}; informe com no máximo ${casas} casas.` }
}

/** Preço unitário no padrão brasileiro, com pelo menos 2 casas e até `casas`, para o preço de 3 ou 4 casas aparecer completo. */
export const formatarPrecoUnitario = (valor: number | null, casas = CASAS_PADRAO): string => {
  if (valor == null) return ''
  const maximo = Math.max(2, Math.min(casas, MAXIMO_DE_CASAS))
  const lido = lerDecimal(String(valor))
  if (!lido) return ''
  const usadas = Math.max(2, Math.min(casasUsadas(lido.micro), maximo))
  const [inteiro, fracao] = microParaTexto(truncarMicro(lido.micro, usadas), usadas).split('.')
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${comMilhar},${fracao}`
}

/** Texto curto para a tela: o que vale e de onde vem. */
export const descreverRegra = (regra: RegraCasasDecimais | null): string => {
  if (!regra) {
    return (
      'Casas decimais: o edital lido não diz quantas — vale o padrão do sistema ' +
      '(preço unitário com no máximo 2 casas, mais que isso é recusado; total do item arredondado para centavos, metade para cima).'
    )
  }
  const oQue = regra.modo === 'truncar' ? `as ${regra.casas} primeiras casas valem e as demais são desprezadas` : `até ${regra.casas} casas decimais`
  return `Casas decimais do preço (edital, ${ondeEstaNoEdital(regra)}): ${oQue}.${regra.conferir ? ' O edital cita números diferentes — confira.' : ''}`
}
