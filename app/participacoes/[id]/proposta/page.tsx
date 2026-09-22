// app/participacoes/[id]/proposta/page.tsx
// Ferramenta 8, Montagem da Proposta.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, XCircle } from 'lucide-react'
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

interface Peca {
  peca: string
  origem: string
  situacao: 'pronta' | 'preencher' | 'vinculada' | 'faltando' | 'vence_antes_sessao'
  detalhe?: string
}

interface Agregado {
  pecas: Peca[]
  checagem: { podeGerar: boolean; pendencias: string[] }
}

interface VersaoProposta {
  id: string
  versao: number
  arquivoNome: string
  aprovada: boolean
  createdAt: string
}

const SITUACAO_LABEL: Record<Peca['situacao'], string> = {
  pronta: 'Pronta',
  preencher: 'Preencher',
  vinculada: 'Vinculada',
  faltando: 'Faltando',
  vence_antes_sessao: 'Vence antes da sessão',
}

const SITUACAO_VARIANTE: Record<Peca['situacao'], string> = {
  pronta: 'bg-emerald-600 text-white hover:bg-emerald-600',
  preencher: 'bg-amber-500 text-white hover:bg-amber-500',
  vinculada: 'bg-slate-600 text-white hover:bg-slate-600',
  faltando: 'bg-red-600 text-white hover:bg-red-600',
  vence_antes_sessao: 'bg-orange-600 text-white hover:bg-orange-600',
}

export default function PropostaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [agregado, setAgregado] = useState<Agregado | null>(null)
  const [versoes, setVersoes] = useState<VersaoProposta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/participacoes/${id}/proposta`)
      if (resposta.ok) {
        const dados = await resposta.json()
        setAgregado(dados.agregado)
        setVersoes(dados.versoes ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const gerar = async () => {
    setErro('')
    setGerando(true)
    const resposta = await fetch(`/api/participacoes/${id}/proposta`, { method: 'POST' })
    const dados = await resposta.json().catch(() => null)
    setGerando(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível gerar a proposta.')
      return
    }
    carregar()
  }

  const aprovar = async (versaoId: string) => {
    await fetch(`/api/participacoes/${id}/proposta/${versaoId}/aprovar`, { method: 'PATCH' })
    carregar()
  }

  if (isPending || !sessao || carregando || !agregado) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Montagem da Proposta</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/precos`} />}>
              Composição de Preço
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de montagem</CardTitle>
            <CardDescription>
              Reúne o dossiê (Ferramenta 6) e a planilha de preços (Ferramenta 7). Sem preenchimento
              automático de anexos-modelo do edital ainda — o documento gerado é um resumo da proposta
              comercial, não cada anexo oficial preenchido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peça</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agregado.pecas.map((peca, indice) => (
                  <TableRow key={`${peca.peca}-${indice}`}>
                    <TableCell className="text-sm">
                      {peca.peca}
                      {peca.detalhe && <div className="text-xs text-muted-foreground">{peca.detalhe}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{peca.origem}</TableCell>
                    <TableCell>
                      <Badge className={SITUACAO_VARIANTE[peca.situacao]}>{SITUACAO_LABEL[peca.situacao]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checagem final</CardTitle>
            <CardDescription>Se alguma falhar, a geração é bloqueada até corrigir.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {agregado.checagem.podeGerar ? (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>Tudo conferido — pode gerar a proposta.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {agregado.checagem.pendencias.map((pendencia, indice) => (
                      <li key={indice}>{pendencia}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Button onClick={gerar} disabled={gerando || !agregado.checagem.podeGerar}>
              {gerando ? 'Gerando...' : 'Gerar proposta'}
            </Button>
          </CardContent>
        </Card>

        {versoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Versões geradas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Gerada em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versoes.map((versao) => (
                    <TableRow key={versao.id}>
                      <TableCell>v{versao.versao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(versao.createdAt).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{versao.aprovada ? <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Aprovada</Badge> : '—'}</TableCell>
                      <TableCell className="flex gap-2">
                        <a href={`/api/participacoes/${id}/proposta/${versao.id}/arquivo`} className="text-xs text-primary underline">
                          Baixar
                        </a>
                        {!versao.aprovada && (
                          <button onClick={() => aprovar(versao.id)} className="text-xs text-primary underline">
                            Aprovar
                          </button>
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
