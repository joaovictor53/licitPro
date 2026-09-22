// app/participacoes/[id]/aprovacao/page.tsx
// Ferramenta 9, Aprovação e Assinatura.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSignature } from 'lucide-react'
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

interface Aprovacao {
  status: 'aguardando' | 'aprovada' | 'devolvida' | 'recusada'
  observacao: string | null
  motivoRecusa: string | null
}

interface Resumo {
  totalGeral: number
  itensPreco: number
  margemBasePercentual: number | null
  retornoSobreInvestidoPercentual: number | null
  cicloDias: number | null
  prazoEstimadoPagamentoEm: string | null
}

interface Assinatura {
  id: string
  peca: string
  metodoExigido: string
  status: 'pendente' | 'assinado'
  assinadoPorNome: string | null
  metodoUsado: string | null
}

const METODO_LABEL: Record<string, string> = {
  nao_requer: 'Não requer assinatura',
  assinatura_representante_legal: 'Assinatura do representante legal',
  assinatura_eletronica_aceita: 'Assinatura eletrônica aceita',
  icp_brasil_exigida: 'ICP-Brasil exigida',
  assinatura_portal: 'Assinatura no próprio portal',
  reconhecimento_firma: 'Reconhecimento de firma',
  autenticacao_copia: 'Autenticação de cópia',
  apresentacao_original: 'Apresentação de original',
}

export default function AprovacaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [aprovacao, setAprovacao] = useState<Aprovacao | null>(null)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [observacao, setObservacao] = useState('')
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [nomeSignatario, setNomeSignatario] = useState('')
  const [metodoUsado, setMetodoUsado] = useState<'gov_br' | 'icp_brasil' | 'outro'>('icp_brasil')
  const [arquivoAssinado, setArquivoAssinado] = useState<File | null>(null)

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respAprovacao, respAssinaturas] = await Promise.all([
        fetch(`/api/participacoes/${id}/aprovacao`),
        fetch(`/api/participacoes/${id}/assinaturas`),
      ])
      if (respAprovacao.ok) {
        const dados = await respAprovacao.json()
        setAprovacao(dados.aprovacao)
        setResumo(dados.resumo)
      }
      if (respAssinaturas.ok) {
        const dados = await respAssinaturas.json()
        setAssinaturas(dados.assinaturas ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const enviarParaAprovacao = async () => {
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/aprovacao`, { method: 'POST' })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível enviar para aprovação.')
      return
    }
    carregar()
  }

  const decidir = async (acao: 'aprovar' | 'devolver' | 'recusar') => {
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/aprovacao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, observacao, motivoRecusa }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar a decisão.')
      return
    }
    carregar()
  }

  const lerComoBase64 = (arquivo: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve((leitor.result as string).split(',')[1] ?? '')
      leitor.onerror = reject
      leitor.readAsDataURL(arquivo)
    })

  const marcarAssinado = async (assinaturaId: string) => {
    if (!nomeSignatario.trim() || !arquivoAssinado) {
      setErro('Informe quem assinou e selecione o PDF já assinado.')
      return
    }
    const arquivoAssinadoBase64 = await lerComoBase64(arquivoAssinado)
    const resposta = await fetch(`/api/participacoes/${id}/assinaturas/${assinaturaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assinadoPorNome: nomeSignatario,
        metodoUsado,
        arquivoAssinadoNome: arquivoAssinado.name,
        arquivoAssinadoBase64,
      }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar a assinatura.')
      return
    }
    setArquivoAssinado(null)
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <FileSignature className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Aprovação e Assinatura</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/proposta`} />}>
              Proposta
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/upload`} />}>
              Preparar upload
            </Button>
          </div>
        </div>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Etapa 1 — Aprovação comercial</CardTitle>
            <CardDescription>
              Sem papéis/permissões granulares no sistema ainda — qualquer usuário da empresa pode
              registrar a decisão por enquanto (limitação documentada, não escondida).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {resumo && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>Total geral: <strong>{resumo.totalGeral.toFixed(2)}</strong></div>
                <div>Margem: <strong>{resumo.margemBasePercentual != null ? `${resumo.margemBasePercentual.toFixed(1)}%` : '—'}</strong></div>
                <div>Retorno: <strong>{resumo.retornoSobreInvestidoPercentual != null ? `${resumo.retornoSobreInvestidoPercentual.toFixed(1)}%` : '—'}</strong></div>
                <div>Ciclo: <strong>{resumo.cicloDias ?? '—'} dia(s)</strong></div>
              </div>
            )}

            {!aprovacao || aprovacao.status === 'devolvida' || aprovacao.status === 'recusada' ? (
              <Button onClick={enviarParaAprovacao}>Enviar para aprovação</Button>
            ) : aprovacao.status === 'aguardando' ? (
              <div className="flex flex-col gap-3">
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observação (obrigatória para devolver)"
                  className="min-h-16 rounded-md border border-input bg-input/30 px-3 py-2 text-sm"
                />
                <input
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  placeholder="Motivo da recusa (obrigatório para recusar)"
                  className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={() => decidir('aprovar')}>Aprovar</Button>
                  <Button variant="outline" onClick={() => decidir('devolver')}>Devolver</Button>
                  <Button variant="destructive" onClick={() => decidir('recusar')}>Recusar</Button>
                </div>
              </div>
            ) : (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>Proposta aprovada — versão congelada, assinatura liberada abaixo.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {aprovacao?.status === 'aprovada' && (
          <Card>
            <CardHeader>
              <CardTitle>Etapa 2 — Assinatura</CardTitle>
              <CardDescription>
                O sistema nunca assina em nome de ninguém — sem acesso à API do gov.br (empresa
                privada). Aqui só orienta o método exigido e registra o que foi assinado fora do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={nomeSignatario}
                  onChange={(e) => setNomeSignatario(e.target.value)}
                  placeholder="Nome de quem vai assinar"
                  className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm flex-1"
                />
                <select
                  value={metodoUsado}
                  onChange={(e) => setMetodoUsado(e.target.value as typeof metodoUsado)}
                  className="h-9 rounded-md border border-input bg-input/30 px-2 text-sm"
                >
                  <option value="icp_brasil">ICP-Brasil</option>
                  <option value="gov_br">gov.br</option>
                  <option value="outro">Outro</option>
                </select>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setArquivoAssinado(e.target.files?.[0] ?? null)}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Método exigido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assinaturas.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{a.peca}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{METODO_LABEL[a.metodoExigido]}</TableCell>
                      <TableCell>
                        <Badge className={a.status === 'assinado' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-500'}>
                          {a.status === 'assinado' ? `Assinado por ${a.assinadoPorNome}` : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.metodoExigido !== 'nao_requer' && a.status !== 'assinado' && (
                          <Button variant="outline" size="xs" onClick={() => marcarAssinado(a.id)}>Marcar assinado</Button>
                        )}
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
