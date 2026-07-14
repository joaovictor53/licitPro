// app/dashboard/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scan,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSearch,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  History,
  BarChart3,
  Gem,
} from 'lucide-react'
import type { StatusPlano } from '@/lib/planos'
import Link from 'next/link'
import { UploadCard } from '@/components/upload-card'
import { ResultadoCard } from '@/components/resultado-card'
import { TextoCopiavel } from '@/components/texto-copiavel'
import { RelatorioDownload } from '@/components/relatorio-download'
import { ResultadoAnalise } from '@/types/analise-tipos'
import { extrairTextoPdfCliente } from '@/lib/extrair-texto-pdf'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

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

export default function DashboardPage() {
  const router = useRouter()
  const { data: sessao, isPending } = useSession()
  const [edital, setEdital] = useState<File | null>(null)
  const [concorrente, setConcorrente] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('inicial')
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null)
  const [erro, setErro] = useState<string>('')
  const [msgCarregamento, setMsgCarregamento] = useState(MENSAGENS_CARREGAMENTO[0])
  const [statusPlano, setStatusPlano] = useState<StatusPlano | null>(null)

  // Proteção de rota: redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isPending && !sessao) {
      router.push('/login')
    }
  }, [sessao, isPending, router])

  const carregarPlano = useCallback(async () => {
    try {
      const resposta = await fetch('/api/plano')
      if (resposta.ok) setStatusPlano(await resposta.json())
    } catch {
      // Sem status do plano, a UI apenas não mostra o contador — a API de análise ainda valida
    }
  }, [])

  useEffect(() => {
    if (sessao) carregarPlano()
  }, [sessao, carregarPlano])

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
          nomeEdital: edital.name,
          nomeProposta: concorrente.name,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao processar os documentos.')
      }

      setResultado(dados)
      setEstado('resultado')
      carregarPlano()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido.')
      setEstado('erro')
    } finally {
      clearInterval(intervalo)
    }
  }

  const sair = async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const reiniciar = () => {
    setEdital(null)
    setConcorrente(null)
    setEstado('inicial')
    setResultado(null)
    setErro('')
    setMsgCarregamento(MENSAGENS_CARREGAMENTO[0])
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!sessao) {
    return null
  }

  const totalMaterial = resultado?.nao_conformidades.filter((i) => i.gravidade === 'material').length ?? 0
  const totalSanavel = resultado?.nao_conformidades.filter((i) => i.gravidade === 'sanável').length ?? 0

  const bloqueado = statusPlano !== null && !statusPlano.permitido
  const trialExpiraEm = statusPlano?.trialExpiresAt ? new Date(statusPlano.trialExpiresAt) : null
  const diasRestantes = trialExpiraEm
    ? Math.max(0, Math.ceil((trialExpiraEm.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                LicitPro Analyzer
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Analisador de Inabilitação</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href="/historico" />}
            >
              <History />
              Histórico
            </Button>
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href="/planos" />}
            >
              <Gem />
              Planos
            </Button>
            {sessao.user.role === 'admin' && (
              <Button
                variant="outline"
                size="xs"
                className="text-primary"
                nativeButton={false}
                render={<Link href="/admin" />}
              >
                <BarChart3 />
                Admin
              </Button>
            )}
            <span className="text-xs text-muted-foreground hidden sm:inline">{sessao.user.email}</span>
            <Button id="btn-sair" variant="outline" size="xs" onClick={sair}>
              <LogOut />
              Sair
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-8 pl-[52px]">
          Carregue o edital e a proposta do concorrente — o sistema identifica as brechas e gera o recurso pronto para protocolo.
        </p>

        <Separator className="mb-8" />

        {/* Status do plano */}
        {bloqueado && statusPlano ? (
          <Alert variant="destructive" className="mb-6">
            <Clock />
            <AlertTitle>
              {statusPlano.motivo === 'trial_expirado'
                ? 'Período de teste encerrado'
                : 'Limite de análises atingido'}
            </AlertTitle>
            <AlertDescription>
              <p>
                {statusPlano.motivo === 'trial_expirado'
                  ? 'Seu período de avaliação gratuita terminou. Assine um plano para continuar usando o LicitPro Analyzer.'
                  : statusPlano.plano === 'gratis'
                    ? 'Você já utilizou a análise gratuita. Assine um plano para continuar usando o LicitPro Analyzer.'
                    : `Você utilizou as ${statusPlano.limite} análises mensais do plano ${statusPlano.nomePlano}. Faça upgrade para continuar.`}
              </p>
              <Button
                variant="link"
                size="xs"
                nativeButton={false}
                render={<Link href="/planos" />}
                className="mt-2 px-0 text-destructive underline"
              >
                Ver planos
              </Button>
            </AlertDescription>
          </Alert>
        ) : statusPlano?.ilimitado ? (
          <Alert className="mb-6">
            <Gem className="text-primary" />
            <AlertDescription>
              <span className="font-semibold">Administrador</span> — análises ilimitadas
            </AlertDescription>
          </Alert>
        ) : statusPlano ? (
          <Alert className="mb-6">
            <Gem className="text-primary" />
            <AlertDescription>
              <span className="flex flex-wrap items-center gap-x-2">
                <span>
                  Plano <span className="font-semibold">{statusPlano.nomePlano}</span> —{' '}
                  <span className="font-semibold">
                    {statusPlano.restantes} de {statusPlano.limite}
                  </span>{' '}
                  análise{statusPlano.limite !== 1 ? 's' : ''}{' '}
                  {statusPlano.plano === 'gratis' ? 'disponível' : 'restantes no mês'}
                  {statusPlano.plano === 'gratis' && diasRestantes !== null && (
                    <>
                      {' '}
                      · teste termina em{' '}
                      <span className="font-semibold">
                        {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </span>
                <Link href="/planos" className="underline text-primary font-medium">
                  Ver planos
                </Link>
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Upload */}
        {estado !== 'resultado' && !bloqueado && (
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

            <Button
              id="btn-iniciar-varredura"
              size="lg"
              onClick={analisar}
              disabled={!podeAnalisar || estado === 'carregando'}
              className="w-full mt-4 cursor-pointer"
              variant="outline"
            >
              <Scan />
              Iniciar varredura
            </Button>
          </>
        )}

        {/* Carregando */}
        {estado === 'carregando' && (
          <Card className="mb-6">
            <CardContent className="py-4 text-center">
              <div className="w-12 h-12 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-5" />
              <p className="font-semibold mb-1">{msgCarregamento}</p>
              <p className="text-sm text-muted-foreground">
                Isso pode levar de 20 a 60 segundos dependendo do tamanho dos documentos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle />
            <AlertTitle>Erro na análise</AlertTitle>
            <AlertDescription>
              <p>{erro}</p>
              <Button
                id="btn-tentar-novamente"
                variant="link"
                size="xs"
                onClick={reiniciar}
                className="mt-2 px-0 text-destructive underline"
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Resultado */}
        {estado === 'resultado' && resultado && (
          <>
            {/* Resumo */}
            <Card size="sm" className="mb-4">
              <CardContent className="flex gap-3">
                <FileSearch className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    Resumo da análise
                  </p>
                  <p className="text-sm leading-relaxed">{resultado.resumo}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contadores */}
            {resultado.total_irregularidades > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Card size="sm" className="bg-red-50 ring-red-200">
                  <CardContent className="text-center">
                    <p className="text-2xl font-bold text-red-600">{totalMaterial}</p>
                    <p className="text-xs text-red-500 font-medium mt-0.5">Material(is) — insanável(is)</p>
                  </CardContent>
                </Card>
                <Card size="sm" className="bg-amber-50 ring-amber-200">
                  <CardContent className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{totalSanavel}</p>
                    <p className="text-xs text-amber-500 font-medium mt-0.5">Sanável(is)</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Não conformidades */}
            {resultado.nao_conformidades.length === 0 ? (
              <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle className="text-emerald-500" />
                <AlertDescription className="text-emerald-700">
                  Nenhuma irregularidade encontrada na proposta do concorrente.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold">
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
                icone={<FileSearch className="w-4 h-4 text-primary" />}
              />
              <TextoCopiavel
                titulo="Mensagem ao pregoeiro"
                texto={resultado.mensagem_pregoeiro}
                icone={<MessageSquare className="w-4 h-4 text-primary" />}
              />
            </div>

            {/* Botão nova análise */}
            <Button id="btn-nova-analise" variant="outline" onClick={reiniciar} className="w-full">
              <RefreshCw />
              Nova análise
            </Button>
          </>
        )}

      </div>
    </main>
  )
}
