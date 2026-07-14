// app/api/analisar/route.ts

import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/app/src'
import { analise } from '@/app/src/db/schema'
import { obterStatusPlano } from '@/lib/planos-server'
import { ResultadoAnalise } from '@/types/analise-tipos'

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021 (Nova Lei de Licitações), da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá dois documentos em texto extraído de PDF:
- DOCUMENTO 1: O EDITAL da licitação
- DOCUMENTO 2: A PROPOSTA e/ou documentação de habilitação do CONCORRENTE que venceu a fase de lances

Sua missão exclusiva é identificar NÃO CONFORMIDADES na documentação do concorrente em relação ao exigido pelo edital.

REGRAS DE ANÁLISE OBRIGATÓRIAS:
1. Cite o número exato do item, subitem ou cláusula do edital que foi descumprido (ex: "Item 8.3.2", "Cláusula 10, alínea b").
2. Descreva EXATAMENTE o que o edital exige e o que o concorrente apresentou (ou deixou de apresentar). Não use linguagem vaga como "documento incompleto" — diga qual documento, qual a exigência específica e por que o apresentado não atende.
3. Para certidões vencidas: informe a data de validade exigida pelo edital e a data de emissão/validade do documento apresentado.
4. Para atestados de capacidade técnica: especifique o objeto do contrato a comprovar, o que o edital pede (quantidade, prazo, especificação técnica) e o que o atestado apresentado comprova.
5. Fundamente cada irregularidade com o artigo de lei mais específico possível (art. X, §Y, inciso Z).

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
      "evidencia": "transcrição ou resumo da passagem relevante do documento do concorrente que evidencia o problema, ou 'Documento não apresentado' se ausente",
      "recomendacao": "argumento jurídico específico a usar no recurso administrativo para fundamentar este ponto",
      "gravidade": "material",
      "fundamento_legal": "artigo, parágrafo e inciso exatos da lei aplicável"
    }
  ],
  "recurso_administrativo": "texto completo e formal do recurso administrativo, com: (1) qualificação do recorrente, (2) tempestividade, (3) fundamentos fáticos detalhados de cada irregularidade com citação de evidências, (4) fundamentos jurídicos com artigos de lei, (5) pedido expresso de inabilitação e, subsidiariamente, de diligência, (6) encerramento formal com local, data e assinatura",
  "mensagem_pregoeiro": "mensagem direta, objetiva e respeitosa ao pregoeiro declarando intenção de recorrer e apontando os pontos irregulares de forma numerada"
}`

// ── Limites de caracteres ajustados para o plano gratuito do Groq (12k TPM) ──
// System prompt ≈ 1.000 tokens, resposta max = 2.048 tokens → sobram ~8.900 tokens para input
// Para garantir que não passe, reduzindo ainda mais o limite de caracteres:
const LIMITE_POR_DOCUMENTO = 3_500

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

// Palavras-chave para seções importantes na proposta do concorrente
const PALAVRAS_CHAVE_CONCORRENTE = [
  'cnpj', 'razão social', 'nome empresarial',
  'certidão', 'certificado', 'cnd', 'fgts', 'cndt',
  'atestado', 'capacidade técnica', 'acervo',
  'balanço', 'demonstração', 'patrimônio', 'capital social',
  'proposta', 'preço', 'valor', 'total', 'unitário',
  'validade', 'vigência', 'data de emissão', 'vencimento',
  'declaração', 'procuração', 'contrato social',
  'sicaf', 'registro', 'inscrição',
  'responsável técnico', 'crea', 'cau', 'crm',
  'marca', 'modelo', 'fabricante', 'especificação',
]

/**
 * Extrai as seções mais relevantes de um texto de documento de licitação.
 * Divide o texto em blocos (por parágrafos / linhas em branco),
 * pontua cada bloco pela presença de palavras-chave relevantes e
 * retorna os blocos mais importantes até o limite de caracteres.
 */
const extrairSecoesCriticas = (
  texto: string,
  palavrasChave: string[],
  limite: number
): string => {
  // Dividir em blocos por parágrafos (linhas em branco)
  const blocos = texto
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(b => b.length > 30) // Ignorar blocos muito curtos (cabeçalhos soltos, rodapés)

  if (blocos.length === 0) return texto.slice(0, limite)

  // Pontuar cada bloco
  const blocosComPontuacao = blocos.map((bloco, indice) => {
    const textoLower = bloco.toLowerCase()
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
    if (indice < 3) pontuacao += 1

    return { bloco, pontuacao, indice }
  })

  // Ordenar por pontuação (maior primeiro)
  const blocosOrdenados = [...blocosComPontuacao].sort((a, b) => b.pontuacao - a.pontuacao)

  // Selecionar blocos até atingir o limite, mantendo a ordem original
  const blocosSelecionados: { bloco: string; indice: number }[] = []
  let totalCaracteres = 0

  for (const item of blocosOrdenados) {
    if (item.pontuacao === 0) continue // Ignorar blocos sem relevância alguma
    if (totalCaracteres + item.bloco.length > limite) {
      // Se ainda temos espaço, tentar encaixar um trecho do bloco
      const espacoRestante = limite - totalCaracteres
      if (espacoRestante > 200) {
        blocosSelecionados.push({
          bloco: item.bloco.slice(0, espacoRestante) + '\n[...]',
          indice: item.indice,
        })
        totalCaracteres += espacoRestante
      }
      break
    }
    blocosSelecionados.push({ bloco: item.bloco, indice: item.indice })
    totalCaracteres += item.bloco.length
  }

  // Se nenhum bloco foi relevante, pegar o início do documento
  if (blocosSelecionados.length === 0) {
    return texto.slice(0, limite) + '\n\n[DOCUMENTO TRUNCADO]'
  }

  // Reordenar pela posição original para manter a coerência do texto
  blocosSelecionados.sort((a, b) => a.indice - b.indice)

  const resultado = blocosSelecionados.map(b => b.bloco).join('\n\n')

  const omitidos = blocos.length - blocosSelecionados.length
  if (omitidos > 0) {
    return resultado + `\n\n[${omitidos} seções omitidas por limite de contexto — apenas seções relevantes para habilitação e conformidade foram mantidas]`
  }

  return resultado
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

    const body = await request.json()
    const { editalTexto, editalPaginas, concorrenteTexto, concorrentePaginas, nomeEdital, nomeProposta } = body as {
      editalTexto?: string
      editalPaginas?: number
      concorrenteTexto?: string
      concorrentePaginas?: number
      nomeEdital?: string
      nomeProposta?: string
    }

    if (!editalTexto || !concorrenteTexto) {
      return NextResponse.json(
        { erro: 'É necessário enviar o texto extraído dos dois documentos PDF.' },
        { status: 400 }
      )
    }

    // Verificar se os textos extraídos são muito curtos (provável PDF de imagem)
    if (editalTexto.trim().length < 100) {
      return NextResponse.json(
        {
          erro: 'O edital parece ser um PDF de imagem sem texto selecionável. Por favor, utilize um PDF digital com texto extraível.',
        },
        { status: 422 }
      )
    }
    if (concorrenteTexto.trim().length < 100) {
      return NextResponse.json(
        {
          erro: 'A proposta do concorrente parece ser um PDF de imagem sem texto selecionável. Por favor, utilize um PDF digital com texto extraível.',
        },
        { status: 422 }
      )
    }

    // Extrair apenas as seções mais relevantes dos documentos
    const editalFiltrado = extrairSecoesCriticas(editalTexto, PALAVRAS_CHAVE_EDITAL, LIMITE_POR_DOCUMENTO)
    const concorrenteFiltrado = extrairSecoesCriticas(concorrenteTexto, PALAVRAS_CHAVE_CONCORRENTE, LIMITE_POR_DOCUMENTO)

    const userMessage = [
      `=== DOCUMENTO 1: EDITAL (${editalPaginas ?? '?'} páginas — seções relevantes extraídas) ===`,
      editalFiltrado,
      '',
      `=== DOCUMENTO 2: PROPOSTA DO CONCORRENTE (${concorrentePaginas ?? '?'} páginas — seções relevantes extraídas) ===`,
      concorrenteFiltrado,
      '',
      'Analise os documentos acima e retorne APENAS o JSON com as não conformidades encontradas.',
    ].join('\n')

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const rawText = chatCompletion.choices[0]?.message?.content ?? ''
    const resultado: ResultadoAnalise = JSON.parse(rawText)

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
