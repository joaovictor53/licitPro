// app/participacoes/[id]/page.tsx
// Ferramenta 3, Leitura do Edital — matriz de conformidade de uma participação.
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileText, ShieldAlert, Upload } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Participacao {
  id: string
  orgao: string
  municipio: string | null
  uf: string | null
  objeto: string
  estado: string
}

interface EditalInfo {
  nomeArquivo: string
  numPaginas: number
  createdAt: string
}

interface Exigencia {
  id: string
  ordem: number
  titulo: string
  tipo: string
  obrigatorio: boolean
  oQueExige: string
  criterioAceitacao: string | null
  trecho: string
  pagina: number | null
  clausula: string | null
  risco: 'desclassifica' | 'inabilita' | 'sanavel'
  confianca: 'alta' | 'media' | 'baixa'
  requerVerificacaoManual: boolean
  situacao: 'atende' | 'nao_atende' | 'parcial' | 'a_verificar'
}

const RISCO_LABEL: Record<Exigencia['risco'], string> = {
  desclassifica: 'Desclassifica',
  inabilita: 'Inabilita',
  sanavel: 'Sanável',
}

const RISCO_VARIANTE: Record<Exigencia['risco'], string> = {
  desclassifica: 'bg-red-600 text-white hover:bg-red-600',
  inabilita: 'bg-orange-600 text-white hover:bg-orange-600',
  sanavel: 'bg-slate-500 text-white hover:bg-slate-500',
}

const SITUACAO_LABEL: Record<Exigencia['situacao'], string> = {
  atende: 'Atende',
  nao_atende: 'Não atende',
  parcial: 'Parcial',
  a_verificar: 'A verificar',
}

export default function ParticipacaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [participacao, setParticipacao] = useState<Participacao | null>(null)
  const [editalInfo, setEditalInfo] = useState<EditalInfo | null>(null)
  const [exigencias, setExigencias] = useState<Exigencia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/participacoes/${id}`)
      if (resposta.ok) {
        const dados = await resposta.json()
        setParticipacao(dados.participacao)
        setEditalInfo(dados.edital)
        setExigencias(dados.exigencias ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const enviarEdital = async () => {
    const arquivo = arquivoRef.current?.files?.[0]
    if (!arquivo) {
      setErro('Selecione o PDF do edital.')
      return
    }

    setErro('')
    setAviso('')
    setEnviando(true)

    const formData = new FormData()
    formData.append('edital', arquivo)

    const resposta = await fetch(`/api/participacoes/${id}/edital`, { method: 'POST', body: formData })
    const dados = await resposta.json().catch(() => null)
    setEnviando(false)

    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível processar o edital.')
      return
    }

    setEditalInfo({ nomeArquivo: dados.edital.nomeArquivo, numPaginas: dados.edital.numPaginas, createdAt: new Date().toISOString() })
    setExigencias(dados.exigencias ?? [])
    if (dados.aviso) setAviso(dados.aviso)
    if (arquivoRef.current) arquivoRef.current.value = ''
  }

  const definirSituacao = async (exigenciaId: string, situacao: Exigencia['situacao']) => {
    setSalvandoId(exigenciaId)
    const resposta = await fetch(`/api/participacoes/${id}/exigencias/${exigenciaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ situacao }),
    })
    setSalvandoId(null)
    if (resposta.ok) {
      setExigencias((atual) => atual.map((ex) => (ex.id === exigenciaId ? { ...ex, situacao } : ex)))
    }
  }

  if (isPending || !sessao || carregando) return null

  if (!participacao) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Participação não encontrada.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const criticos = exigencias.filter((e) => e.risco !== 'sanavel' && e.situacao === 'a_verificar').length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{participacao.orgao}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{participacao.objeto}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href="/radar" />}>
            <ArrowLeft />
            Voltar ao radar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/recurso`} />}>
              Ficha do recurso
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/documentos`} />}>
              Documentos
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/viabilidade`} />}>
              Viabilidade
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/decisao`} />}>
              Decisão
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/precos`} />}>
              Preços
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/proposta`} />}>
              Proposta
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/aprovacao`} />}>
              Aprovação
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/upload`} />}>
              Upload
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/envio`} />}>
              Envio
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/sessao`} />}>
              Sessão
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edital</CardTitle>
            <CardDescription>
              Envie o PDF do edital para montar a matriz de conformidade. A IA extrai as
              exigências; a situação de cada uma (atende, não atende, parcial) é sempre decidida
              por você — nunca automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {editalInfo && (
              <p className="text-sm">
                Edital atual: <span className="font-medium">{editalInfo.nomeArquivo}</span> ({editalInfo.numPaginas} páginas)
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={arquivoRef}
                type="file"
                accept="application/pdf"
                className="flex-1 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
              />
              <Button onClick={enviarEdital} disabled={enviando}>
                <Upload />
                {enviando ? 'Lendo edital...' : editalInfo ? 'Reenviar e reler' : 'Enviar e ler edital'}
              </Button>
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            {aviso && !erro && (
              <Alert>
                <AlertDescription>{aviso}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {exigencias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Matriz de conformidade</CardTitle>
              <CardDescription>
                Ordenada por risco — o que desclassifica ou inabilita aparece primeiro.{' '}
                {criticos > 0 ? (
                  <span className="font-medium text-foreground">{criticos} item(ns) crítico(s) aguardando conferência.</span>
                ) : (
                  'Nenhum item crítico pendente de conferência.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risco</TableHead>
                    <TableHead>Exigência</TableHead>
                    <TableHead>Onde</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exigencias.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="align-top">
                        <Badge className={RISCO_VARIANTE[ex.risco]}>{RISCO_LABEL[ex.risco]}</Badge>
                        {ex.requerVerificacaoManual && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-amber-600" title="Trecho citado pela IA não foi encontrado com segurança no texto do edital — confira manualmente.">
                            <ShieldAlert className="w-3 h-3" />
                            Confirmar
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-80 align-top">
                        <div className="font-medium">{ex.titulo}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ex.oQueExige}</div>
                        {ex.criterioAceitacao && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium">Critério:</span> {ex.criterioAceitacao}
                          </div>
                        )}
                        <details className="mt-1">
                          <summary className="text-xs text-primary cursor-pointer">Ver trecho do edital</summary>
                          <blockquote className="text-xs mt-1 border-l-2 pl-2 italic text-muted-foreground">
                            &ldquo;{ex.trecho}&rdquo;
                          </blockquote>
                        </details>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground whitespace-nowrap">
                        {ex.clausula && <div>Item {ex.clausula}</div>}
                        {ex.pagina != null && <div>Pág. {ex.pagina}</div>}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <select
                            value={ex.situacao}
                            disabled={salvandoId === ex.id}
                            onChange={(e) => definirSituacao(ex.id, e.target.value as Exigencia['situacao'])}
                            className="h-8 rounded-md border border-input bg-input/30 px-2 text-xs"
                          >
                            {(['a_verificar', 'atende', 'parcial', 'nao_atende'] as const).map((s) => (
                              <option key={s} value={s}>{SITUACAO_LABEL[s]}</option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
