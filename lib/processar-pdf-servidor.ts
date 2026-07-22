import { createWorker } from 'tesseract.js'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'

export interface TextoPdf {
  text: string
  numpages: number
}

const MIN_CARACTERES_UTEIS_POR_PAGINA = 25

const DIRETORIO_CACHE_OCR = join(process.cwd(), '.cache', 'tesseract')
mkdirSync(DIRETORIO_CACHE_OCR, { recursive: true })

export const processarPdfServidor = async (buffer: Buffer): Promise<TextoPdf> => {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')
  ).href
  const raizPdfjs = join(process.cwd(), 'node_modules', 'pdfjs-dist')
  const documentoPdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: join(raizPdfjs, 'standard_fonts') + '/',
    cMapUrl: join(raizPdfjs, 'cmaps') + '/',
    cMapPacked: true,
  }).promise

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

    const workerPath = join(
      process.cwd(),
      'node_modules',
      'tesseract.js',
      'src',
      'worker-script',
      'node',
      'index.js'
    )
    const worker = await createWorker('por', undefined, {
      cachePath: DIRETORIO_CACHE_OCR,
      workerPath,
    })
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
  const text = textosPorPagina
    .map((texto, indice) => `[[PÁGINA ${indice + 1}]]\n${texto}`)
    .join('\n\n')

  return { text, numpages }
}
