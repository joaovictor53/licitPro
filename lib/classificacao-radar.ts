// lib/classificacao-radar.ts
// Classificação do objeto de um edital por nota (porte da ideia do Caçador):
// termos de interesse com peso, exclusões que derrubam a nota e três
// categorias — relevante, talvez e irrelevante. "Talvez" é o que o objeto
// sozinho não decide; esses editais têm os itens consultados e são
// reavaliados (lib/radar-itens.ts).

export type CategoriaRadar = 'relevante' | 'talvez' | 'irrelevante'

export interface TermoPonderado {
  termo: string
  peso: number
}

export interface RegrasClassificacao {
  termos: TermoPonderado[]
  exclusoes: string[]
  /** Nota mínima para "relevante". */
  limiarRelevante: number
  /** Nota mínima para "talvez" (abaixo disso é irrelevante). */
  limiarTalvez: number
}

export interface ResultadoClassificacao {
  categoria: CategoriaRadar
  nota: number
  termosEncontrados: string[]
  exclusaoEncontrada: string | null
}

export const LIMIAR_RELEVANTE_PADRAO = 2
export const LIMIAR_TALVEZ_PADRAO = 1

export const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const escaparRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Termo curto casa só como palavra inteira ("gas" não pode casar com
 * "gasolina"); termo longo casa por trecho, para pegar plural e flexões.
 */
const contemTermo = (textoNormalizado: string, termoNormalizado: string): boolean => {
  if (termoNormalizado === '') return false
  if (termoNormalizado.length > 4) return textoNormalizado.includes(termoNormalizado)
  return new RegExp(`(^|[^a-z0-9])${escaparRegex(termoNormalizado)}([^a-z0-9]|$)`).test(textoNormalizado)
}

/** Palavras-chave simples valem 1; expressões com mais de uma palavra são mais específicas e valem 2. */
export const termosDeBusca = (busca: string[]): TermoPonderado[] =>
  busca
    .map((termo) => termo.trim())
    .filter((termo) => termo !== '')
    .map((termo) => ({ termo, peso: normalizarTexto(termo).includes(' ') ? 2 : 1 }))

export const regrasPadrao = (termos: TermoPonderado[], exclusoes: string[]): RegrasClassificacao => ({
  termos,
  exclusoes,
  limiarRelevante: LIMIAR_RELEVANTE_PADRAO,
  limiarTalvez: LIMIAR_TALVEZ_PADRAO,
})

export const classificarTexto = (texto: string, regras: RegrasClassificacao): ResultadoClassificacao => {
  const alvo = normalizarTexto(texto)

  const exclusao = regras.exclusoes.find((e) => contemTermo(alvo, normalizarTexto(e)))
  if (exclusao) {
    return { categoria: 'irrelevante', nota: 0, termosEncontrados: [], exclusaoEncontrada: exclusao }
  }

  const encontrados = new Map<string, number>()
  for (const { termo, peso } of regras.termos) {
    const chave = normalizarTexto(termo)
    if (!encontrados.has(chave) && contemTermo(alvo, chave)) encontrados.set(chave, peso)
  }

  const nota = [...encontrados.values()].reduce((soma, peso) => soma + peso, 0)
  const categoria: CategoriaRadar =
    nota >= regras.limiarRelevante ? 'relevante' : nota >= regras.limiarTalvez ? 'talvez' : 'irrelevante'

  return { categoria, nota, termosEncontrados: [...encontrados.keys()], exclusaoEncontrada: null }
}
