// lib/documento-proposta.ts
// Ferramenta 8, Montagem da Proposta — geração do PDF-resumo da proposta
// comercial. Ver nota de escopo em types/proposta-tipos.ts: não é o
// preenchimento de anexos-modelo oficiais, é o resumo com timbre (texto) da
// empresa, dados do edital, itens/preços e condições comerciais.
//
// O formato das linhas de cálculo ("Item N: qtd un x R$ preço = R$ total") e do
// total é lido de volta por lib/porteiro-proposta.ts — mudar aqui exige mudar lá.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { ItemPrecoSnapshot } from '@/types/preco-tipos'
import { IdentidadeVisual } from '@/types/empresa-tipos'
import { formatarPrecoUnitario, MAXIMO_DE_CASAS } from '@/lib/casas-decimais'
import { valorPorExtenso } from '@/lib/valor-por-extenso'
import { ALTURA_A4 as ALTURA, LARGURA_A4 as LARGURA, MARGEM_A4 as MARGEM, quebrarEmLinhas, textoSeguro } from '@/lib/pdf-texto'

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
  /** Linhas "Rótulo: valor" das condições exigidas pelo edital (lib/exigencias-proposta.linhasDeCondicoes). */
  condicoes?: string[]
}

/** Dinheiro no padrão brasileiro, sempre com centavos: 1234.5 -> "1.234,50". */
export const formatarReais = (valor: number): string => formatarPrecoUnitario(valor, 2)

/** Preço unitário com todas as casas que o valor usa (3 ou 4 casas nunca saem cortadas para centavos). */
export const formatarPreco = (valor: number): string => formatarPrecoUnitario(valor, MAXIMO_DE_CASAS)

/** Quantidade no padrão brasileiro, sem zeros à direita: 3 -> "3", 1.5 -> "1,5", 1500 -> "1.500". */
export const formatarQuantidade = (valor: number): string => {
  const [inteiro, fracao] = valor.toFixed(4).replace(/0+$/, '').replace(/\.$/, '').split('.')
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return fracao ? `${comMilhar},${fracao}` : comMilhar
}

export async function gerarDocumentoProposta(dados: DadosPropostaDocumento): Promise<Buffer> {
  const documento = await PDFDocument.create()
  const fonteNormal = await documento.embedFont(StandardFonts.Helvetica)
  const fonteNegrito = await documento.embedFont(StandardFonts.HelveticaBold)

  let pagina = documento.addPage([LARGURA, ALTURA])
  let y = ALTURA - MARGEM

  // Escreve o texto quebrando em linhas que cabem na página (antes, texto longo saía da folha).
  const escrever = (texto: string, opcoes: { negrito?: boolean; tamanho?: number; espacoDepois?: number } = {}) => {
    const tamanho = opcoes.tamanho ?? 10
    const fonte = opcoes.negrito ? fonteNegrito : fonteNormal
    const linhas = quebrarEmLinhas(textoSeguro(texto, fonte), fonte, tamanho, LARGURA - 2 * MARGEM)
    linhas.forEach((linha, indice) => {
      if (y < MARGEM + tamanho) {
        pagina = documento.addPage([LARGURA, ALTURA])
        y = ALTURA - MARGEM
      }
      pagina.drawText(linha, { x: MARGEM, y, size: tamanho, font: fonte, color: rgb(0.1, 0.1, 0.1) })
      y -= tamanho + (indice === linhas.length - 1 ? (opcoes.espacoDepois ?? 6) : 2)
    })
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
    escrever(`${item.ordem}. ${item.descricao}`, { tamanho: 9, espacoDepois: 2 })
    if (item.marcaModelo) escrever(`Marca/modelo: ${item.marcaModelo}`, { tamanho: 9, espacoDepois: 2 })
    escrever(
      `Item ${item.ordem}: ${formatarQuantidade(item.quantidade)} ${item.unidade ?? 'un'} x R$ ${formatarPreco(item.precoOfertado ?? 0)} = R$ ${formatarReais(item.avaliacao.totalItem)}`,
      { tamanho: 9, espacoDepois: 8 }
    )
  }
  escrever(`Total geral: R$ ${formatarReais(dados.totalGeral)}`, { negrito: true, tamanho: 11, espacoDepois: 2 })
  const extenso = valorPorExtenso(dados.totalGeral)
  if (extenso) escrever(`Valor total por extenso: ${extenso}.`, { tamanho: 9, espacoDepois: 14 })

  if (dados.condicoes?.length) {
    escrever('CONDIÇÕES DA PROPOSTA', { negrito: true, tamanho: 11, espacoDepois: 6 })
    for (const linha of dados.condicoes) escrever(linha, { tamanho: 9, espacoDepois: 4 })
    y -= 8
  }

  escrever(
    'Esta proposta considera as condições comerciais e prazos indicados no edital referido acima. Documento gerado pelo LicitPro Análise — conferir antes de assinar.',
    { tamanho: 8 }
  )

  const bytes = await documento.save()
  return Buffer.from(bytes)
}
