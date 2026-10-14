// lib/porteiro-proposta.ts
// Ferramenta 8, Montagem da Proposta — a conferência final ("porteiro").
// Inspirado em app/porteiro_proposta.py do Proposta Certa: relê o PDF GERADO (nunca confia
// só nos dados de entrada) e devolve LIBERADO ou BLOQUEADO, com o que corrigir.
//
// Conferências (as que cabem no PDF-resumo do LicitPro):
//  1. nenhum marcador sem resolver ({{...}}, "(a preencher)", None/null/undefined/NaN);
//  2. todo item esperado aparece, só uma vez, e nenhum item a mais;
//  3. contas refeitas A PARTIR DO PDF: quantidade × preço = total de cada linha;
//  4. quantidade e preço de cada linha são os informados;
//  5. soma das linhas = "Total geral" do PDF = total esperado;
//  6. valor por extenso confere com o total;
//  7. condições exigidas pelo edital (validade, entrega, garantia, dados bancários) presentes no
//     PDF e não piores que o exigido; marca/modelo exigidos em todos os itens.
// Fora daqui: itens do TR (a Ferramenta 3 ainda não estrutura a lista de itens).

import { multiplicarEmCentavos, somar } from '@/lib/dinheiro'
import { valorPorExtenso } from '@/lib/valor-por-extenso'
import type { ItemPrecoSnapshot } from '@/types/preco-tipos'
import { CAMPOS_POR_ITEM, conferirCondicao, type CampoExigidoProposta, type UnidadePrazo } from '@/lib/exigencias-proposta'

export interface ProblemaProposta {
  codigo: 'leitura' | 'campo' | 'item' | 'conta' | 'total' | 'extenso' | 'condicao'
  mensagem: string
  /** Item da composição de preço a que o problema se refere, quando há. */
  ordemItem?: number
}

export interface ResultadoPorteiro {
  veredito: 'LIBERADO' | 'BLOQUEADO'
  problemas: ProblemaProposta[]
  conferencias: Array<{ nome: string; ok: boolean }>
}

export interface PropostaEsperada {
  itens: ItemPrecoSnapshot[]
  totalGeral: number
  /** Condições que o edital exige da proposta; quando vem, o PDF precisa trazê-las e não piores que o exigido. */
  campos?: CampoExigidoProposta[]
}

/** "1.234,50" -> 1234.5; "3" -> 3; "1.500" -> 1500 (no PDF o ponto é sempre milhar). `null` se não for número. */
export const lerNumeroBr = (texto: string): number | null => {
  const t = texto.trim().replace(/\./g, '').replace(',', '.')
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null
}

const RE_SUJEIRA: Array<[string, RegExp]> = [
  ['{{', /\{\{|\}\}/],
  ['(a preencher)', /\(a preencher\)/i],
  ['None', /\bNone\b/],
  ['null', /\bnull\b/],
  ['undefined', /\bundefined\b/],
  ['NaN', /\bNaN\b/],
]
const RE_LINHA_CALCULO = /^Item (\d+): ([\d.,]+) (.+?) x R\$ ([\d.,]+) = R\$ ([\d.,]+)$/
const RE_TOTAL = /^Total geral: R\$ ([\d.,]+)$/
const RE_EXTENSO = /^Valor total por extenso: (.+)\.$/

interface LinhaLida {
  ordem: number
  quantidade: number | null
  preco: number | null
  total: number | null
}

const igual = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9

export const conferirTextoProposta = (textoPdf: string, esperada: PropostaEsperada): ResultadoPorteiro => {
  const problemas: ProblemaProposta[] = []
  const conferencias: ResultadoPorteiro['conferencias'] = []
  const registrar = (nome: string, ok: boolean) => conferencias.push({ nome, ok })
  const linhas = textoPdf.split('\n').map((l) => l.replace(/\s+/g, ' ').trim())

  // 1. sujeira
  const achadas = RE_SUJEIRA.filter(([, padrao]) => padrao.test(textoPdf)).map(([nome]) => nome)
  for (const nome of achadas) {
    problemas.push({ codigo: 'campo', mensagem: `O PDF contém «${nome}»: há campo sem resolver ou sem preencher.` })
  }
  registrar('Nenhum campo sem resolver no PDF', achadas.length === 0)

  // 2. itens esperados × itens do PDF
  const lidas: LinhaLida[] = []
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA_CALCULO)
    if (m) lidas.push({ ordem: Number(m[1]), quantidade: lerNumeroBr(m[2]), preco: lerNumeroBr(m[4]), total: lerNumeroBr(m[5]) })
  }
  let itensOk = true
  for (const item of esperada.itens) {
    const doPdf = lidas.filter((l) => l.ordem === item.ordem)
    if (item.precoOfertado == null) {
      problemas.push({ codigo: 'item', mensagem: `Item ${item.ordem}: sem preço ofertado.`, ordemItem: item.ordem })
      itensOk = false
    } else if (doPdf.length !== 1) {
      problemas.push({
        codigo: 'item',
        mensagem: doPdf.length === 0 ? `Item ${item.ordem}: não aparece no PDF.` : `Item ${item.ordem}: aparece ${doPdf.length} vezes no PDF.`,
        ordemItem: item.ordem,
      })
      itensOk = false
    }
  }
  const ordensEsperadas = new Set(esperada.itens.map((i) => i.ordem))
  for (const l of lidas) {
    if (!ordensEsperadas.has(l.ordem)) {
      problemas.push({ codigo: 'item', mensagem: `Item ${l.ordem}: está no PDF mas não na composição de preço.`, ordemItem: l.ordem })
      itensOk = false
    }
  }
  registrar('Todos os itens da composição de preço estão no PDF, sem sobra', itensOk)

  // 3 e 4. contas refeitas a partir do PDF, e valores iguais aos informados
  let contasOk = true
  const totaisLidos: number[] = []
  for (const l of lidas) {
    if (l.quantidade == null || l.preco == null || l.total == null) {
      problemas.push({ codigo: 'conta', mensagem: `Item ${l.ordem}: quantidade, preço ou total ilegível no PDF.`, ordemItem: l.ordem })
      contasOk = false
      continue
    }
    const refeito = multiplicarEmCentavos(l.preco, l.quantidade)
    if (!igual(refeito, l.total)) {
      problemas.push({
        codigo: 'conta',
        mensagem: `Item ${l.ordem}: ${l.quantidade} × ${l.preco} = ${refeito.toFixed(2)}, mas o PDF mostra ${l.total.toFixed(2)}.`,
        ordemItem: l.ordem,
      })
      contasOk = false
    }
    totaisLidos.push(l.total)

    const informado = esperada.itens.find((i) => i.ordem === l.ordem)
    if (informado?.precoOfertado != null && !igual(informado.precoOfertado, l.preco)) {
      problemas.push({
        codigo: 'conta',
        mensagem: `Item ${l.ordem}: o preço no PDF (${l.preco}) não é o informado (${informado.precoOfertado}).`,
        ordemItem: l.ordem,
      })
      contasOk = false
    }
    if (informado && !igual(informado.quantidade, l.quantidade)) {
      problemas.push({
        codigo: 'conta',
        mensagem: `Item ${l.ordem}: a quantidade no PDF (${l.quantidade}) não é a cadastrada (${informado.quantidade}).`,
        ordemItem: l.ordem,
      })
      contasOk = false
    }
  }
  registrar('Contas refeitas a partir do PDF (quantidade × preço = total de cada item)', contasOk)

  // 5. soma e total
  const totalLinha = linhas.map((l) => l.match(RE_TOTAL)).find(Boolean)
  let totalOk = true
  if (!totalLinha) {
    problemas.push({ codigo: 'total', mensagem: 'O PDF não mostra o «Total geral».' })
    totalOk = false
  } else {
    const totalPdf = lerNumeroBr(totalLinha[1])
    const soma = somar(totaisLidos)
    if (totalPdf == null || !igual(soma, totalPdf)) {
      problemas.push({ codigo: 'total', mensagem: `A soma dos itens do PDF (${soma.toFixed(2)}) não é o «Total geral» do PDF (${totalPdf?.toFixed(2) ?? 'ilegível'}).` })
      totalOk = false
    }
    if (totalPdf != null && !igual(totalPdf, esperada.totalGeral)) {
      problemas.push({ codigo: 'total', mensagem: `O «Total geral» do PDF (${totalPdf.toFixed(2)}) não é o total calculado (${esperada.totalGeral.toFixed(2)}).` })
      totalOk = false
    }
  }
  registrar('Soma dos itens = Total geral do PDF = total calculado', totalOk)

  // 6. valor por extenso
  const extensoLinha = linhas.map((l) => l.match(RE_EXTENSO)).find(Boolean)
  const extensoEsperado = valorPorExtenso(esperada.totalGeral)
  let extensoOk = true
  if (extensoEsperado && (!extensoLinha || extensoLinha[1] !== extensoEsperado)) {
    problemas.push({
      codigo: 'extenso',
      mensagem: `O valor por extenso do PDF ${extensoLinha ? `(${extensoLinha[1]}) ` : 'ausente '}não confere com o total (${extensoEsperado}).`,
    })
    extensoOk = false
  }
  registrar('Valor por extenso confere com o total', extensoOk)

  // 7. condições exigidas pelo edital
  if (esperada.campos?.length) {
    let condicoesOk = true
    for (const campo of esperada.campos) {
      if (CAMPOS_POR_ITEM.has(campo.id)) {
        const sem = esperada.itens.filter((i) => !i.marcaModelo?.trim()).map((i) => i.ordem)
        if (sem.length) {
          problemas.push({ codigo: 'condicao', mensagem: `${campo.rotulo}: o edital exige (pág. ${campo.referencia.pagina}) e faltam no(s) item(ns) ${sem.join(', ')}.` })
          condicoesOk = false
        }
        continue
      }
      const linha = linhas.find((l) => l.startsWith(`${campo.rotulo}: `))
      if (!linha) {
        problemas.push({ codigo: 'condicao', mensagem: `${campo.rotulo}: exigido pelo edital (pág. ${campo.referencia.pagina}) e ausente no PDF.` })
        condicoesOk = false
        continue
      }
      const valorTexto = linha.slice(campo.rotulo.length + 2)
      const prazo = valorTexto.match(/^(\d+(?:[.,]\d+)?) (horas|dias|meses|anos)$/)
      const resultado = conferirCondicao(campo, prazo ? { valor: prazo[1], unidade: prazo[2] as UnidadePrazo } : { valor: valorTexto })
      if (!resultado.ok) {
        problemas.push({ codigo: 'condicao', mensagem: resultado.mensagem })
        condicoesOk = false
      }
    }
    registrar('Condições exigidas pelo edital presentes e não piores que o exigido', condicoesOk)
  }

  return { veredito: problemas.length === 0 ? 'LIBERADO' : 'BLOQUEADO', problemas, conferencias }
}

/**
 * Texto do PDF, uma linha de texto por linha (agrupando pelo y). Só PDFs com camada de texto,
 * como os gerados por `gerarDocumentoProposta`; não faz OCR.
 */
export const extrairTextoPdf = async (buffer: Buffer): Promise<string> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { join } = await import('path')
  const { pathToFileURL } = await import('url')
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')).href
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise
  const paginas: string[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const conteudo = await (await pdf.getPage(n)).getTextContent()
    const porLinha = new Map<number, Array<{ x: number; texto: string }>>()
    for (const parte of conteudo.items) {
      if (!('str' in parte) || !parte.str) continue
      const y = Math.round(parte.transform[5])
      porLinha.set(y, [...(porLinha.get(y) ?? []), { x: parte.transform[4], texto: parte.str }])
    }
    paginas.push(
      [...porLinha.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, partes]) => partes.sort((a, b) => a.x - b.x).map((p) => p.texto).join(' '))
        .join('\n')
    )
  }
  await pdf.destroy()
  return paginas.join('\n')
}

export const conferirPdfProposta = async (pdf: Buffer, esperada: PropostaEsperada): Promise<ResultadoPorteiro> => {
  try {
    return conferirTextoProposta(await extrairTextoPdf(pdf), esperada)
  } catch (erro) {
    return {
      veredito: 'BLOQUEADO',
      problemas: [{ codigo: 'leitura', mensagem: `Não consegui reler o PDF gerado: ${erro instanceof Error ? erro.message : String(erro)}` }],
      conferencias: [{ nome: 'PDF gerado pode ser relido', ok: false }],
    }
  }
}
