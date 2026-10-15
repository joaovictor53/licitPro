// app/participacoes/[id]/resultado/page.tsx
// Ferramenta 15, Resultado e Contrato.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Trophy } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

const RESULTADOS = ['vencedora', 'perdedora', 'desclassificada', 'inabilitada', 'desistente', 'certame_anulado', 'revogado', 'fracassado', 'deserto'] as const

interface Resultado {
  resultado: string
  motivoEstruturado: string
}

interface Contrato {
  numero: string
  dataAssinaturaEm: string | null
  vigenciaFimEm: string | null
}

interface Empenho { id: string; numeroNotaEmpenho: string; dataEm: string; valorEmpenhado: string }
interface Pagamento { id: string; dataNotaFiscalEm: string; valor: string; diasAtraso: number | null }
interface Sancao { id: string; tipo: string; motivo: string; dataEm: string }

export default function ResultadoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [empenhos, setEmpenhos] = useState<Empenho[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [sancoes, setSancoes] = useState<Sancao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [resultadoEscolhido, setResultadoEscolhido] = useState<typeof RESULTADOS[number]>('vencedora')
  const [motivo, setMotivo] = useState('')
  const [dataResultado, setDataResultado] = useState('')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [novoEmpenhoNumero, setNovoEmpenhoNumero] = useState('')
  const [novoEmpenhoData, setNovoEmpenhoData] = useState('')
  const [novoEmpenhoValor, setNovoEmpenhoValor] = useState('')
  const [novoPagamentoData, setNovoPagamentoData] = useState('')
  const [novoPagamentoValor, setNovoPagamentoValor] = useState('')
  const [novoPagamentoPrevisto, setNovoPagamentoPrevisto] = useState('')
  const [novoPagamentoEfetivo, setNovoPagamentoEfetivo] = useState('')
  const [garantia, setGarantia] = useState<{ formaEscolhida: string; prazoApresentacaoEm: string | null } | null>(null)
  const [prazoGarantia, setPrazoGarantia] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([
        fetch(`/api/participacoes/${id}/resultado`),
        fetch(`/api/participacoes/${id}/contrato`),
        fetch(`/api/participacoes/${id}/empenhos`),
        fetch(`/api/participacoes/${id}/pagamentos`),
        fetch(`/api/participacoes/${id}/sancoes`),
        fetch(`/api/participacoes/${id}/garantia-contratual`),
      ])
      if (r1.ok) setResultado((await r1.json()).resultado)
      if (r2.ok) setContrato((await r2.json()).contrato)
      if (r3.ok) setEmpenhos((await r3.json()).empenhos ?? [])
      if (r4.ok) setPagamentos((await r4.json()).pagamentos ?? [])
      if (r5.ok) setSancoes((await r5.json()).sancoes ?? [])
      if (r6.ok) setGarantia((await r6.json()).garantia)
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const salvarResultado = async () => {
    setErro('')
    if (!motivo.trim() || !dataResultado) {
      setErro('Informe o motivo e a data do resultado.')
      return
    }
    const resposta = await fetch(`/api/participacoes/${id}/resultado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado: resultadoEscolhido, motivoEstruturado: motivo, dataResultadoEm: dataResultado }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível salvar.')
      return
    }
    carregar()
  }

  const salvarContrato = async () => {
    if (!numeroContrato.trim()) return
    await fetch(`/api/participacoes/${id}/contrato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'contrato', numero: numeroContrato }),
    })
    carregar()
  }

  const criarEmpenho = async () => {
    if (!novoEmpenhoNumero.trim() || !novoEmpenhoData || !novoEmpenhoValor) return
    await fetch(`/api/participacoes/${id}/empenhos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeroNotaEmpenho: novoEmpenhoNumero, dataEm: novoEmpenhoData, valorEmpenhado: novoEmpenhoValor }),
    })
    setNovoEmpenhoNumero('')
    setNovoEmpenhoData('')
    setNovoEmpenhoValor('')
    carregar()
  }

  const criarPagamento = async () => {
    if (!novoPagamentoData || !novoPagamentoValor) return
    await fetch(`/api/participacoes/${id}/pagamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataNotaFiscalEm: novoPagamentoData,
        valor: novoPagamentoValor,
        dataPrevistaPagamentoEm: novoPagamentoPrevisto || null,
        dataEfetivaPagamentoEm: novoPagamentoEfetivo || null,
      }),
    })
    setNovoPagamentoData('')
    setNovoPagamentoValor('')
    setNovoPagamentoPrevisto('')
    setNovoPagamentoEfetivo('')
    carregar()
  }

  const salvarPrazoGarantia = async () => {
    if (!prazoGarantia) return
    await fetch(`/api/participacoes/${id}/garantia-contratual`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prazoApresentacaoEm: prazoGarantia }),
    })
    carregar()
  }

  const encerrar = async () => {
    await fetch(`/api/participacoes/${id}/contrato/encerrar`, { method: 'POST' })
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Trophy className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Resultado e Contrato</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
          <ArrowLeft />
          Voltar à participação
        </Button>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Desfecho</CardTitle>
            <CardDescription>&quot;Perdeu&quot; não ensina nada — o motivo estruturado é sempre exigido.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {resultado ? (
              <div>
                <Badge className="bg-slate-600 text-white hover:bg-slate-600">{resultado.resultado}</Badge>
                <p className="text-sm mt-1">{resultado.motivoEstruturado}</p>
              </div>
            ) : (
              <>
                <select value={resultadoEscolhido} onChange={(e) => setResultadoEscolhido(e.target.value as typeof resultadoEscolhido)} className="h-9 rounded-md border border-input bg-input/30 px-2 text-sm max-w-xs">
                  {RESULTADOS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo estruturado" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                <input type="datetime-local" value={dataResultado} onChange={(e) => setDataResultado(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm max-w-xs" />
                <Button onClick={salvarResultado} className="w-fit">Registrar resultado</Button>
              </>
            )}
          </CardContent>
        </Card>

        {resultado?.resultado === 'vencedora' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Contrato / Ata de Registro de Preços</CardTitle>
                <CardDescription>Documentos revalidados na data da assinatura, igual à Habilitação.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {contrato ? (
                  <p className="text-sm">Número <strong>{contrato.numero}</strong></p>
                ) : (
                  <div className="flex gap-2">
                    <input value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} placeholder="Número do contrato/ata" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                    <Button variant="outline" size="xs" onClick={salvarContrato}>Salvar</Button>
                  </div>
                )}
                {contrato && <Button variant="destructive" size="xs" className="w-fit" onClick={encerrar}>Encerrar participação</Button>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Garantia contratual</CardTitle>
                <CardDescription>Não apresentar no prazo pode gerar sanção e perda do contrato.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {garantia?.prazoApresentacaoEm ? (
                  <p className="text-sm">Prazo de apresentação: <strong>{new Date(garantia.prazoApresentacaoEm).toLocaleString('pt-BR')}</strong></p>
                ) : (
                  <div className="flex gap-2">
                    <input type="datetime-local" value={prazoGarantia} onChange={(e) => setPrazoGarantia(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                    <Button variant="outline" size="xs" onClick={salvarPrazoGarantia}>Salvar prazo</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empenho</CardTitle>
                <CardDescription>O que era previsão de recurso vira empenho real.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={novoEmpenhoNumero} onChange={(e) => setNovoEmpenhoNumero(e.target.value)} placeholder="Número da NE" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                  <input type="date" value={novoEmpenhoData} onChange={(e) => setNovoEmpenhoData(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                  <input value={novoEmpenhoValor} onChange={(e) => setNovoEmpenhoValor(e.target.value)} placeholder="Valor" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                </div>
                <Button variant="outline" size="xs" className="w-fit" onClick={criarEmpenho}>Registrar empenho</Button>
                {empenhos.map((e) => <div key={e.id} className="text-sm">{e.numeroNotaEmpenho} — {e.valorEmpenhado}</div>)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagamentos</CardTitle>
                <CardDescription>Este é o dado que faz o indicador de pagamento do órgão (Ficha do Recurso) funcionar de verdade.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input type="date" value={novoPagamentoData} onChange={(e) => setNovoPagamentoData(e.target.value)} placeholder="Data NF" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                  <input value={novoPagamentoValor} onChange={(e) => setNovoPagamentoValor(e.target.value)} placeholder="Valor" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                  <input type="date" value={novoPagamentoPrevisto} onChange={(e) => setNovoPagamentoPrevisto(e.target.value)} placeholder="Previsto" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                  <input type="date" value={novoPagamentoEfetivo} onChange={(e) => setNovoPagamentoEfetivo(e.target.value)} placeholder="Efetivo" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
                </div>
                <Button variant="outline" size="xs" className="w-fit" onClick={criarPagamento}>Registrar pagamento</Button>
                {pagamentos.map((p) => (
                  <div key={p.id} className="text-sm">
                    {p.valor} — {p.diasAtraso != null ? (p.diasAtraso > 0 ? `${p.diasAtraso} dia(s) de atraso` : 'em dia') : 'aguardando pagamento efetivo'}
                  </div>
                ))}
              </CardContent>
            </Card>

            {sancoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sanções</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {sancoes.map((s) => <div key={s.id} className="text-sm">{s.tipo} — {s.motivo}</div>)}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
