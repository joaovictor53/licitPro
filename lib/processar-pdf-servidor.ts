// lib/processar-pdf-servidor.ts
// Extração de texto de PDF no servidor (Node), com fallback de OCR para páginas
// escaneadas (sem camada de texto). Roda no servidor porque o deploy é na Railway
// (servidor Node persistente, sem o limite de payload de 4.5MB das Serverless
// Functions da Vercel que antes obrigava a extração a rodar no navegador).
//
// O build "legacy" do pdfjs-dist já detecta que está em Node e usa
// @napi-rs/canvas internamente (via NodeCanvasFactory) para qualquer
// renderização de página — por isso reaproveitamos `documento.canvasFactory`
// em vez de instanciar nossa própria fábrica de canvas.

import { createWorker } from 'tesseract.js'
import { mkdirSync } from 'fs'
import { join } from 'path'

export interface TextoPdf {
  text: string
  numpages: number
}

// Abaixo disso (por página, ignorando espaços), a página é tratada como escaneada
// e vai para OCR em vez do texto extraído diretamente do PDF.
const MIN_CARACTERES_UTEIS_POR_PAGINA = 25

// Diretório onde o tesseract.js guarda o modelo de idioma (por.traineddata,
// ~2.5MB) já baixado, para não baixar de novo a cada análise. Sobrevive
// enquanto a instância da Railway estiver de pé; some a cada redeploy (o
// download de ~2.5MB acontece de novo 1x, na primeira análise com OCR depois
// de subir uma instância nova).
const DIRETORIO_CACHE_OCR = join(process.cwd(), '.cache', 'tesseract')
mkdirSync(DIRETORIO_CACHE_OCR, { recursive: true })

export const processarPdfServidor = async (buffer: Buffer): Promise<TextoPdf> => {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

  const documentoPdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise

  const numpages = documentoPdf.numPages
  const textosPorPagina: string[] = new Array(numpages).fill('')
  const paginasParaOcr: number[] = []

  for (let i = 1; i <= numpages; i++) {
    const pagina = await documentoPdf.getPage(i)
    const conteudo = await pagina.getTextContent()
    const textoPagina = conteudo.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')

    if (textoPagina.replace(/\s/g, '').length < MIN_CARACTERES_UTEIS_POR_PAGINA) {
      paginasParaOcr.push(i)
    } else {
      textosPorPagina[i - 1] = textoPagina
    }
  }

  if (paginasParaOcr.length > 0) {
    const worker = await createWorker('por', undefined, { cachePath: DIRETORIO_CACHE_OCR })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasFactory = documentoPdf.canvasFactory as any

    try {
      for (const numeroPagina of paginasParaOcr) {
        const pagina = await documentoPdf.getPage(numeroPagina)
        const viewport = pagina.getViewport({ scale: 2 })
        const canvasEContexto = canvasFactory.create(viewport.width, viewport.height)

        await pagina.render({
          canvasContext: canvasEContexto.context,
          canvas: canvasEContexto.canvas,
          viewport,
        }).promise

        const imagemBuffer = canvasEContexto.canvas.toBuffer('image/png') as Buffer
        const { data } = await worker.recognize(imagemBuffer)
        textosPorPagina[numeroPagina - 1] = data.text

        canvasFactory.destroy(canvasEContexto)
      }
    } finally {
      await worker.terminate()
    }
  }

  await documentoPdf.destroy()

  // Marcador de página preservado no texto para que a análise (extrairSecoesCriticas
  // / dividirEmBlocosComPagina em app/api/analisar/route.ts) saiba de qual página do
  // PDF cada trecho veio — necessário para citar evidências com página exata.
  const text = textosPorPagina
    .map((texto, indice) => `[[PÁGINA ${indice + 1}]]\n${texto}`)
    .join('\n\n')

  return { text, numpages }
}
