// components/relatorio-download.tsx
'use client'

import { Download } from 'lucide-react'
import { ResultadoAnalise } from '@/types/analise-tipos'
import { Button } from '@/components/ui/button'

interface RelatorioDownloadProps {
  resultado: ResultadoAnalise
  nomeEdital?: string
}

const gerarTextoRelatorio = (resultado: ResultadoAnalise, nomeEdital?: string): string => {
  const linha = '='.repeat(72)
  const sublinha = '-'.repeat(72)
  const dataHora = new Date().toLocaleString('pt-BR')

  const linhas: string[] = [
    linha,
    'RELATÓRIO DE ANÁLISE DE INABILITAÇÃO — LicitPro Analyzer',
    linha,
    `Data da análise: ${dataHora}`,
    nomeEdital ? `Edital: ${nomeEdital}` : '',
    '',
    linha,
    'RESUMO EXECUTIVO',
    sublinha,
    resultado.resumo,
    '',
    `Total de irregularidades encontradas: ${resultado.total_irregularidades}`,
    `  • Material (insanável): ${resultado.nao_conformidades.filter((i) => i.gravidade === 'material').length}`,
    `  • Sanável (diligência):  ${resultado.nao_conformidades.filter((i) => i.gravidade === 'sanável').length}`,
    '',
  ]

  if (resultado.nao_conformidades.length > 0) {
    linhas.push(linha)
    linhas.push('DETALHAMENTO DAS NÃO CONFORMIDADES')
    linhas.push(sublinha)
    linhas.push('')

    resultado.nao_conformidades.forEach((item, idx) => {
      linhas.push(`${idx + 1}. ${item.titulo.toUpperCase()}`)
      linhas.push(`   Gravidade    : ${item.gravidade === 'material' ? 'MATERIAL — Insanável' : 'SANÁVEL — Diligência'}`)
      linhas.push(`   Item do Edital: ${item.item_edital}`)
      linhas.push('')
      linhas.push('   PROBLEMA:')
      linhas.push(`   ${item.problema}`)
      linhas.push('')

      if (item.evidencia) {
        linhas.push('   EVIDÊNCIA NO DOCUMENTO DO CONCORRENTE:')
        linhas.push(`   "${item.evidencia}"`)
        linhas.push('')
      }

      if (item.recomendacao) {
        linhas.push('   ARGUMENTO PARA O RECURSO:')
        linhas.push(`   ${item.recomendacao}`)
        linhas.push('')
      }

      linhas.push(`   FUNDAMENTO LEGAL: ${item.fundamento_legal}`)
      linhas.push('')
      linhas.push(sublinha)
      linhas.push('')
    })
  }

  linhas.push(linha)
  linhas.push('MENSAGEM AO PREGOEIRO')
  linhas.push(sublinha)
  linhas.push(resultado.mensagem_pregoeiro)
  linhas.push('')
  linhas.push(linha)
  linhas.push('RECURSO ADMINISTRATIVO (MINUTA COMPLETA)')
  linhas.push(sublinha)
  linhas.push(resultado.recurso_administrativo)
  linhas.push('')
  linhas.push(linha)
  linhas.push('Gerado por LicitPro Analyzer — Analisador de Inabilitação')
  linhas.push(linha)

  return linhas.filter((l) => l !== null).join('\n')
}

export const RelatorioDownload = ({ resultado, nomeEdital }: RelatorioDownloadProps) => {
  const baixarRelatorio = () => {
    const texto = gerarTextoRelatorio(resultado, nomeEdital)
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-inabilitacao-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button id="btn-baixar-relatorio" size="lg" onClick={baixarRelatorio} className="w-full">
      <Download />
      Baixar Relatório Completo (.txt)
    </Button>
  )
}
