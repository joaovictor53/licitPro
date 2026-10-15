// app/participacoes/[id]/decisao/page.tsx
// Ferramenta 5, Decisão de Participar — tela agregadora, sem campo novo.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Calculator, CheckCircle2, FileStack, FileText, Landmark } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface Agregado {
  participacao: {
    orgao: string; objeto: string; modalidade: string | null; plataforma: string | null
    valorEstimado: string | null; dataSessaoEm: string | null; fusoEdital: string | null
  }
  edital: { nomeArquivo: string; numPaginas: number } | null
  ficha: {
    semaforo: 'verde' | 'amarelo' | 'vermelho' | null
    semaforoFatores: Array<{ nivel: string; motivo: string }> | null
    origem: string | null; instrumento: string | null; situacao: string | null
    prazoEstimadoPagamentoEm: string | null
  } | null
  indicadorPagamento: { prazoMedioDias: number | null; quantidadeContratos: number; atrasosRegistrados: number }
  viabilidadeResultado: {
    base: { pisoAlvoTeto: { piso: number; alvo: number; teto: number }; avaliacaoPreco: { margemRealPercentual: number } | null; retorno: { investimentoNovoDesembolso: number; retornoSobreInvestido: number | null; cicloDias: number } }
    conservador: { avaliacaoPreco: { margemRealPercentual: number } | null }
    exposicaoCaixa: { picoCaixaNegativo: number; diasExposicao: number; estouraCaixaLivre: boolean; estouraCapacidadeEntrega: boolean }
  } | null
  acessoriasComPrazoECusto: Array<{ titulo: string; prazoLimiteEm: string | null; custoEstimado: number | null }>
  alertas: Array<{ motivo: string }>
  numerosCongelados: {
    diasAteSessao: number | null
    itensCriticosNaoConferidos: number
    itensAVerificar: number
    documentosVencendoAntesSessao: number
    acessoriasPendentes: number
  }
}

interface Decisao {
  decisao: 'participar' | 'nao_participar' | 'adiar'
  motivoNaoParticipar: string | null
  dataRetomadaEm: string | null
  decididoEm: string
  aprovacaoStatus: 'nao_enviada' | 'aguardando' | 'aprovada' | 'recusada'
  aprovacaoObservacao: string | null
}

const MOTIVOS = [
  ['fora_do_ramo', 'Fora do ramo'],
  ['valor_abaixo_do_minimo', 'Valor abaixo do mínimo'],
  ['valor_acima_da_capacidade', 'Valor acima da capacidade'],
  ['margem_insuficiente', 'Margem insuficiente'],
  ['retorno_abaixo_do_pretendido', 'Retorno abaixo do pretendido'],
  ['prazo_inexequivel', 'Prazo inexequível'],
  ['exigencia_que_a_empresa_nao_atende', 'Exigência que a empresa não atende'],
  ['risco_de_recebimento', 'Risco de recebimento'],
  ['falta_de_caixa', 'Falta de caixa'],
  ['prazo_curto_demais_para_preparar', 'Prazo curto demais para preparar'],
  ['outro', 'Outro'],
] as const

const STATUS_APROVACAO = [
  ['nao_enviada', 'Não enviada'],
  ['aguardando', 'Aguardando resposta'],
  ['aprovada', 'Aprovada'],
  ['recusada', 'Recusada'],
] as const

const moeda = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`)
const dataHora = (v: string | null) => (v ? new Date(v).toLocaleString('pt-BR') : '—')

export default function DecisaoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [agregado, setAgregado] = useState<Agregado | null>(null)
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [dataRetomadaSugerida, setDataRetomadaSugerida] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [cienciaMarcada, setCienciaMarcada] = useState(false)
  const [motivoSelecionado, setMotivoSelecionado] = useState('fora_do_ramo')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [dataRetomada, setDataRetomada] = useState('')
  const [statusAprovacao, setStatusAprovacao] = useState('nao_enviada')
  const [observacaoAprovacao, setObservacaoAprovacao] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/participacoes/${id}/decisao`)
      if (resposta.ok) {
        const dados = await resposta.json()
        setAgregado(dados.agregado)
        setDecisao(dados.decisao)
        setDataRetomadaSugerida(dados.dataRetomadaSugerida)
        if (dados.decisao) {
          setStatusAprovacao(dados.decisao.aprovacaoStatus)
          setObservacaoAprovacao(dados.decisao.aprovacaoObservacao ?? '')
        }
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const registrarDecisao = async (tipo: 'participar' | 'nao_participar' | 'adiar') => {
    if ((agregado?.alertas.length ?? 0) > 0 && !cienciaMarcada) {
      setErro('Confirme a ciência dos alertas antes de registrar a decisão.')
      return
    }
    setEnviando(true)
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/decisao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisao: tipo,
        motivoNaoParticipar: tipo === 'nao_participar' ? motivoSelecionado : undefined,
        motivoOutro: tipo === 'nao_participar' ? motivoOutro : undefined,
        dataRetomadaEm: tipo === 'adiar' ? dataRetomada || dataRetomadaSugerida : undefined,
        cienciaAlerta: cienciaMarcada,
      }),
    })
    const dados = await resposta.json().catch(() => null)
    setEnviando(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar a decisão.')
      return
    }
    setDecisao(dados.decisao)
  }

  const salvarAprovacao = async () => {
    const resposta = await fetch(`/api/participacoes/${id}/decisao/aprovacao`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusAprovacao, observacao: observacaoAprovacao }),
    })
    const dados = await resposta.json().catch(() => null)
    if (resposta.ok) setDecisao(dados.decisao)
    else setErro(dados?.erro ?? 'Registre a decisão antes de registrar a aprovação.')
  }

  if (isPending || !sessao || carregando) return null

  if (!agregado) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Participação não encontrada.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const v = agregado.viabilidadeResultado

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{agregado.participacao.orgao}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{agregado.participacao.objeto}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href="/radar" />}>
            <ArrowLeft />
            Voltar ao radar
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/recurso`} />}><Landmark />Recurso</Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}><FileText />Edital</Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/documentos`} />}><FileStack />Documentos</Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/viabilidade`} />}><Calculator />Viabilidade</Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/precos`} />}>Preços</Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/proposta`} />}>Proposta</Button>
          </div>
        </div>

        {decisao && (
          <Alert>
            <AlertDescription>
              Decisão registrada: <strong>{decisao.decisao}</strong> em {dataHora(decisao.decididoEm)}.
              {decisao.decisao === 'adiar' && decisao.dataRetomadaEm && ` Retomar em ${new Date(decisao.dataRetomadaEm).toLocaleDateString('pt-BR')}.`}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle>Edital</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Modalidade: {agregado.participacao.modalidade ?? '—'} · Plataforma: {agregado.participacao.plataforma ?? '—'}</div>
            <div>Valor estimado: {moeda(agregado.participacao.valorEstimado ? parseFloat(agregado.participacao.valorEstimado) : null)}</div>
            <div>Sessão: {dataHora(agregado.participacao.dataSessaoEm)} ({agregado.participacao.fusoEdital ?? '—'})</div>
            <div className="font-medium">
              {agregado.numerosCongelados.diasAteSessao != null ? `Faltam ${agregado.numerosCongelados.diasAteSessao} dia(s) para a sessão` : 'Sem data de sessão definida'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recurso</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {agregado.ficha ? (
              <>
                <div className="flex items-center gap-2">
                  Semáforo:
                  <Badge className={agregado.ficha.semaforo === 'verde' ? 'bg-green-600 text-white hover:bg-green-600' : agregado.ficha.semaforo === 'amarelo' ? 'bg-amber-500 text-white hover:bg-amber-500' : 'bg-red-600 text-white hover:bg-red-600'}>
                    {agregado.ficha.semaforo ?? '—'}
                  </Badge>
                </div>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {agregado.ficha.semaforoFatores?.map((f, i) => <li key={i}>{f.motivo}</li>)}
                </ul>
                <div>Origem: {agregado.ficha.origem ?? '—'} · Instrumento: {agregado.ficha.instrumento ?? '—'} · Situação: {agregado.ficha.situacao ?? '—'}</div>
                <div>Prazo estimado de recebimento: {dataHora(agregado.ficha.prazoEstimadoPagamentoEm)}</div>
              </>
            ) : (
              <p className="text-muted-foreground">Ficha do recurso ainda não preenchida.</p>
            )}
            <div>
              Indicador de pagamento do órgão:{' '}
              {agregado.indicadorPagamento.quantidadeContratos === 0
                ? 'sem histórico'
                : `prazo médio ${agregado.indicadorPagamento.prazoMedioDias} dia(s), ${agregado.indicadorPagamento.atrasosRegistrados} atraso(s)`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Conformidade</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Itens críticos não atendidos/conferidos: <strong>{agregado.numerosCongelados.itensCriticosNaoConferidos}</strong></div>
            <div>Itens a verificar: {agregado.numerosCongelados.itensAVerificar}</div>
            <div>Documentos vencendo antes da sessão: {agregado.numerosCongelados.documentosVencendoAntesSessao}</div>
            {agregado.acessoriasComPrazoECusto.length > 0 && (
              <div>
                Exigências acessórias:
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {agregado.acessoriasComPrazoECusto.map((a, i) => (
                    <li key={i}>{a.titulo} — prazo {dataHora(a.prazoLimiteEm)}, custo {moeda(a.custoEstimado)}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {v && (
          <Card>
            <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Piso {moeda(v.base.pisoAlvoTeto.piso)} · Alvo {moeda(v.base.pisoAlvoTeto.alvo)} · Teto {moeda(v.base.pisoAlvoTeto.teto)}</div>
              <div>Margem base {pct(v.base.avaliacaoPreco?.margemRealPercentual)} · conservadora {pct(v.conservador.avaliacaoPreco?.margemRealPercentual)}</div>
              <div>Investimento {moeda(v.base.retorno.investimentoNovoDesembolso)} · Retorno {pct(v.base.retorno.retornoSobreInvestido)} · Ciclo {v.base.retorno.cicloDias} dias</div>
              <div>Pico de caixa negativo: {moeda(v.exposicaoCaixa.picoCaixaNegativo)} por {v.exposicaoCaixa.diasExposicao} dia(s)</div>
              {(v.exposicaoCaixa.estouraCaixaLivre || v.exposicaoCaixa.estouraCapacidadeEntrega) && (
                <p className="text-red-600 font-medium">Alerta de capacidade/caixa ativo.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Esforço até a sessão</CardTitle>
            <CardDescription>Dá tempo?</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>Documentos que faltam: {agregado.numerosCongelados.itensAVerificar + agregado.numerosCongelados.documentosVencendoAntesSessao}</div>
            <div>Exigências acessórias pendentes: {agregado.numerosCongelados.acessoriasPendentes}</div>
            <div>Prazo até a sessão: {agregado.numerosCongelados.diasAteSessao ?? '—'} dia(s)</div>
          </CardContent>
        </Card>

        {agregado.alertas.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="space-y-2">
              <div className="font-medium">Alertas antes de confirmar:</div>
              <ul className="list-disc list-inside">
                {agregado.alertas.map((a, i) => <li key={i}>{a.motivo}</li>)}
              </ul>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={cienciaMarcada} onChange={(e) => setCienciaMarcada(e.target.checked)} />
                Estou ciente e quero seguir
              </label>
            </AlertDescription>
          </Alert>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle>Decisão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => registrarDecisao('participar')} disabled={enviando}>Participar</Button>

            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Não participar — motivo</Label>
              <select value={motivoSelecionado} onChange={(e) => setMotivoSelecionado(e.target.value)} className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm">
                {MOTIVOS.map(([v2, r]) => <option key={v2} value={v2}>{r}</option>)}
              </select>
              {motivoSelecionado === 'outro' && (
                <Input placeholder="Descreva o motivo" value={motivoOutro} onChange={(e) => setMotivoOutro(e.target.value)} />
              )}
              <Button variant="outline" onClick={() => registrarDecisao('nao_participar')} disabled={enviando}>Não participar</Button>
            </div>

            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">Adiar decisão — data de retomada (sugestão: {dataRetomadaSugerida ? new Date(dataRetomadaSugerida).toLocaleDateString('pt-BR') : '—'})</Label>
              <Input type="date" value={dataRetomada} onChange={(e) => setDataRetomada(e.target.value)} />
              <Button variant="outline" onClick={() => registrarDecisao('adiar')} disabled={enviando}>Adiar decisão</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aprovação da empresa</CardTitle>
            <CardDescription>Sem portal do cliente ainda — registro manual do que foi respondido por fora do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <select value={statusAprovacao} onChange={(e) => setStatusAprovacao(e.target.value)} className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm">
              {STATUS_APROVACAO.map(([v2, r]) => <option key={v2} value={v2}>{r}</option>)}
            </select>
            <Input placeholder="Observação" value={observacaoAprovacao} onChange={(e) => setObservacaoAprovacao(e.target.value)} />
            <Button size="xs" variant="outline" onClick={salvarAprovacao}>Salvar aprovação</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
