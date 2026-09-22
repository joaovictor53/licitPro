// lib/documento-proposta.ts
// Ferramenta 8, Montagem da Proposta — geração do PDF-resumo da proposta
// comercial. Ver nota de escopo em types/proposta-tipos.ts: não é o
// preenchimento de anexos-modelo oficiais, é o resumo com timbre (texto) da
// empresa, dados do edital, itens/preços e condições comerciais.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ItemPrecoSnapshot } from '@/types/preco-tipos'
import { IdentidadeVisual } from '@/types/empresa-tipos'

export interface DadosPropostaDocumento {
  empresa: {
    razaoSocial: string | null
    cnpj: string | null
    endereco: string | null
    identidadeVisual: IdentidadeVisual | null
  }
  participacao: {
    orgao: string
    objeto: string
    numeroProcesso: string | null
    modalidade: string | null
  }
  itens: ItemPrecoSnapshot[]
  totalGeral: number
}

const MARGEM = 50

export async function gerarDocumentoProposta(dados: DadosPropostaDocumento): Promise<Buffer> {
  const documento = await PDFDocument.create()
  const fonteNormal = await documento.embedFont(StandardFonts.Helvetica)
  const fonteNegrito = await documento.embedFont(StandardFonts.HelveticaBold)

  let pagina = documento.addPage([595.28, 841.89]) // A4
  let y = 841.89 - MARGEM

  const escrever = (texto: string, opcoes: { negrito?: boolean; tamanho?: number; espacoDepois?: number } = {}) => {
    const tamanho = opcoes.tamanho ?? 10
    if (y < MARGEM + tamanho) {
      pagina = documento.addPage([595.28, 841.89])
      y = 841.89 - MARGEM
    }
    pagina.drawText(texto, {
      x: MARGEM,
      y,
      size: tamanho,
      font: opcoes.negrito ? fonteNegrito : fonteNormal,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= tamanho + (opcoes.espacoDepois ?? 6)
  }

  escrever(dados.empresa.razaoSocial ?? 'Empresa não identificada', { negrito: true, tamanho: 13 })
  if (dados.empresa.cnpj) escrever(`CNPJ: ${dados.empresa.cnpj}`, { tamanho: 9 })
  if (dados.empresa.endereco) escrever(dados.empresa.endereco, { tamanho: 9 })
  const iv = dados.empresa.identidadeVisual
  if (iv?.telefone || iv?.email) escrever([iv.telefone, iv.email].filter(Boolean).join(' — '), { tamanho: 9, espacoDepois: 14 })

  escrever('PROPOSTA COMERCIAL', { negrito: true, tamanho: 12, espacoDepois: 10 })
  escrever(`Órgão: ${dados.participacao.orgao}`)
  escrever(`Objeto: ${dados.participacao.objeto}`)
  if (dados.participacao.numeroProcesso) escrever(`Processo: ${dados.participacao.numeroProcesso}`)
  if (dados.participacao.modalidade) escrever(`Modalidade: ${dados.participacao.modalidade}`, { espacoDepois: 14 })

  escrever('ITENS E PREÇOS', { negrito: true, tamanho: 11, espacoDepois: 8 })
  for (const item of dados.itens) {
    const linha = `${item.ordem}. ${item.descricao} — ${item.quantidade} ${item.unidade ?? 'un'} x ${(item.precoOfertado ?? 0).toFixed(2)} = ${item.avaliacao.totalItem.toFixed(2)}`
    escrever(linha, { tamanho: 9 })
  }
  escrever(`Total geral: ${dados.totalGeral.toFixed(2)}`, { negrito: true, tamanho: 11, espacoDepois: 14 })

  escrever(
    'Esta proposta considera as condições comerciais e prazos indicados no edital referido acima. Documento gerado pelo LicitPro Análise — conferir antes de assinar.',
    { tamanho: 8 }
  )

  const bytes = await documento.save()
  return Buffer.from(bytes)
}
