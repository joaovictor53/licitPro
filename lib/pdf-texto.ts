// lib/pdf-texto.ts
// Texto em PDF com pdf-lib: quebra de linha, texto seguro para a fonte padrão e geração de
// documento de texto simples (declarações, procuração). Compartilhado com lib/documento-proposta.ts.

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'

export const LARGURA_A4 = 595.28
export const ALTURA_A4 = 841.89
export const MARGEM_A4 = 50

/** Troca por "?" o que a fonte padrão do PDF não desenha (o pdf-lib lança erro em vez de pular). */
export const textoSeguro = (texto: string, fonte: PDFFont): string => {
  const suportados = new Set(fonte.getCharacterSet())
  return Array.from(texto.normalize('NFC'))
    .map((c) => (c === '\n' || c === '\t' ? ' ' : suportados.has(c.codePointAt(0)!) ? c : '?'))
    .join('')
}

export const quebrarEmLinhas = (texto: string, fonte: PDFFont, tamanho: number, larguraMaxima: number): string[] => {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra
    if (atual && fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMaxima) {
      linhas.push(atual)
      atual = palavra
    } else {
      atual = tentativa
    }
  }
  if (atual) linhas.push(atual)
  return linhas.length ? linhas : ['']
}

export interface OpcoesDocumentoDeTexto {
  /** Rodapé em todas as páginas (ex.: aviso de "gerada a partir do edital — confira antes de assinar"). */
  rodape?: string
}

/**
 * Documento A4 a partir de texto com parágrafos separados por linha em branco. A primeira
 * linha é o título (negrito, centralizado). Uma linha só de "_" vira linha de assinatura.
 */
export const gerarPdfDeTexto = async (texto: string, opcoes: OpcoesDocumentoDeTexto = {}): Promise<Buffer> => {
  const documento = await PDFDocument.create()
  const normal = await documento.embedFont(StandardFonts.TimesRoman)
  const negrito = await documento.embedFont(StandardFonts.TimesRomanBold)
  const largura = LARGURA_A4 - 2 * MARGEM_A4

  let pagina = documento.addPage([LARGURA_A4, ALTURA_A4])
  let y = ALTURA_A4 - MARGEM_A4
  const novaPagina = () => {
    pagina = documento.addPage([LARGURA_A4, ALTURA_A4])
    y = ALTURA_A4 - MARGEM_A4
  }

  const [titulo, ...resto] = texto.split(/\n/)
  const tituloSeguro = textoSeguro(titulo.trim(), negrito)
  for (const linha of quebrarEmLinhas(tituloSeguro, negrito, 13, largura)) {
    const x = MARGEM_A4 + (largura - negrito.widthOfTextAtSize(linha, 13)) / 2
    pagina.drawText(linha, { x, y, size: 13, font: negrito, color: rgb(0.1, 0.1, 0.1) })
    y -= 18
  }
  y -= 12

  for (const paragrafo of resto.join('\n').split(/\n\s*\n/)) {
    const bruto = paragrafo.trim()
    if (!bruto) continue
    if (/^_{5,}$/.test(bruto.split('\n')[0].trim())) {
      // bloco de assinatura: cada linha fica como está, sem juntar
      if (y < MARGEM_A4 + 90) novaPagina()
      y -= 24
      for (const linha of bruto.split('\n')) {
        const seguro = textoSeguro(linha.trim(), normal)
        const x = MARGEM_A4 + (largura - normal.widthOfTextAtSize(seguro, 11)) / 2
        pagina.drawText(seguro, { x, y, size: 11, font: normal, color: rgb(0.1, 0.1, 0.1) })
        y -= 15
      }
      continue
    }
    for (const linha of quebrarEmLinhas(textoSeguro(bruto, normal), normal, 11, largura)) {
      if (y < MARGEM_A4 + 20) novaPagina()
      pagina.drawText(linha, { x: MARGEM_A4, y, size: 11, font: normal, color: rgb(0.1, 0.1, 0.1) })
      y -= 15
    }
    y -= 8
  }

  if (opcoes.rodape) {
    const seguro = textoSeguro(opcoes.rodape, normal)
    for (const p of documento.getPages()) {
      p.drawText(seguro, { x: MARGEM_A4, y: 28, size: 8, font: normal, color: rgb(0.4, 0.4, 0.4) })
    }
  }

  return Buffer.from(await documento.save())
}
