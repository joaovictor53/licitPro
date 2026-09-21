// lib/texto-blocos.ts
// Helpers de divisão de texto em blocos (preservando página de origem) e de
// chamada à Groq com retentativa — extraídos de app/api/analisar/route.ts
// para serem reaproveitados também pela Leitura do Edital (Fase 2), que
// processa documentos com o mesmo formato de marcação "[[PÁGINA N]]" vindo
// de lib/processar-pdf-servidor.ts.

import Groq, { BadRequestError, RateLimitError } from 'groq-sdk'

// Marcador de página inserido pela extração de PDF (ver lib/processar-pdf-servidor.ts)
export const MARCADOR_PAGINA = /\[\[PÁGINA (\d+)\]\]/

export interface BlocoComPagina {
  texto: string
  pagina: number | null
  indice: number
}

/**
 * Divide o texto (já com marcadores [[PÁGINA N]] intercalados) em blocos por
 * parágrafo, mantendo junto de cada bloco a página de onde ele veio — para
 * que a citação de evidência enviada à IA possa referenciar a página exata
 * do PDF.
 */
export const dividirEmBlocosComPagina = (texto: string): BlocoComPagina[] => {
  const partes = texto.split(new RegExp(`(${MARCADOR_PAGINA.source})`))
  const blocos: BlocoComPagina[] = []
  let paginaAtual: number | null = null
  let indice = 0

  for (const parte of partes) {
    const marcador = parte.match(MARCADOR_PAGINA)
    if (marcador && marcador[0] === parte) {
      paginaAtual = Number(marcador[1])
      continue
    }

    const subBlocos = parte
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 30) // Ignorar blocos muito curtos (cabeçalhos soltos, rodapés)

    for (const sub of subBlocos) {
      blocos.push({ texto: sub, pagina: paginaAtual, indice: indice++ })
    }
  }

  return blocos
}

export const formatarBlocoComPagina = (bloco: BlocoComPagina): string =>
  bloco.pagina !== null ? `[Página ${bloco.pagina}]\n${bloco.texto}` : bloco.texto

/**
 * Extrai as seções mais relevantes de um texto de documento de licitação.
 * Divide o texto em blocos (por parágrafos / linhas em branco) preservando a
 * página de origem de cada um, pontua cada bloco pela presença de palavras-chave
 * relevantes e retorna os blocos mais importantes até o limite de caracteres,
 * prefixados com "[Página N]" para que a IA possa citar a página exata.
 */
export const extrairSecoesCriticas = (
  texto: string,
  palavrasChave: string[],
  limite: number
): string => {
  const blocos = dividirEmBlocosComPagina(texto)

  if (blocos.length === 0) return texto.replace(MARCADOR_PAGINA, '').slice(0, limite)

  const blocosComPontuacao = blocos.map((bloco) => {
    const textoLower = bloco.texto.toLowerCase()
    let pontuacao = 0

    for (const palavra of palavrasChave) {
      if (textoLower.includes(palavra)) {
        pontuacao += 1
        if (textoLower.slice(0, 200).includes(palavra)) {
          pontuacao += 2
        }
      }
    }

    if (bloco.indice < 3) pontuacao += 1

    return { ...bloco, pontuacao }
  })

  const blocosOrdenados = [...blocosComPontuacao].sort((a, b) => b.pontuacao - a.pontuacao)

  const blocosSelecionados: BlocoComPagina[] = []
  let totalCaracteres = 0

  for (const item of blocosOrdenados) {
    if (item.pontuacao === 0) continue
    const formatado = formatarBlocoComPagina(item)
    if (totalCaracteres + formatado.length > limite) {
      const espacoRestante = limite - totalCaracteres
      if (espacoRestante > 200) {
        blocosSelecionados.push({
          ...item,
          texto: item.texto.slice(0, espacoRestante) + '\n[...]',
        })
        totalCaracteres += espacoRestante
      }
      break
    }
    blocosSelecionados.push(item)
    totalCaracteres += formatado.length
  }

  if (blocosSelecionados.length === 0) {
    return texto.replace(MARCADOR_PAGINA, '').slice(0, limite) + '\n\n[DOCUMENTO TRUNCADO]'
  }

  blocosSelecionados.sort((a, b) => a.indice - b.indice)

  const resultado = blocosSelecionados.map(formatarBlocoComPagina).join('\n\n')

  const omitidos = blocos.length - blocosSelecionados.length
  if (omitidos > 0) {
    return resultado + `\n\n[${omitidos} seções omitidas por limite de contexto — apenas seções relevantes foram mantidas]`
  }

  return resultado
}

/**
 * Divide o texto completo em blocos sequenciais de até `tamanhoMaximo`
 * caracteres, SEM descartar conteúdo (ao contrário de extrairSecoesCriticas)
 * — cada bloco vira uma chamada separada à IA num pipeline map-reduce, para
 * que documentos grandes sejam analisados por inteiro em vez de truncados.
 * Repete o último bloco do grupo anterior no início do próximo (pequena
 * sobreposição) para não perder evidências que caiam na fronteira entre dois
 * grupos.
 */
export const dividirEmBlocosSequenciais = (texto: string, tamanhoMaximo: number): string[] => {
  const blocos = dividirEmBlocosComPagina(texto)
  if (blocos.length === 0) return [texto.replace(MARCADOR_PAGINA, '')]

  const grupos: string[][] = []
  let grupoAtual: string[] = []
  let tamanhoAtual = 0

  for (const bloco of blocos) {
    const formatado = formatarBlocoComPagina(bloco)
    if (tamanhoAtual + formatado.length > tamanhoMaximo && grupoAtual.length > 0) {
      grupos.push(grupoAtual)
      const ultimoBloco = grupoAtual[grupoAtual.length - 1]
      grupoAtual = [ultimoBloco]
      tamanhoAtual = ultimoBloco.length
    }
    grupoAtual.push(formatado)
    tamanhoAtual += formatado.length
  }
  if (grupoAtual.length > 0) grupos.push(grupoAtual)

  return grupos.map((grupo) => grupo.join('\n\n'))
}

/** Roda `fn` sobre `itens` com no máximo `limite` execuções simultâneas. */
export const executarComConcorrenciaLimitada = async <T, R>(
  itens: T[],
  limite: number,
  fn: (item: T, indice: number) => Promise<R>
): Promise<R[]> => {
  const resultados: R[] = new Array(itens.length)
  let proximo = 0

  const trabalhadores = new Array(Math.min(limite, itens.length)).fill(null).map(async () => {
    while (proximo < itens.length) {
      const indiceAtual = proximo++
      resultados[indiceAtual] = await fn(itens[indiceAtual], indiceAtual)
    }
  })

  await Promise.all(trabalhadores)
  return resultados
}

interface ParametrosChamadaGroq {
  model: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  maxTokens: number
}

/** Extrai o tempo de espera sugerido pela Groq em mensagens como "tente novamente em 30.96s". */
const extrairEsperaSugeridaMs = (erro: unknown): number | null => {
  if (!(erro instanceof RateLimitError)) return null
  const match = /try again in (\d+(?:\.\d+)?)s/i.exec(erro.message)
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : null
}

/** Chama a Groq com retentativa e backoff exponencial em caso de rate limit (429). */
export const chamarGroqComRetry = async (
  groq: Groq,
  params: ParametrosChamadaGroq,
  tentativasMaximas = 5
): Promise<string> => {
  for (let tentativa = 1; tentativa <= tentativasMaximas; tentativa++) {
    try {
      const resposta = await groq.chat.completions.create({
        model: params.model,
        response_format: { type: 'json_object' },
        max_tokens: params.maxTokens,
        // Modelos de raciocínio (gpt-oss) gastam parte do orçamento de tokens
        // "pensando" antes de gerar o JSON; sem reduzir isso, a resposta pode
        // ser truncada antes do conteúdo e falhar a validação do json_object.
        reasoning_effort: 'low',
        messages: params.messages,
        stream: false,
      })
      return resposta.choices[0]?.message?.content ?? ''
    } catch (erro) {
      const ultimaTentativa = tentativa === tentativasMaximas
      // json_validate_failed: o modelo de raciocínio às vezes esgota o
      // orçamento de tokens "pensando" e não chega a gerar o JSON final —
      // tratamos como transiente e tentamos de novo, igual ao rate limit.
      const falhaJsonTransiente =
        erro instanceof BadRequestError &&
        (erro.error as { error?: { code?: string } } | null)?.error?.code === 'json_validate_failed'
      if ((erro instanceof RateLimitError || falhaJsonTransiente) && !ultimaTentativa) {
        const esperaMs = extrairEsperaSugeridaMs(erro) ?? 2 ** tentativa * 1000
        await new Promise((resolve) => setTimeout(resolve, esperaMs))
        continue
      }
      throw erro
    }
  }
  throw new Error('Falha ao chamar a Groq após múltiplas tentativas.')
}

/**
 * Normaliza texto para comparação tolerante: remove acentos, marcadores de
 * página, pontuação e colapsa espaços. Usado para conferir se uma citação
 * literal realmente existe no documento de origem.
 */
export const normalizarParaComparacao = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (marcas combinantes)
    .replace(/\[\[?pagina \d+\]?\]/gi, ' ') // remove marcadores de página (acento já retirado acima)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Textos de "evidência" que indicam ausência de algo no documento (não são
// citações literais e, portanto, não podem ser conferidos contra o texto).
const PLACEHOLDERS_SEM_CITACAO = [
  'documento não apresentado',
  'nao apresentado',
  'não apresentado',
  'documento ausente',
  'não consta',
  'nao consta',
  'não localizado',
  'nao localizado',
  'ausente',
]

export const ehPlaceholderSemCitacao = (evidencia: string): boolean => {
  const norm = normalizarParaComparacao(evidencia)
  return evidencia.trim() === '' || PLACEHOLDERS_SEM_CITACAO.some((p) => norm.includes(normalizarParaComparacao(p)))
}

/**
 * Verifica se um trecho citado como transcrição literal tem respaldo no texto
 * de origem. Casa o trecho inteiro ou janelas de ~6 palavras (início, meio,
 * fim) para tolerar pequenas diferenças de OCR e cortes na transcrição.
 */
export const evidenciaTemRespaldo = (evidencia: string, textoNormalizado: string): boolean => {
  const alvo = normalizarParaComparacao(evidencia)
  if (alvo.length < 12) return false // curto demais para conferir com segurança
  if (textoNormalizado.includes(alvo)) return true

  const palavras = alvo.split(' ').filter(Boolean)
  const janela = Math.min(6, palavras.length)
  if (janela < 4) return false

  const posicoes = [0, Math.floor((palavras.length - janela) / 2), palavras.length - janela]
  for (const pos of posicoes) {
    if (pos < 0) continue
    const trecho = palavras.slice(pos, pos + janela).join(' ')
    if (trecho.length >= 12 && textoNormalizado.includes(trecho)) return true
  }
  return false
}
