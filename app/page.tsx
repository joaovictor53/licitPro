// app/page.tsx
'use client'

import { useState } from 'react'
import {
  Scan,
  AlertTriangle,
  CheckCircle,
  FileSearch,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { UploadCard } from '@/components/upload-card'
import { ResultadoCard } from '@/components/resultado-card'
import { TextoCopiavel } from '@/components/texto-copiavel'
import { RelatorioDownload } from '@/components/relatorio-download'
import { ResultadoAnalise } from '@/types/analise-tipos'
import { extrairTextoPdfCliente } from '@/lib/extrair-texto-pdf'

type Estado = 'inicial' | 'carregando' | 'resultado' | 'erro'

const MENSAGENS_CARREGAMENTO = [
  'Lendo o edital...',
  'Extraindo texto dos documentos...',
  'Analisando requisitos de habilitação...',
  'Cruzando exigências com a proposta...',
  'Identificando não conformidades...',
  'Gerando recurso administrativo...',
  'Finalizando análise...',
]

export default function Home() {
  const [edital, setEdital] = useState<File | null>(null)
  const [concorrente, setConcorrente] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('inicial')
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null)
  const [erro, setErro] = useState<string>('')
  const [msgCarregamento, setMsgCarregamento] = useState(MENSAGENS_CARREGAMENTO[0])

  const podeAnalisar = edital !== null && concorrente !== null

  const analisar = async () => {
    if (!edital || !concorrente) return

    setEstado('carregando')
    setErro('')

    let idx = 0
    const intervalo = setInterval(() => {
      idx = (idx + 1) % MENSAGENS_CARREGAMENTO.length
      setMsgCarregamento(MENSAGENS_CARREGAMENTO[idx])
    }, 4000)

    try {
      let editalPdf, concorrentePdf
      try {
        ;[editalPdf, concorrentePdf] = await Promise.all([
          extrairTextoPdfCliente(edital),
          extrairTextoPdfCliente(concorrente),
        ])
      } catch {
        throw new Error(
          'Não foi possível ler um dos PDFs. Verifique se o arquivo não está corrompido.'
        )
      }

      const resposta = await fetch('/api/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editalTexto: editalPdf.text,
          editalPaginas: editalPdf.numpages,
          concorrenteTexto: concorrentePdf.text,
          concorrentePaginas: concorrentePdf.numpages,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao processar os documentos.')
      }

      setResultado(dados)
      setEstado('resultado')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido.')
      setEstado('erro')
    } finally {
      clearInterval(intervalo)
    }
  }

  const reiniciar = () => {
    setEdital(null)
    setConcorrente(null)
    setEstado('inicial')
    setResultado(null)
    setErro('')
    setMsgCarregamento(MENSAGENS_CARREGAMENTO[0])
  }

  const totalMaterial = resultado?.nao_conformidades.filter((i) => i.gravidade === 'material').length ?? 0
  const totalSanavel = resultado?.nao_conformidades.filter((i) => i.gravidade === 'sanável').length ?? 0

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              LicitPro
            </h1>
            <p className="text-xs text-slate-400 font-medium">Analisador de Inabilitação</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-8 pl-[52px]">
          Carregue o edital e a proposta do concorrente — o sistema identifica as brechas e gera o recurso pronto para protocolo.
        </p>

        <hr className="border-slate-200 mb-8" />

        {/* Upload */}
        {estado !== 'resultado' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <UploadCard
                etapa="Passo 1"
                label="Edital"
                arquivo={edital}
                onArquivo={setEdital}
              />
              <UploadCard
                etapa="Passo 2"
                label="Proposta do concorrente"
                arquivo={concorrente}
                onArquivo={setConcorrente}
              />
            </div>

            <button
              id="btn-iniciar-varredura"
              onClick={analisar}
              disabled={!podeAnalisar || estado === 'carregando'}
              className={`
                w-full py-3 px-4 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2 mb-6
                transition-all duration-150 shadow-sm
                ${podeAnalisar && estado !== 'carregando'
                  ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              <Scan className="w-4 h-4" />
              Iniciar varredura
            </button>
          </>
        )}

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center mb-6 shadow-sm">
            <div className="w-12 h-12 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-5" />
            <p className="font-semibold text-slate-800 mb-1">{msgCarregamento}</p>
            <p className="text-sm text-slate-400">
              Isso pode levar de 20 a 60 segundos dependendo do tamanho dos documentos
            </p>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Erro na análise</p>
              <p className="text-red-600 text-sm mt-1">{erro}</p>
              <button
                id="btn-tentar-novamente"
                onClick={reiniciar}
                className="mt-3 text-xs text-red-600 underline underline-offset-2 hover:text-red-700 cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Resultado */}
        {estado === 'resultado' && resultado && (
          <>
            {/* Resumo */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-3 shadow-sm">
              <FileSearch className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                  Resumo da análise
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">{resultado.resumo}</p>
              </div>
            </div>

            {/* Contadores */}
            {resultado.total_irregularidades > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{totalMaterial}</p>
                  <p className="text-xs text-red-500 font-medium mt-0.5">Material(is) — insanável(is)</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{totalSanavel}</p>
                  <p className="text-xs text-amber-500 font-medium mt-0.5">Sanável(is)</p>
                </div>
              </div>
            )}

            {/* Não conformidades */}
            {resultado.nao_conformidades.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-sm text-emerald-700">
                  Nenhuma irregularidade encontrada na proposta do concorrente.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    {resultado.total_irregularidades} irregularidade
                    {resultado.total_irregularidades !== 1 ? 's' : ''} encontrada
                    {resultado.total_irregularidades !== 1 ? 's' : ''}
                  </span>
                </div>
                {resultado.nao_conformidades.map((item) => (
                  <ResultadoCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Relatório + Textos gerados */}
            <div className="space-y-4 mb-6">
              <RelatorioDownload resultado={resultado} nomeEdital={edital?.name} />
              <TextoCopiavel
                titulo="Recurso administrativo"
                texto={resultado.recurso_administrativo}
                icone={<FileSearch className="w-4 h-4 text-blue-500" />}
              />
              <TextoCopiavel
                titulo="Mensagem ao pregoeiro"
                texto={resultado.mensagem_pregoeiro}
                icone={<MessageSquare className="w-4 h-4 text-blue-500" />}
              />
            </div>

            {/* Botão nova análise */}
            <button
              id="btn-nova-analise"
              onClick={reiniciar}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Nova análise
            </button>
          </>
        )}

      </div>
    </main>
  )
}
