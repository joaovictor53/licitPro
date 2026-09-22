// lib/planilha-precos.ts
// Ferramenta 7, Composição de Preço — geração do arquivo XLSX.
//
// Sem leitura estruturada de planilha-modelo anexa ao edital (a Ferramenta 3
// não extrai estrutura de planilha, só texto de exigência) — por isso este
// gerador sempre usa "o formato padrão do sistema", nunca reproduz a
// estrutura exata de um anexo do órgão. Isso é avisado na tela, não escondido.

import ExcelJS from 'exceljs'
import { ItemPrecoSnapshot, TotaisPlanilhaPrecos } from '@/types/preco-tipos'

export interface DadosPlanilhaPrecos {
  orgao: string
  objeto: string
  numeroProcesso: string | null
  itens: ItemPrecoSnapshot[]
  totais: TotaisPlanilhaPrecos
}

const SITUACAO_LABEL: Record<string, string> = {
  abaixo_piso: 'Abaixo do piso',
  entre_piso_alvo: 'Entre piso e alvo',
  no_alvo: 'No alvo',
  perto_teto: 'Perto do teto',
  acima_teto: 'Acima do teto',
}

export async function gerarPlanilhaPrecos(dados: DadosPlanilhaPrecos): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LicitPro Análise'
  workbook.created = new Date()

  const planilha = workbook.addWorksheet('Planilha de Preços')

  planilha.mergeCells('A1:J1')
  planilha.getCell('A1').value = dados.orgao
  planilha.getCell('A1').font = { bold: true, size: 13 }

  planilha.mergeCells('A2:J2')
  planilha.getCell('A2').value = dados.objeto
  planilha.getCell('A2').font = { italic: true }

  if (dados.numeroProcesso) {
    planilha.mergeCells('A3:J3')
    planilha.getCell('A3').value = `Processo: ${dados.numeroProcesso}`
  }

  const linhaCabecalho = 5
  const colunas = [
    { header: 'Item', key: 'ordem', width: 8 },
    { header: 'Descrição', key: 'descricao', width: 40 },
    { header: 'Unidade', key: 'unidade', width: 10 },
    { header: 'Quantidade', key: 'quantidade', width: 12 },
    { header: 'Marca/modelo', key: 'marcaModelo', width: 18 },
    { header: 'Custo unitário', key: 'custoUnitario', width: 14 },
    { header: 'Piso', key: 'pisoUnitario', width: 12 },
    { header: 'Alvo', key: 'alvoUnitario', width: 12 },
    { header: 'Preço ofertado', key: 'precoOfertado', width: 14 },
    { header: 'Total do item', key: 'totalItem', width: 14 },
    { header: 'Situação', key: 'situacao', width: 18 },
  ]

  colunas.forEach((coluna, indice) => {
    const celula = planilha.getRow(linhaCabecalho).getCell(indice + 1)
    celula.value = coluna.header
    celula.font = { bold: true }
    planilha.getColumn(indice + 1).width = coluna.width
  })

  dados.itens.forEach((item, indice) => {
    const linha = planilha.getRow(linhaCabecalho + 1 + indice)
    linha.getCell(1).value = item.ordem
    linha.getCell(2).value = item.descricao
    linha.getCell(3).value = item.unidade ?? ''
    linha.getCell(4).value = item.quantidade
    linha.getCell(5).value = item.marcaModelo ?? ''
    linha.getCell(6).value = item.custoUnitario ?? null
    linha.getCell(7).value = item.pisoUnitario ?? null
    linha.getCell(8).value = item.alvoUnitario ?? null
    linha.getCell(9).value = item.precoOfertado ?? null
    linha.getCell(10).value = item.avaliacao.totalItem
    linha.getCell(11).value = item.avaliacao.situacao ? SITUACAO_LABEL[item.avaliacao.situacao] : 'Sem preço'
  })

  const linhaTotais = linhaCabecalho + dados.itens.length + 2
  planilha.getRow(linhaTotais).getCell(9).value = 'Total geral'
  planilha.getRow(linhaTotais).getCell(9).font = { bold: true }
  planilha.getRow(linhaTotais).getCell(10).value = dados.totais.totalGeral
  planilha.getRow(linhaTotais).getCell(10).font = { bold: true }

  planilha.getRow(linhaTotais + 1).getCell(9).value = 'Margem consolidada'
  planilha.getRow(linhaTotais + 1).getCell(10).value =
    dados.totais.margemConsolidadaPercentual != null ? `${dados.totais.margemConsolidadaPercentual.toFixed(1)}%` : '—'

  if (dados.totais.valorEstimado != null) {
    planilha.getRow(linhaTotais + 2).getCell(9).value = 'Valor estimado do edital'
    planilha.getRow(linhaTotais + 2).getCell(10).value = dados.totais.valorEstimado
    planilha.getRow(linhaTotais + 3).getCell(9).value = 'Diferença'
    planilha.getRow(linhaTotais + 3).getCell(10).value =
      dados.totais.diferencaValorEstimadoPercentual != null ? `${dados.totais.diferencaValorEstimadoPercentual.toFixed(1)}%` : '—'
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
