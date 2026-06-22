// app/api/analisar/route.ts

import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
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

// Limite seguro de caracteres para não ultrapassar o contexto do modelo (~128k tokens)
const LIMITE_CARACTERES = 200_000

const truncarTexto = (texto: string, limite: number): string => {
  if (texto.length <= limite) return texto
  return texto.slice(0, limite) + '\n\n[DOCUMENTO TRUNCADO — TAMANHO EXCEDE O LIMITE DE CONTEXTO]'
}

const extrairTextoPdf = async (buffer: Buffer): Promise<{ text: string; numpages: number }> => {
  const parser = new PDFParse({ data: buffer })
  const resultado = await parser.getText()
  const info = await parser.getInfo()
  await parser.destroy()
  return {
    text: resultado.text,
    numpages: info.total,
  }
}

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json()
    const { editalBase64, concorrenteBase64 } = body as {
      editalBase64?: string
      concorrenteBase64?: string
    }

    if (!editalBase64 || !concorrenteBase64) {
      return NextResponse.json(
        { erro: 'É necessário enviar os dois documentos PDF.' },
        { status: 400 }
      )
    }

    // Converter base64 para Buffer do Node.js
    const editalBuffer = Buffer.from(editalBase64, 'base64')
    const concorrenteBuffer = Buffer.from(concorrenteBase64, 'base64')

    // Extrair texto dos PDFs em paralelo
    let editalTexto: string
    let concorrenteTexto: string
    let editalPaginas: number
    let concorrentePaginas: number

    try {
      const [editalPdf, concorrentePdf] = await Promise.all([
        extrairTextoPdf(editalBuffer),
        extrairTextoPdf(concorrenteBuffer),
      ])
      editalTexto = editalPdf.text
      editalPaginas = editalPdf.numpages
      concorrenteTexto = concorrentePdf.text
      concorrentePaginas = concorrentePdf.numpages
    } catch {
      return NextResponse.json(
        {
          erro: 'Não foi possível extrair o texto dos PDFs. Verifique se os arquivos possuem texto selecionável (não são imagens escaneadas sem OCR).',
        },
        { status: 422 }
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

    // Truncar se necessário para não exceder o contexto
    const editalTruncado = truncarTexto(editalTexto, LIMITE_CARACTERES)
    const concorrenteTruncado = truncarTexto(concorrenteTexto, LIMITE_CARACTERES)

    const userMessage = [
      `=== DOCUMENTO 1: EDITAL (${editalPaginas} páginas) ===`,
      editalTruncado,
      '',
      `=== DOCUMENTO 2: PROPOSTA DO CONCORRENTE (${concorrentePaginas} páginas) ===`,
      concorrenteTruncado,
      '',
      'Analise os documentos acima e retorne APENAS o JSON com as não conformidades encontradas.',
    ].join('\n')

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    })

    const rawText = chatCompletion.choices[0]?.message?.content ?? ''
    const resultado: ResultadoAnalise = JSON.parse(rawText)

    return NextResponse.json(resultado)
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
