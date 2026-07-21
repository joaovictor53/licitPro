// app/api/analisar/route.ts

import Groq, { RateLimitError } from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/app/src'
import { analise } from '@/app/src/db/schema'
import { obterStatusPlano } from '@/lib/planos-server'
import { processarPdfServidor } from '@/lib/processar-pdf-servidor'
import { NaoConformidade, ResultadoAnalise } from '@/types/analise-tipos'

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021 (Nova Lei de Licitações), da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá dois documentos em texto extraído de PDF:
- DOCUMENTO 1: O EDITAL da licitação
- DOCUMENTO 2: A PROPOSTA e/ou documentação de habilitação do CONCORRENTE que venceu a fase de lances

Sua missão exclusiva é identificar NÃO CONFORMIDADES na documentação do concorrente em relação ao exigido pelo edital.

Os textos dos documentos vêm marcados com trechos no formato "[Página N]" indicando de qual página do PDF original cada passagem foi extraída. Use SEMPRE essas marcações para saber a página exata de cada evidência que você citar.

REGRAS DE ANÁLISE OBRIGATÓRIAS:
1. Cite o número exato do item, subitem ou cláusula do edital que foi descumprido (ex: "Item 8.3.2", "Cláusula 10, alínea b").
2. Descreva EXATAMENTE o que o edital exige e o que o concorrente apresentou (ou deixou de apresentar). Não use linguagem vaga como "documento incompleto" — diga qual documento, qual a exigência específica e por que o apresentado não atende.
3. Para certidões vencidas: informe a data de validade exigida pelo edital e a data de emissão/validade do documento apresentado.
4. Para atestados de capacidade técnica: especifique o objeto do contrato a comprovar, o que o edital pede (quantidade, prazo, especificação técnica) e o que o atestado apresentado comprova.
5. Fundamente cada irregularidade com o artigo de lei mais específico possível (art. X, §Y, inciso Z).
6. Toda evidência citada deve ser uma TRANSCRIÇÃO LITERAL do trecho do documento (copiado exatamente, entre aspas, sem resumir ou parafrasear), acompanhada do número da página onde ele aparece, identificado pela marcação "[Página N]" mais próxima do trecho no texto fornecido. Nunca invente um número de página — se a marcação não estiver disponível no trecho usado, informe "pagina": null.
7. Você receberá um bloco "DADOS DO RECORRENTE" com razão social, CNPJ e endereço da empresa que está recorrendo. Use ESSES DADOS EXATOS (sem alterar) para qualificar o recorrente no "recurso_administrativo", no lugar de placeholders como "[nome do recorrente]", "[endereço completo]" ou "[número do CNPJ]". Se um dado do bloco vier como "não informado", mantenha um placeholder claro apenas para esse dado específico (ex: "[CNPJ não informado]"), nunca para os dados que foram fornecidos.

CATEGORIAS A VERIFICAR:
- Documentos de habilitação ausentes (regularidade fiscal, trabalhista, econômico-financeira, técnica)
- Certidões com validade vencida (CND RFSS, FGTS, CNDT, certidão estadual, certidão municipal)
- Qualificação técnica insuficiente (atestados que não comprovam o objeto, sem acervo técnico adequado)
- Qualificação econômico-financeira (balanço patrimonial, índices de liquidez, capital mínimo)
- Irregularidades no objeto da proposta (especificações técnicas divergentes, preço inexequível)
- Irregularidades cadastrais (SICAF desatualizado, CEIS, CNEP, sanções administrativas)
- Irregularidades formais inabilitadoras (documentos sem assinatura, sem reconhecimento de firma quando exigido, sem vigência)

CLASSIFICAÇÃO:
- "material": vício insanável que fundamenta inabilitação imediata (ex: documento ausente, validade vencida não sanável, qualificação técnica não comprovada)
- "sanável": vício formal que pode ser corrigido por diligência nos termos do art. 64 da Lei 14.133/2021

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown. Use EXATAMENTE este formato:

{
  "resumo": "resumo objetivo em 2-3 frases descrevendo o número de irregularidades, as mais graves e a conclusão sobre a habilitação",
  "total_irregularidades": 0,
  "nao_conformidades": [
    {
      "id": 1,
      "titulo": "nome curto e descritivo da irregularidade (ex: CND Federal vencida)",
      "item_edital": "número exato do item/cláusula do edital (ex: Item 7.2, alínea c)",
      "problema": "descrição DETALHADA e ESPECÍFICA: o que o edital exige, o que foi apresentado ou está ausente, e por que não atende ao requisito",
      "evidencia": "transcrição LITERAL, entre aspas, do trecho exato do documento do concorrente que evidencia o problema (copiado sem alterações do texto fornecido), ou 'Documento não apresentado' se ausente",
      "pagina": "número inteiro da página do documento do concorrente onde a evidência citada em 'evidencia' se encontra, identificado pela marcação [Página N] mais próxima no texto fornecido; use null se a evidência não vier de uma página identificável (ex: documento ausente)",
      "recomendacao": "argumento jurídico específico a usar no recurso administrativo para fundamentar este ponto",
      "gravidade": "material",
      "fundamento_legal": "artigo, parágrafo e inciso exatos da lei aplicável"
    }
  ],
  "recurso_administrativo": "texto completo e formal do recurso administrativo, com: (1) qualificação do recorrente, (2) tempestividade, (3) fundamentos fáticos detalhados de cada irregularidade com citação de evidências, (4) fundamentos jurídicos com artigos de lei, (5) pedido expresso de inabilitação e, subsidiariamente, de diligência, (6) encerramento formal com local, data e assinatura",
  "mensagem_pregoeiro": "mensagem direta, objetiva e respeitosa ao pregoeiro declarando intenção de recorrer e apontando os pontos irregulares de forma numerada"
}`

// Usado quando o documento do concorrente precisa ser dividido em vários blocos
// (map-reduce) — cada chamada analisa só um bloco e devolve apenas as não
// conformidades encontradas nele, sem redigir recurso/mensagem ainda.
const SYSTEM_PROMPT_MAPA = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021 (Nova Lei de Licitações), da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá o EDITAL (seções relevantes) e um TRECHO da documentação do CONCORRENTE — apenas uma parte do documento completo, já que ele foi dividido em vários blocos por ser muito extenso para uma única análise. Analise SOMENTE este trecho em busca de não conformidades em relação ao edital.

Os textos vêm marcados com trechos no formato "[Página N]" indicando de qual página do PDF original cada passagem foi extraída. Use SEMPRE essas marcações para a página exata de cada evidência.

REGRAS DE ANÁLISE OBRIGATÓRIAS:
1. Cite o número exato do item, subitem ou cláusula do edital que foi descumprido.
2. Descreva EXATAMENTE o que o edital exige e o que o concorrente apresentou (ou deixou de apresentar), sem linguagem vaga.
3. Para certidões vencidas: informe a data de validade exigida e a data de emissão/validade apresentada.
4. Para atestados de capacidade técnica: especifique o objeto, o que o edital pede e o que o atestado comprova.
5. Fundamente cada irregularidade com o artigo de lei mais específico possível.
6. Toda evidência deve ser uma TRANSCRIÇÃO LITERAL, entre aspas, com o número da página pela marcação "[Página N]" mais próxima. Nunca invente página — use "pagina": null se não identificável.
7. Se este trecho não contiver nenhuma não conformidade, devolva um array vazio — não invente problemas para preencher a resposta.

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, EXATAMENTE neste formato:

{
  "nao_conformidades": [
    {
      "id": 1,
      "titulo": "nome curto e descritivo da irregularidade",
      "item_edital": "número exato do item/cláusula do edital",
      "problema": "descrição DETALHADA e ESPECÍFICA do que o edital exige e do que falhou",
      "evidencia": "transcrição LITERAL do trecho do documento do concorrente, ou 'Documento não apresentado' se ausente",
      "pagina": "número inteiro da página onde a evidência se encontra, ou null",
      "recomendacao": "argumento jurídico específico para o recurso administrativo",
      "gravidade": "material",
      "fundamento_legal": "artigo, parágrafo e inciso exatos da lei aplicável"
    }
  ]
}`

// Usado na etapa final do map-reduce: recebe a lista já consolidada de não
// conformidades (encontradas nas etapas anteriores) e só redige o resumo, o
// recurso administrativo e a mensagem ao pregoeiro — não reavalia os achados.
const SYSTEM_PROMPT_SINTESE = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021, da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá uma lista JÁ CONSOLIDADA de não conformidades encontradas na documentação de um concorrente (fruto de uma análise anterior, dividida em partes) e um bloco "DADOS DO RECORRENTE" com razão social, CNPJ e endereço.

Sua tarefa é EXCLUSIVAMENTE:
1. Escrever um "resumo" objetivo em 2-3 frases sobre o conjunto de irregularidades e a conclusão sobre a habilitação.
2. Redigir o "recurso_administrativo" completo e formal, com: (1) qualificação do recorrente usando EXATAMENTE os dados de "DADOS DO RECORRENTE" (sem alterar; se um dado vier como "não informado", use um placeholder claro só para esse dado específico), (2) tempestividade, (3) fundamentos fáticos de cada irregularidade da lista com citação das evidências fornecidas, (4) fundamentos jurídicos com os artigos de lei já fornecidos em cada item, (5) pedido expresso de inabilitação e, subsidiariamente, de diligência, (6) encerramento formal com local, data e assinatura.
3. Redigir a "mensagem_pregoeiro": mensagem direta, objetiva e respeitosa ao pregoeiro declarando intenção de recorrer e apontando os pontos de forma numerada.

NÃO invente novas não conformidades além das fornecidas na lista. NÃO remova itens da lista.

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois, sem markdown, EXATAMENTE neste formato:

{
  "resumo": "...",
  "recurso_administrativo": "...",
  "mensagem_pregoeiro": "..."
}`

// ── Limites de caracteres ajustados para o plano gratuito do Groq (12k TPM) ──
// System prompt ≈ 1.000 tokens, resposta max = 2.048 tokens → sobram ~8.900 tokens para input
// Ajustar esta constante quando o tier da Groq mudar (mais TPM permite blocos maiores
// e, consequentemente, menos chamadas por análise em documentos grandes).
const LIMITE_POR_DOCUMENTO = 3_500

// Quantos blocos do concorrente são analisados em paralelo no pipeline map-reduce
// (documentos grandes). Limitado para não estourar o RPM (requisições por minuto) da Groq.
const CONCORRENCIA_MAX_BLOCOS = 3

// Palavras-chave que identificam seções críticas em editais de licitação
const PALAVRAS_CHAVE_EDITAL = [
  'habilitação', 'habilita', 'inabilitação',
  'qualificação técnica', 'qualificação econômico', 'qualificação econômica',
  'regularidade fiscal', 'regularidade trabalhista',
  'documentação', 'documentos de habilitação', 'documentos exigidos',
  'certidão', 'certidões', 'cnd', 'fgts', 'cndt',
  'atestado', 'capacidade técnica', 'acervo técnico',
  'balanço patrimonial', 'capital social', 'patrimônio líquido',
  'índice de liquidez', 'liquidez geral', 'liquidez corrente',
  'proposta', 'proposta de preço', 'proposta comercial',
  'objeto', 'especificação', 'especificações técnicas',
  'sicaf', 'cadastro', 'ceis', 'cnep',
  'prazo de validade', 'vigência', 'validade',
  'penalidade', 'sanção', 'impedimento',
  'microempresa', 'empresa de pequeno porte', 'me/epp',
  'subcontratação', 'consórcio',
  'amostra', 'prova de conceito',
  'inabilitará', 'desclassificação', 'desclassificará',
  'diligência', 'saneamento',
]

// Marcador de página inserido pela extração de PDF (ver lib/processar-pdf-servidor.ts)
const MARCADOR_PAGINA = /\[\[PÁGINA (\d+)\]\]/

interface BlocoComPagina {
  texto: string
  pagina: number | null
  indice: number
}

/**
 * Divide o texto (já com marcadores [[PÁGINA N]] intercalados) em blocos por
 * parágrafo, mantendo junto de cada bloco a página de onde ele veio — para que
 * a citação de evidência enviada à IA possa referenciar a página exata do PDF.
 */
const dividirEmBlocosComPagina = (texto: string): BlocoComPagina[] => {
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
      .map(b => b.trim())
      .filter(b => b.length > 30) // Ignorar blocos muito curtos (cabeçalhos soltos, rodapés)

    for (const sub of subBlocos) {
      blocos.push({ texto: sub, pagina: paginaAtual, indice: indice++ })
    }
  }

  return blocos
}

const formatarBlocoComPagina = (bloco: BlocoComPagina): string =>
  bloco.pagina !== null ? `[Página ${bloco.pagina}]\n${bloco.texto}` : bloco.texto

/**
 * Extrai as seções mais relevantes de um texto de documento de licitação.
 * Divide o texto em blocos (por parágrafos / linhas em branco) preservando a
 * página de origem de cada um, pontua cada bloco pela presença de palavras-chave
 * relevantes e retorna os blocos mais importantes até o limite de caracteres,
 * prefixados com "[Página N]" para que a IA possa citar a página exata.
 */
const extrairSecoesCriticas = (
  texto: string,
  palavrasChave: string[],
  limite: number
): string => {
  const blocos = dividirEmBlocosComPagina(texto)

  if (blocos.length === 0) return texto.replace(MARCADOR_PAGINA, '').slice(0, limite)

  // Pontuar cada bloco
  const blocosComPontuacao = blocos.map((bloco) => {
    const textoLower = bloco.texto.toLowerCase()
    let pontuacao = 0

    for (const palavra of palavrasChave) {
      if (textoLower.includes(palavra)) {
        pontuacao += 1
        // Bônus extra se a palavra aparece no início (provável título de seção)
        if (textoLower.slice(0, 200).includes(palavra)) {
          pontuacao += 2
        }
      }
    }

    // Blocos do início do documento recebem um bônus leve (dados gerais do edital/empresa)
    if (bloco.indice < 3) pontuacao += 1

    return { ...bloco, pontuacao }
  })

  // Ordenar por pontuação (maior primeiro)
  const blocosOrdenados = [...blocosComPontuacao].sort((a, b) => b.pontuacao - a.pontuacao)

  // Selecionar blocos até atingir o limite, mantendo a ordem original
  const blocosSelecionados: BlocoComPagina[] = []
  let totalCaracteres = 0

  for (const item of blocosOrdenados) {
    if (item.pontuacao === 0) continue // Ignorar blocos sem relevância alguma
    const formatado = formatarBlocoComPagina(item)
    if (totalCaracteres + formatado.length > limite) {
      // Se ainda temos espaço, tentar encaixar um trecho do bloco
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

  // Se nenhum bloco foi relevante, pegar o início do documento
  if (blocosSelecionados.length === 0) {
    return texto.replace(MARCADOR_PAGINA, '').slice(0, limite) + '\n\n[DOCUMENTO TRUNCADO]'
  }

  // Reordenar pela posição original para manter a coerência do texto
  blocosSelecionados.sort((a, b) => a.indice - b.indice)

  const resultado = blocosSelecionados.map(formatarBlocoComPagina).join('\n\n')

  const omitidos = blocos.length - blocosSelecionados.length
  if (omitidos > 0) {
    return resultado + `\n\n[${omitidos} seções omitidas por limite de contexto — apenas seções relevantes para habilitação e conformidade foram mantidas]`
  }

  return resultado
}

/**
 * Divide o texto completo do concorrente em blocos sequenciais de até
 * `tamanhoMaximo` caracteres, SEM descartar conteúdo (ao contrário de
 * extrairSecoesCriticas) — cada bloco vira uma chamada separada à IA no
 * pipeline map-reduce, para que documentos grandes sejam analisados por
 * inteiro em vez de truncados. Repete o último bloco do grupo anterior no
 * início do próximo (pequena sobreposição) para não perder evidências que
 * caiam exatamente na fronteira entre dois grupos.
 */
const dividirEmBlocosSequenciais = (texto: string, tamanhoMaximo: number): string[] => {
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
const executarComConcorrenciaLimitada = async <T, R>(
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

/** Chama a Groq com retentativa e backoff exponencial em caso de rate limit (429). */
const chamarGroqComRetry = async (
  groq: Groq,
  params: ParametrosChamadaGroq,
  tentativasMaximas = 3
): Promise<string> => {
  for (let tentativa = 1; tentativa <= tentativasMaximas; tentativa++) {
    try {
      const resposta = await groq.chat.completions.create({
        model: params.model,
        response_format: { type: 'json_object' },
        max_tokens: params.maxTokens,
        messages: params.messages,
        stream: false,
      })
      return resposta.choices[0]?.message?.content ?? ''
    } catch (erro) {
      const ultimaTentativa = tentativa === tentativasMaximas
      if (erro instanceof RateLimitError && !ultimaTentativa) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** tentativa * 1000))
        continue
      }
      throw erro
    }
  }
  throw new Error('Falha ao chamar a Groq após múltiplas tentativas.')
}

/** Remove não conformidades duplicadas (mesma cláusula do edital + título semelhante). */
const deduplicarNaoConformidades = (itens: NaoConformidade[]): NaoConformidade[] => {
  const vistos = new Map<string, NaoConformidade>()

  for (const item of itens) {
    const chave = `${item.item_edital}|${item.titulo}`.trim().toLowerCase()
    const existente = vistos.get(chave)
    // Preferir a versão com página identificada, se houver duplicidade
    if (!existente || (existente.pagina == null && item.pagina != null)) {
      vistos.set(chave, item)
    }
  }

  return Array.from(vistos.values()).map((item, indice) => ({ ...item, id: indice + 1 }))
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
      return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 })
    }

    const statusPlano = await obterStatusPlano(
      session.user.id,
      session.user.plano,
      session.user.trialExpiresAt,
      session.user.role
    )

    if (!statusPlano.permitido) {
      const erro =
        statusPlano.motivo === 'trial_expirado'
          ? 'Seu período de teste expirou. Assine um plano para continuar usando o LicitPro Analyzer.'
          : statusPlano.plano === 'gratis'
            ? `Você já utilizou a análise do plano ${statusPlano.nomePlano}. Assine um plano para continuar.`
            : `Você atingiu o limite de ${statusPlano.limite} análises mensais do plano ${statusPlano.nomePlano}. Faça upgrade para continuar.`
      return NextResponse.json({ erro }, { status: 403 })
    }

    const formData = await request.formData()
    const editalArquivo = formData.get('edital')
    const concorrenteArquivo = formData.get('concorrente')
    const nomeEdital = formData.get('nomeEdital')?.toString() ?? ''
    const nomeProposta = formData.get('nomeProposta')?.toString() ?? ''

    if (!(editalArquivo instanceof File) || !(concorrenteArquivo instanceof File)) {
      return NextResponse.json(
        { erro: 'É necessário enviar os dois arquivos PDF (edital e proposta do concorrente).' },
        { status: 400 }
      )
    }

    // Extração de texto + OCR (para páginas escaneadas) rodam no servidor —
    // ver lib/processar-pdf-servidor.ts.
    let editalPdf, concorrentePdf
    try {
      ;[editalPdf, concorrentePdf] = await Promise.all([
        processarPdfServidor(Buffer.from(await editalArquivo.arrayBuffer())),
        processarPdfServidor(Buffer.from(await concorrenteArquivo.arrayBuffer())),
      ])
    } catch (erroExtracao) {
      console.error('Erro ao processar PDF:', erroExtracao)
      return NextResponse.json(
        { erro: 'Não foi possível ler um dos PDFs. Verifique se o arquivo não está corrompido.' },
        { status: 422 }
      )
    }

    const editalTexto = editalPdf.text
    const concorrenteTexto = concorrentePdf.text

    // Verificação de segurança: mesmo com OCR, o documento pode não ter
    // nenhum conteúdo legível (ex: página em branco, digitalização ilegível).
    if (editalTexto.replace(MARCADOR_PAGINA, '').trim().length < 100) {
      return NextResponse.json(
        { erro: 'Não foi possível extrair conteúdo legível do edital, mesmo com OCR. Verifique a qualidade do arquivo.' },
        { status: 422 }
      )
    }
    if (concorrenteTexto.replace(MARCADOR_PAGINA, '').trim().length < 100) {
      return NextResponse.json(
        { erro: 'Não foi possível extrair conteúdo legível da proposta do concorrente, mesmo com OCR. Verifique a qualidade do arquivo.' },
        { status: 422 }
      )
    }

    // Seções mais relevantes do edital (a "régua" de exigências — resumir aqui
    // tem risco muito menor do que resumir a documentação do concorrente,
    // que é de onde vêm as evidências literais citadas no recurso).
    const editalFiltrado = extrairSecoesCriticas(editalTexto, PALAVRAS_CHAVE_EDITAL, LIMITE_POR_DOCUMENTO)

    // Dados cadastrais do usuário (recorrente), para auto-preencher o recurso e a
    // mensagem ao pregoeiro em vez de deixar placeholders vazios.
    const dadosRecorrente = [
      `Razão social: ${session.user.razaoSocial?.trim() || 'não informado'}`,
      `CNPJ: ${session.user.cnpj?.trim() || 'não informado'}`,
      `Endereço: ${session.user.endereco?.trim() || 'não informado'}`,
    ].join('\n')

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Documento do concorrente não pode ser truncado (é dele que vêm as
    // evidências literais) — divide-se em blocos sequenciais e, se houver mais
    // de um, cada bloco é analisado numa chamada separada (map-reduce).
    const blocosConcorrente = dividirEmBlocosSequenciais(concorrenteTexto, LIMITE_POR_DOCUMENTO)

    let resultado: ResultadoAnalise

    if (blocosConcorrente.length <= 1) {
      // Caminho simples (documento cabe em uma única chamada) — sem overhead extra.
      const userMessage = [
        '=== DADOS DO RECORRENTE ===',
        dadosRecorrente,
        '',
        `=== DOCUMENTO 1: EDITAL (${editalPdf.numpages} páginas — seções relevantes extraídas) ===`,
        editalFiltrado,
        '',
        `=== DOCUMENTO 2: PROPOSTA DO CONCORRENTE (${concorrentePdf.numpages} páginas) ===`,
        blocosConcorrente[0] ?? '',
        '',
        'Analise os documentos acima e retorne APENAS o JSON com as não conformidades encontradas.',
      ].join('\n')

      const rawText = await chamarGroqComRetry(groq, {
        model: 'llama-3.3-70b-versatile',
        maxTokens: 2048,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      })

      resultado = JSON.parse(rawText)
    } else {
      // Documento grande: mapear (analisar cada bloco) e depois reduzir
      // (consolidar achados e só então redigir recurso/mensagem).
      const respostasPorBloco = await executarComConcorrenciaLimitada(
        blocosConcorrente,
        CONCORRENCIA_MAX_BLOCOS,
        async (bloco, indice) => {
          const userMessage = [
            `=== EDITAL (seções relevantes) ===`,
            editalFiltrado,
            '',
            `=== TRECHO ${indice + 1} DE ${blocosConcorrente.length} DA PROPOSTA DO CONCORRENTE ===`,
            bloco,
            '',
            'Analise APENAS este trecho e retorne o JSON com as não conformidades encontradas nele.',
          ].join('\n')

          const rawText = await chamarGroqComRetry(groq, {
            model: 'llama-3.3-70b-versatile',
            maxTokens: 1536,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT_MAPA },
              { role: 'user', content: userMessage },
            ],
          })

          try {
            const parcial = JSON.parse(rawText) as { nao_conformidades?: NaoConformidade[] }
            return parcial.nao_conformidades ?? []
          } catch {
            console.error(`Falha ao interpretar resposta do bloco ${indice + 1}/${blocosConcorrente.length}`)
            return []
          }
        }
      )

      const naoConformidades = deduplicarNaoConformidades(respostasPorBloco.flat())

      const userMessageSintese = [
        '=== DADOS DO RECORRENTE ===',
        dadosRecorrente,
        '',
        '=== NÃO CONFORMIDADES CONSOLIDADAS ===',
        JSON.stringify(naoConformidades, null, 2),
        '',
        'Redija o resumo, o recurso administrativo e a mensagem ao pregoeiro com base na lista acima.',
      ].join('\n')

      const rawTextSintese = await chamarGroqComRetry(groq, {
        model: 'llama-3.3-70b-versatile',
        maxTokens: 2048,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_SINTESE },
          { role: 'user', content: userMessageSintese },
        ],
      })

      const sintese = JSON.parse(rawTextSintese) as {
        resumo: string
        recurso_administrativo: string
        mensagem_pregoeiro: string
      }

      resultado = {
        resumo: sintese.resumo,
        total_irregularidades: naoConformidades.length,
        nao_conformidades: naoConformidades,
        recurso_administrativo: sintese.recurso_administrativo,
        mensagem_pregoeiro: sintese.mensagem_pregoeiro,
      }
    }

    // Persistir análise no banco (falha não quebra a resposta)
    let analiseId: string | null = null
    try {
      const totalMaterial = resultado.nao_conformidades.filter(
        (nc) => nc.gravidade === 'material'
      ).length
      const totalSanavel = resultado.nao_conformidades.filter(
        (nc) => nc.gravidade === 'sanável'
      ).length

      const [registro] = await db.insert(analise).values({
        userId: session.user.id,
        nomeEdital: nomeEdital || 'Edital sem nome',
        nomeProposta: nomeProposta || 'Proposta sem nome',
        resumo: resultado.resumo,
        totalIrregularidades: resultado.total_irregularidades,
        totalMaterial,
        totalSanavel,
        resultado,
      }).returning({ id: analise.id })

      analiseId = registro?.id ?? null
    } catch (errSalvar) {
      console.error('Erro ao salvar análise no banco:', errSalvar)
    }

    return NextResponse.json({ ...resultado, analiseId })
  } catch (error) {
    console.error('Erro na análise:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { erro: 'A resposta da IA não pôde ser interpretada. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { erro: 'Erro interno ao processar os documentos.' },
      { status: 500 }
    )
  }
}
