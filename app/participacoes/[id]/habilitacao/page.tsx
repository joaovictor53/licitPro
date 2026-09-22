// app/participacoes/[id]/habilitacao/page.tsx
// Ferramenta 13, Habilitação.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ShieldCheck } from 'lucide-react'
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

interface RevalidacaoItem {
  titulo: string
  risco: string
  situacaoNaSessao: string
  situacaoHoje: string
}

interface Convocacao {
  id: string
  oQueFoiSolicitado: string
  prazoLimiteEm: string
  atendidoEm: string | null
}

interface Diligencia {
  id: string
  oQueFoiQuestionado: string
  prazoRespostaEm: string
  respostaEnviadaEm: string | null
}

interface Regularizacao {
  dataDeclaracaoVencedoraEm: string
  prazoDiasUteis: number
  documentoPendente: string | null
  protocoloEvidencia: string | null
}

const SITUACAO_LABEL: Record<string, string> = { ok: 'Válida', vence_antes: 'Vencendo/vencida', faltando: 'Faltando', nao_confere: 'Não confere', a_verificar: 'A verificar' }
const SITUACAO_VARIANTE: Record<string, string> = {
  ok: 'bg-emerald-600 text-white hover:bg-emerald-600',
  vence_antes: 'bg-red-600 text-white hover:bg-red-600',
  faltando: 'bg-red-700 text-white hover:bg-red-700',
  nao_confere: 'bg-red-700 text-white hover:bg-red-700',
  a_verificar: 'bg-amber-500 text-white hover:bg-amber-500',
}

export default function HabilitacaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [revalidacao, setRevalidacao] = useState<RevalidacaoItem[]>([])
  const [habilitacao, setHabilitacao] = useState<{ resultado: string | null } | null>(null)
  const [convocacoes, setConvocacoes] = useState<Convocacao[]>([])
  const [diligencias, setDiligencias] = useState<Diligencia[]>([])
  const [regularizacao, setRegularizacao] = useState<Regularizacao | null>(null)
  const [prazoFinalCalculado, setPrazoFinalCalculado] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [motivoInabilitacao, setMotivoInabilitacao] = useState('')
  const [dataDeclaracao, setDataDeclaracao] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respHabilitacao, respConvocacoes, respDiligencias, respRegularizacao] = await Promise.all([
        fetch(`/api/participacoes/${id}/habilitacao`),
        fetch(`/api/participacoes/${id}/habilitacao/convocacoes`),
        fetch(`/api/participacoes/${id}/habilitacao/diligencias`),
        fetch(`/api/participacoes/${id}/habilitacao/regularizacao-me-epp`),
      ])
      if (respHabilitacao.ok) {
        const dados = await respHabilitacao.json()
        setRevalidacao(dados.vencidosOuVencendoPrimeiro ?? [])
        setHabilitacao(dados.habilitacao)
      }
      if (respConvocacoes.ok) {
        const dados = await respConvocacoes.json()
        setConvocacoes(dados.convocacoes ?? [])
      }
      if (respDiligencias.ok) {
        const dados = await respDiligencias.json()
        setDiligencias(dados.diligencias ?? [])
      }
      if (respRegularizacao.ok) {
        const dados = await respRegularizacao.json()
        setRegularizacao(dados.regularizacao)
        setPrazoFinalCalculado(dados.prazoFinalCalculado)
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const registrarResultado = async (resultado: 'habilitada' | 'inabilitada' | 'em_diligencia') => {
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/habilitacao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado, motivoInabilitacao }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar.')
      return
    }
    carregar()
  }

  const marcarConvocacaoAtendida = async (convocacaoId: string) => {
    await fetch(`/api/participacoes/${id}/habilitacao/convocacoes/${convocacaoId}`, { method: 'PATCH' })
    carregar()
  }

  const marcarDiligenciaRespondida = async (diligenciaId: string) => {
    await fetch(`/api/participacoes/${id}/habilitacao/diligencias/${diligenciaId}`, { method: 'PATCH' })
    carregar()
  }

  const salvarRegularizacao = async () => {
    if (!dataDeclaracao) return
    await fetch(`/api/participacoes/${id}/habilitacao/regularizacao-me-epp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataDeclaracaoVencedoraEm: dataDeclaracao }),
    })
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Habilitação</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/recurso-fase`} />}>
            Recurso
          </Button>
        </div>

        <Alert>
          <AlertDescription>
            Revalidação na data de hoje, não na data da sessão — este é o momento em que se perde
            contrato já ganho. Vencido e vencendo aparecem primeiro.
          </AlertDescription>
        </Alert>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Revalidação documental</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Na sessão</TableHead>
                  <TableHead>Hoje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revalidacao.map((item, indice) => (
                  <TableRow key={indice}>
                    <TableCell className="text-sm">{item.titulo}</TableCell>
                    <TableCell><Badge className={SITUACAO_VARIANTE[item.situacaoNaSessao]}>{SITUACAO_LABEL[item.situacaoNaSessao]}</Badge></TableCell>
                    <TableCell><Badge className={SITUACAO_VARIANTE[item.situacaoHoje]}>{SITUACAO_LABEL[item.situacaoHoje]}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {habilitacao?.resultado ? (
              <Badge className="w-fit bg-slate-600 text-white hover:bg-slate-600">{habilitacao.resultado}</Badge>
            ) : (
              <>
                <input
                  value={motivoInabilitacao}
                  onChange={(e) => setMotivoInabilitacao(e.target.value)}
                  placeholder="Motivo estruturado (obrigatório para inabilitar)"
                  className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={() => registrarResultado('habilitada')}>Habilitada</Button>
                  <Button variant="outline" onClick={() => registrarResultado('em_diligencia')}>Em diligência</Button>
                  <Button variant="destructive" onClick={() => registrarResultado('inabilitada')}>Inabilitada</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {convocacoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Convocação do pregoeiro</CardTitle>
              <CardDescription>Criticidade máxima — costuma ser de horas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {convocacoes.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>{c.oQueFoiSolicitado} — prazo {new Date(c.prazoLimiteEm).toLocaleString('pt-BR')}</div>
                  {!c.atendidoEm && <Button variant="outline" size="xs" onClick={() => marcarConvocacaoAtendida(c.id)}>Atendida</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {diligencias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Diligência</CardTitle>
              <CardDescription>Mal respondida vira motivo de inabilitação.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {diligencias.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>{d.oQueFoiQuestionado} — prazo {new Date(d.prazoRespostaEm).toLocaleString('pt-BR')}</div>
                  {!d.respostaEnviadaEm && <Button variant="outline" size="xs" onClick={() => marcarDiligenciaRespondida(d.id)}>Marcar respondida</Button>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Regularização ME/EPP</CardTitle>
            <CardDescription>Padrão 5 dias úteis, prorrogáveis — o edital sempre prevalece.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2 items-end">
              <input type="datetime-local" value={dataDeclaracao} onChange={(e) => setDataDeclaracao(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <Button variant="outline" size="xs" onClick={salvarRegularizacao}>Salvar data da declaração</Button>
            </div>
            {regularizacao && prazoFinalCalculado && (
              <p className="text-sm">Prazo final calculado: <strong>{new Date(prazoFinalCalculado).toLocaleString('pt-BR')}</strong></p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
