// lib/extrair-texto-pdf.ts
// Extração de texto de PDF no navegador (evita mandar o arquivo binário para a API,
// contornando o limite de 4.5MB de payload das Serverless Functions da Vercel).
'use client'

export interface TextoPdf {
  text: string
  numpages: number
}

// Import dinâmico: o módulo pdfjs-dist referencia globals de navegador (ex: DOMMatrix)
// na avaliação do módulo, o que quebra o SSR do Next.js se importado estaticamente.
export const extrairTextoPdfCliente = async (arquivo: File): Promise<TextoPdf> => {
  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')

  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await arquivo.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const numpages = pdf.numPages
  const textosPorPagina: string[] = []

  for (let i = 1; i <= numpages; i++) {
    const pagina = await pdf.getPage(i)
    const conteudo = await pagina.getTextContent()
    const textoPagina = conteudo.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textosPorPagina.push(textoPagina)
  }

  await pdf.destroy()

  return { text: textosPorPagina.join('\n\n'), numpages }
}
