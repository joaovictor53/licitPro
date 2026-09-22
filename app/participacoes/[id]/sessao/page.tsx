// app/participacoes/[id]/sessao/page.tsx
// Ferramenta 12, Registro da Sessão — só registro pós-fato.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Gavel, Plus } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Registro {
  horarioAberturaEm: string | null
  horarioEncerramentoEm: string | null
  quantidadeParticipantes: number | null
  lanceFinalEmpresa: string | null
  menorLanceDisputa: string | null
  classificacaoObtida: string | null
  valorVencedor: string | null
  ocorrencias: string | null
  anotacaoLivre: string | null
  resultadoSituacao: string | null
  resultadoMotivo: string | null
}

interface Convocacao {
  id: string
  dataHoraConvocacaoEm: string
  prazoLimiteEm: string
  oQueFoiSolicitado: string
  atendidoEm: string | null
}

const SITUACAO_LABEL: Record<string, string> = {
  vencedora_provisoria: 'Vencedora provisória',
  classificada: 'Classificada',
  desclassificada: 'Desclassificada',
  inabilitada: 'Inabilitada',
}

export default function SessaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [registro, setRegistro] = useState<Partial<Registro>>({})
  const [convocacoes, setConvocacoes] = useState<Convocacao[]>([])
  const [lembretePisos, setLembretePisos] = useState<{ descricao: string; piso: string | null }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [novaConvocacaoData, setNovaConvocacaoData] = useState('')
  const [novaConvocacaoPrazo, setNovaConvocacaoPrazo] = useState('')
  const [novaConvocacaoSolicitado, setNovaConvocacaoSolicitado] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respSessao, respConvocacoes] = await Promise.all([
        fetch(`/api/participacoes/${id}/sessao`),
        fetch(`/api/participacoes/${id}/sessao/convocacoes`),
      ])
      if (respSessao.ok) {
        const dados = await respSessao.json()
        setRegistro(dados.registro ?? {})
        setLembretePisos(dados.lembretePisos ?? [])
      }
      if (respConvocacoes.ok) {
        const dados = await respConvocacoes.json()
        setConvocacoes(dados.convocacoes ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const salvar = async () => {
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/sessao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registro),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível salvar.')
      return
    }
    carregar()
  }

  const criarConvocacao = async () => {
    if (!novaConvocacaoData || !novaConvocacaoPrazo || !novaConvocacaoSolicitado.trim()) return
    await fetch(`/api/participacoes/${id}/sessao/convocacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataHoraConvocacaoEm: novaConvocacaoData,
        prazoLimiteEm: novaConvocacaoPrazo,
        oQueFoiSolicitado: novaConvocacaoSolicitado,
      }),
    })
    setNovaConvocacaoData('')
    setNovaConvocacaoPrazo('')
    setNovaConvocacaoSolicitado('')
    carregar()
  }

  const marcarAtendida = async (convocacaoId: string) => {
    await fetch(`/api/participacoes/${id}/sessao/convocacoes/${convocacaoId}`, { method: 'PATCH' })
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Gavel className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Registro da Sessão</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/envio`} />}>
            Envio
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            O sistema não acessa o portal de compras nem acompanha a sessão ao vivo — o registro é
            feito por você, depois do fato.
          </AlertDescription>
        </Alert>

        {lembretePisos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lembrete: piso de cada item</CardTitle>
              <CardDescription>Leve anotado para a sessão.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {lembretePisos.map((item, indice) => (
                <div key={indice}>{item.descricao}: <strong>{item.piso ?? '—'}</strong></div>
              ))}
            </CardContent>
          </Card>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Depois da sessão</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Quantidade de participantes</label>
              <input type="number" value={registro.quantidadeParticipantes ?? ''} onChange={(e) => setRegistro({ ...registro, quantidadeParticipantes: Number(e.target.value) })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Lance final da empresa</label>
              <input value={registro.lanceFinalEmpresa ?? ''} onChange={(e) => setRegistro({ ...registro, lanceFinalEmpresa: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Menor lance da disputa</label>
              <input value={registro.menorLanceDisputa ?? ''} onChange={(e) => setRegistro({ ...registro, menorLanceDisputa: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Classificação obtida</label>
              <input value={registro.classificacaoObtida ?? ''} onChange={(e) => setRegistro({ ...registro, classificacaoObtida: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Valor do vencedor</label>
              <input value={registro.valorVencedor ?? ''} onChange={(e) => setRegistro({ ...registro, valorVencedor: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Ocorrências (suspensão, adiamento, problema técnico)</label>
              <input value={registro.ocorrencias ?? ''} onChange={(e) => setRegistro({ ...registro, ocorrencias: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Anotação livre</label>
              <textarea value={registro.anotacaoLivre ?? ''} onChange={(e) => setRegistro({ ...registro, anotacaoLivre: e.target.value })} className="min-h-16 rounded-md border border-input bg-input/30 px-3 py-2 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Resultado</label>
              <select
                value={registro.resultadoSituacao ?? ''}
                onChange={(e) => setRegistro({ ...registro, resultadoSituacao: e.target.value || null })}
                className="h-9 rounded-md border border-input bg-input/30 px-2 text-sm"
              >
                <option value="">Sem resultado ainda</option>
                {Object.entries(SITUACAO_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Motivo (quando houver)</label>
              <input value={registro.resultadoMotivo ?? ''} onChange={(e) => setRegistro({ ...registro, resultadoMotivo: e.target.value })} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={salvar}>Salvar registro</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convocação de anexo</CardTitle>
            <CardDescription>Criticidade máxima na central de alertas — o pacote já está pronto na Preparação de Upload.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="datetime-local" value={novaConvocacaoData} onChange={(e) => setNovaConvocacaoData(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <input type="datetime-local" value={novaConvocacaoPrazo} onChange={(e) => setNovaConvocacaoPrazo(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <input value={novaConvocacaoSolicitado} onChange={(e) => setNovaConvocacaoSolicitado(e.target.value)} placeholder="O que foi solicitado" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <Button variant="outline" size="xs" onClick={criarConvocacao} className="w-fit"><Plus />Registrar convocação</Button>

            {convocacoes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitado</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convocacoes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{c.oQueFoiSolicitado}</TableCell>
                      <TableCell className="text-xs">{new Date(c.prazoLimiteEm).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{c.atendidoEm ? 'Atendida' : 'Pendente'}</TableCell>
                      <TableCell>
                        {!c.atendidoEm && <Button variant="outline" size="xs" onClick={() => marcarAtendida(c.id)}>Marcar atendida</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
