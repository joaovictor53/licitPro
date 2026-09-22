// app/participacoes/[id]/upload/page.tsx
// Ferramenta 11, Preparação do Arquivo para Upload.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, PackageCheck } from 'lucide-react'
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

interface Plataforma {
  id: string
  nome: string
  tamanhoMaximoMb: number | null
  formatosAceitos: string[]
  observacoes: string | null
}

interface ArquivoPreparado {
  peca: string
  nomeOriginal: string
  nomePreparado: string
  tamanhoBytes: number
  formato: string
  situacao: 'pronto' | 'renomeado' | 'excede_fracionar' | 'formato_nao_aceito'
  avisos: string[]
}

const SITUACAO_LABEL: Record<ArquivoPreparado['situacao'], string> = {
  pronto: 'Pronto',
  renomeado: 'Renomeado',
  excede_fracionar: 'Excede, fracionar',
  formato_nao_aceito: 'Formato não aceito',
}

const SITUACAO_VARIANTE: Record<ArquivoPreparado['situacao'], string> = {
  pronto: 'bg-emerald-600 text-white hover:bg-emerald-600',
  renomeado: 'bg-amber-500 text-white hover:bg-amber-500',
  excede_fracionar: 'bg-red-600 text-white hover:bg-red-600',
  formato_nao_aceito: 'bg-red-700 text-white hover:bg-red-700',
}

export default function UploadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [plataformas, setPlataformas] = useState<Plataforma[]>([])
  const [plataformaId, setPlataformaId] = useState('')
  const [arquivos, setArquivos] = useState<ArquivoPreparado[]>([])
  const [verificacaoFinal, setVerificacaoFinal] = useState<{ ok: boolean; pendencias: string[] } | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregarPlataformas = useCallback(async () => {
    try {
      const resposta = await fetch('/api/plataformas')
      if (resposta.ok) {
        const dados = await resposta.json()
        setPlataformas(dados.plataformas ?? [])
      }
    } finally {
      // nada a limpar — só mantém o mesmo formato de efeito das outras telas
    }
  }, [])

  const carregarPreparo = useCallback(async () => {
    try {
      const url = plataformaId ? `/api/participacoes/${id}/upload?plataformaId=${plataformaId}` : `/api/participacoes/${id}/upload`
      const resposta = await fetch(url)
      if (resposta.ok) {
        const dados = await resposta.json()
        setArquivos(dados.arquivos ?? [])
        setVerificacaoFinal(dados.verificacaoFinal)
      }
    } finally {
      setCarregando(false)
    }
  }, [id, plataformaId])

  useEffect(() => {
    if (sessao) carregarPlataformas()
  }, [sessao, carregarPlataformas])

  useEffect(() => {
    if (sessao) carregarPreparo()
  }, [sessao, carregarPreparo])

  if (isPending || !sessao || carregando) return null

  const plataformaAtual = plataformas.find((p) => p.id === plataformaId)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <PackageCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Preparar Upload</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/aprovacao`} />}>
            Aprovação e Assinatura
          </Button>
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/envio`} />}>
            Envio
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plataforma de destino</CardTitle>
            <CardDescription>
              Só os arquivos que o sistema realmente gera com bytes (planilha de preços e proposta)
              entram na conferência — documentos do dossiê são texto/link, sem arquivo binário guardado
              (mesma limitação já documentada na Preparação Documental). Sem compressão nem
              fracionamento automático de PDF ainda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <select
              value={plataformaId}
              onChange={(e) => setPlataformaId(e.target.value)}
              className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm max-w-sm"
            >
              <option value="">Selecione a plataforma</option>
              {plataformas.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>

            {plataformaAtual && (
              <p className="text-xs text-muted-foreground">
                {plataformaAtual.nome}, {plataformaAtual.tamanhoMaximoMb ? `máximo ${plataformaAtual.tamanhoMaximoMb} MB por arquivo` : 'limite não confirmado'}
                {plataformaAtual.formatosAceitos.length > 0 && `, formatos: ${plataformaAtual.formatosAceitos.join(', ')}`}.
                {plataformaAtual.observacoes && <span className="block mt-1">{plataformaAtual.observacoes}</span>}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arquivos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {arquivos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivos.map((arquivo) => (
                    <TableRow key={arquivo.peca}>
                      <TableCell className="text-sm">{arquivo.peca}</TableCell>
                      <TableCell className="text-xs">{(arquivo.tamanhoBytes / 1024).toFixed(0)} KB</TableCell>
                      <TableCell className="text-xs">{arquivo.formato}</TableCell>
                      <TableCell className="text-xs font-mono">{arquivo.nomePreparado}</TableCell>
                      <TableCell>
                        <Badge className={SITUACAO_VARIANTE[arquivo.situacao]}>{SITUACAO_LABEL[arquivo.situacao]}</Badge>
                        {arquivo.avisos.map((aviso, indice) => (
                          <div key={indice} className="text-xs text-muted-foreground mt-1">{aviso}</div>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo gerado ainda.</p>
            )}

            {verificacaoFinal && (
              verificacaoFinal.ok ? (
                <Alert>
                  <CheckCircle2 className="w-4 h-4" />
                  <AlertDescription>Verificação final passou — arquivos prontos para o upload manual no portal.</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      {verificacaoFinal.pendencias.map((pendencia, indice) => (
                        <li key={indice}>{pendencia}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
