// app/api/analisar/route.ts

import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { ResultadoAnalise } from '@/types/analise-tipos'

const SYSTEM_PROMPT = `Você é um especialista em licitações públicas brasileiras com profundo conhecimento da Lei nº 14.133/2021 (Nova Lei de Licitações), da Lei nº 8.666/1993, da Lei Complementar nº 123/2006, e da jurisprudência do TCU.

Você receberá dois documentos em texto extraído de PDF:
- DOCUMENTO 1: O EDITAL da licitação
- DOCUMENTO 2: A PROPOSTA e/ou documentação de habilitação do CONCORRENTE que venceu a fase de lances

Sua missão exclusiva é identificar NÃO CONFORMIDADES na documentação do concorrente em relação ao exigido pelo edital. Foque em:
- Documentos ausentes que o edital exige
- Certidões ou documentos com validade vencida
- Atestados técnicos que não cobrem o objeto contratado
- Documentos que não atendem às especificações do edital
- Irregularidades cadastrais (SICAF, CEIS, CNEP)
- Exigências técnicas não comprovadas

Para cada não conformidade, classifique como:
- "material": vício insanável que fundamenta inabilitação
- "sanável": vício que pode ser corrigido por diligência

RESPONDA APENAS com um objeto JSON válido, sem texto antes ou depois. Use este formato exato:

{
  "resumo": "resumo em 2-3 frases",
  "total_irregularidades": 0,
  "nao_conformidades": [
    {
      "id": 1,
      "titulo": "nome curto da irregularidade",
      "item_edital": "item/cláusula do edital descumprido",
      "problema": "descrição objetiva do que está errado ou ausente",
      "gravidade": "material",
      "fundamento_legal": "base legal aplicável"
    }
  ],
  "recurso_administrativo": "texto completo e formal do recurso, com cabeçalho, fundamentos fáticos e jurídicos, pedido expresso de inabilitação e encerramento formal",
  "mensagem_pregoeiro": "mensagem direta ao pregoeiro declarando intenção de recorrer e apontando os pontos irregulares"
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
