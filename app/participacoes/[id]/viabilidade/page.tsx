// app/participacoes/[id]/viabilidade/page.tsx
// Ferramenta 4, Viabilidade Financeira e Retorno.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Calculator, FileStack, FileText, Landmark } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface Participacao {
  id: string
  orgao: string
  objeto: string
}

type SituacaoPreco = 'abaixo_piso' | 'entre_piso_alvo' | 'no_alvo' | 'perto_teto' | 'acima_teto'

interface ComposicaoCusto {
  custoAquisicaoUnitario: number
  freteRateadoUnitario: number
  entregaParceladaUnitario: number
  perdaEsperadaUnitario: number
  armazenagemUnitario: number
  maoObraUnitario: number
  rateioCustoFixoUnitario: number
  custoOperacionalUnitario: number
  custoPrazoRecebimentoUnitario: number
  garantiaDespesaUnitario: number
  contingenciaUnitario: number
  tributoEmbutidoUnitario: number
  custoRealUnitario: number
}

interface CenarioViabilidade {
  composicao: ComposicaoCusto
  pisoAlvoTeto: { piso: number; alvo: number; teto: number }
  avaliacaoPreco: { situacao: SituacaoPreco; margemRealUnitaria: number; margemRealPercentual: number } | null
  retorno: {
    investimentoBruto: number
    investimentoNovoDesembolso: number
    cabeNoCapitalDisponivel: boolean
    faltaCapital: number
    lucroLiquidoTotal: number
    retornoSobreInvestido: number | null
    cicloDias: number
    retornoAoMes: number | null
    precoNecessarioParaRetornoDesejado: number
    precoNecessarioCabeNoTeto: boolean
  }
}

interface ResultadoViabilidade {
  base: CenarioViabilidade
  conservador: CenarioViabilidade
  exposicaoCaixa: {
    picoCaixaNegativo: number
    diasExposicao: number
    estouraCaixaLivre: boolean
    faltaCaixa: number
    estouraCapacidadeEntrega: boolean
  }
  resumoComparativo: string
}

interface Viabilidade {
  resultado: ResultadoViabilidade | null
  cienciaEstouroConfirmada: boolean
  precoVencedorUnitario: string | null
}

const SITUACAO_LABEL: Record<SituacaoPreco, string> = {
  abaixo_piso: 'Abaixo do piso',
  entre_piso_alvo: 'Margem comprimida',
  no_alvo: 'No alvo',
  perto_teto: 'Perto do teto',
  acima_teto: 'Acima do teto',
}
const SITUACAO_COR: Record<SituacaoPreco, string> = {
  abaixo_piso: 'bg-red-600 text-white hover:bg-red-600',
  entre_piso_alvo: 'bg-amber-500 text-white hover:bg-amber-500',
  no_alvo: 'bg-green-600 text-white hover:bg-green-600',
  perto_teto: 'bg-amber-500 text-white hover:bg-amber-500',
  acima_teto: 'bg-red-600 text-white hover:bg-red-600',
}

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}%`)

const FORMAS_GARANTIA = [
  ['nenhuma', 'Nenhuma'],
  ['caucao_dinheiro', 'Caução em dinheiro'],
  ['seguro_garantia', 'Seguro-garantia'],
  ['fianca_bancaria', 'Fiança bancária'],
  ['titulo_publico', 'Título público'],
] as const

export default function ViabilidadePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [participacao, setParticipacao] = useState<Participacao | null>(null)
  const [viabilidade, setViabilidade] = useState<Viabilidade | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [calculando, setCalculando] = useState(false)
  const [confirmandoCiencia, setConfirmandoCiencia] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    quantidadeTotal: '', unidade: '', custoAquisicaoUnitario: '', freteTotal: '', numeroEntregas: '1',
    armazenagemTotal: '', maoObraTotal: '', prazoPagamentoFornecedorDias: '', prazoRecebimentoDias: '',
    formaGarantia: 'nenhuma', custoGarantia: '', valorGarantiaCaucao: '', tetoEdital: '',
    precoOfertadoUnitario: '', estoqueJaDisponivelValor: '',
    perdaEsperadaPercentual: '', contingenciaPercentual: '', margemMinimaPercentual: '', aliquotaEfetivaPercentual: '',
    capitalDisponivel: '', retornoDesejadoPercentual: '',
    cenarioConservadorFornecedorPercentual: '10', cenarioConservadorPrazoPercentual: '50', cenarioConservadorPerdaPontosPercentuais: '2',
    precoVencedorUnitario: '',
  })

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respParticipacao, respViabilidade] = await Promise.all([
        fetch(`/api/participacoes/${id}`),
        fetch(`/api/participacoes/${id}/viabilidade`),
      ])
      if (respParticipacao.ok) setParticipacao((await respParticipacao.json()).participacao)
      if (respViabilidade.ok) {
        const dados = await respViabilidade.json()
        setViabilidade(dados.viabilidade)
        setForm((f) => ({
          ...f,
          tetoEdital: dados.viabilidade?.tetoEdital ?? (dados.tetoSugerido ?? ''),
          prazoRecebimentoDias:
            dados.viabilidade?.prazoRecebimentoDias?.toString() ??
            (dados.prazoEstimadoPagamentoEm
              ? String(Math.max(0, Math.round((new Date(dados.prazoEstimadoPagamentoEm).getTime() - Date.now()) / 86_400_000)))
              : ''),
          ...(dados.viabilidade
            ? {
                quantidadeTotal: dados.viabilidade.quantidadeTotal ?? '',
                unidade: dados.viabilidade.unidade ?? '',
                custoAquisicaoUnitario: dados.viabilidade.custoAquisicaoUnitario ?? '',
                freteTotal: dados.viabilidade.freteTotal ?? '',
                numeroEntregas: String(dados.viabilidade.numeroEntregas ?? 1),
                armazenagemTotal: dados.viabilidade.armazenagemTotal ?? '',
                maoObraTotal: dados.viabilidade.maoObraTotal ?? '',
                prazoPagamentoFornecedorDias: dados.viabilidade.prazoPagamentoFornecedorDias?.toString() ?? '',
                formaGarantia: dados.viabilidade.formaGarantia ?? 'nenhuma',
                custoGarantia: dados.viabilidade.custoGarantia ?? '',
                valorGarantiaCaucao: dados.viabilidade.valorGarantiaCaucao ?? '',
                precoOfertadoUnitario: dados.viabilidade.precoOfertadoUnitario ?? '',
                estoqueJaDisponivelValor: dados.viabilidade.estoqueJaDisponivelValor ?? '',
                perdaEsperadaPercentual: dados.viabilidade.perdaEsperadaPercentual ?? '',
                contingenciaPercentual: dados.viabilidade.contingenciaPercentual ?? '',
                margemMinimaPercentual: dados.viabilidade.margemMinimaPercentual ?? '',
                aliquotaEfetivaPercentual: dados.viabilidade.aliquotaEfetivaPercentual ?? '',
                capitalDisponivel: dados.viabilidade.capitalDisponivel ?? '',
                retornoDesejadoPercentual: dados.viabilidade.retornoDesejadoPercentual ?? '',
                cenarioConservadorFornecedorPercentual: dados.viabilidade.cenarioConservadorFornecedorPercentual ?? '10',
                cenarioConservadorPrazoPercentual: dados.viabilidade.cenarioConservadorPrazoPercentual ?? '50',
                cenarioConservadorPerdaPontosPercentuais: dados.viabilidade.cenarioConservadorPerdaPontosPercentuais ?? '2',
                precoVencedorUnitario: dados.viabilidade.precoVencedorUnitario ?? '',
              }
            : {}),
        }))
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const calcular = async () => {
    setCalculando(true)
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/viabilidade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        numeroEntregas: Number(form.numeroEntregas) || 1,
        prazoPagamentoFornecedorDias: Number(form.prazoPagamentoFornecedorDias) || 0,
        prazoRecebimentoDias: Number(form.prazoRecebimentoDias) || 0,
        precoOfertadoUnitario: form.precoOfertadoUnitario || null,
        precoVencedorUnitario: form.precoVencedorUnitario || null,
      }),
    })
    const dados = await resposta.json().catch(() => null)
    setCalculando(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível calcular.')
      return
    }
    setViabilidade(dados.viabilidade)
  }

  const confirmarCiencia = async () => {
    setConfirmandoCiencia(true)
    const resposta = await fetch(`/api/participacoes/${id}/viabilidade/ciencia`, { method: 'POST' })
    const dados = await resposta.json().catch(() => null)
    setConfirmandoCiencia(false)
    if (resposta.ok) setViabilidade(dados.viabilidade)
  }

  if (isPending || !sessao || carregando) return null

  if (!participacao) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Participação não encontrada.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const resultado = viabilidade?.resultado ?? null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Calculator className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{participacao.orgao}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{participacao.objeto}</p>
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
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/recurso`} />}>
              <Landmark />
              Recurso
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
              <FileText />
              Edital
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/documentos`} />}>
              <FileStack />
              Documentos
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
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Insumos</CardTitle>
            <CardDescription>
              Alíquota, custo fixo e demais premissas padrão vêm do{' '}
              <Link href="/empresa/financeiro" className="text-primary underline">perfil financeiro da empresa</Link>, ajustáveis aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Quantidade total</Label><Input type="number" value={form.quantidadeTotal} onChange={(e) => setForm((f) => ({ ...f, quantidadeTotal: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Unidade</Label><Input value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Custo de aquisição unitário (R$)</Label><Input type="number" step="0.0001" value={form.custoAquisicaoUnitario} onChange={(e) => setForm((f) => ({ ...f, custoAquisicaoUnitario: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Frete total (R$)</Label><Input type="number" value={form.freteTotal} onChange={(e) => setForm((f) => ({ ...f, freteTotal: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Número de entregas</Label><Input type="number" min="1" value={form.numeroEntregas} onChange={(e) => setForm((f) => ({ ...f, numeroEntregas: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Armazenagem (R$)</Label><Input type="number" value={form.armazenagemTotal} onChange={(e) => setForm((f) => ({ ...f, armazenagemTotal: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Mão de obra (R$)</Label><Input type="number" value={form.maoObraTotal} onChange={(e) => setForm((f) => ({ ...f, maoObraTotal: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Prazo de pagamento ao fornecedor (dias)</Label><Input type="number" value={form.prazoPagamentoFornecedorDias} onChange={(e) => setForm((f) => ({ ...f, prazoPagamentoFornecedorDias: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Prazo de recebimento (dias)</Label><Input type="number" value={form.prazoRecebimentoDias} onChange={(e) => setForm((f) => ({ ...f, prazoRecebimentoDias: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Forma da garantia</Label>
              <select value={form.formaGarantia} onChange={(e) => setForm((f) => ({ ...f, formaGarantia: e.target.value }))} className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm">
                {FORMAS_GARANTIA.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
            {(form.formaGarantia === 'seguro_garantia' || form.formaGarantia === 'fianca_bancaria') && (
              <div className="space-y-1"><Label className="text-xs">Custo da garantia (R$)</Label><Input type="number" value={form.custoGarantia} onChange={(e) => setForm((f) => ({ ...f, custoGarantia: e.target.value }))} /></div>
            )}
            {(form.formaGarantia === 'caucao_dinheiro' || form.formaGarantia === 'titulo_publico') && (
              <div className="space-y-1"><Label className="text-xs">Valor da caução (R$)</Label><Input type="number" value={form.valorGarantiaCaucao} onChange={(e) => setForm((f) => ({ ...f, valorGarantiaCaucao: e.target.value }))} /></div>
            )}
            <div className="space-y-1"><Label className="text-xs">Teto do edital (R$/unidade)</Label><Input type="number" value={form.tetoEdital} onChange={(e) => setForm((f) => ({ ...f, tetoEdital: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Estoque já disponível (R$)</Label><Input type="number" value={form.estoqueJaDisponivelValor} onChange={(e) => setForm((f) => ({ ...f, estoqueJaDisponivelValor: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premissas</CardTitle>
            <CardDescription>Em branco, usa o padrão do perfil financeiro da empresa.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label className="text-xs">Perda esperada (%)</Label><Input type="number" value={form.perdaEsperadaPercentual} onChange={(e) => setForm((f) => ({ ...f, perdaEsperadaPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Contingência (%)</Label><Input type="number" value={form.contingenciaPercentual} onChange={(e) => setForm((f) => ({ ...f, contingenciaPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Margem mínima (%)</Label><Input type="number" value={form.margemMinimaPercentual} onChange={(e) => setForm((f) => ({ ...f, margemMinimaPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Alíquota efetiva (%)</Label><Input type="number" value={form.aliquotaEfetivaPercentual} onChange={(e) => setForm((f) => ({ ...f, aliquotaEfetivaPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Capital disponível (R$)</Label><Input type="number" value={form.capitalDisponivel} onChange={(e) => setForm((f) => ({ ...f, capitalDisponivel: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Retorno líquido desejado (%)</Label><Input type="number" value={form.retornoDesejadoPercentual} onChange={(e) => setForm((f) => ({ ...f, retornoDesejadoPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Conservador: fornecedor mais caro (%)</Label><Input type="number" value={form.cenarioConservadorFornecedorPercentual} onChange={(e) => setForm((f) => ({ ...f, cenarioConservadorFornecedorPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Conservador: prazo mais lento (%)</Label><Input type="number" value={form.cenarioConservadorPrazoPercentual} onChange={(e) => setForm((f) => ({ ...f, cenarioConservadorPrazoPercentual: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Conservador: perda extra (pontos %)</Label><Input type="number" value={form.cenarioConservadorPerdaPontosPercentuais} onChange={(e) => setForm((f) => ({ ...f, cenarioConservadorPerdaPontosPercentuais: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Preço ofertado (R$/unidade) — opcional, para avaliar contra piso/alvo/teto</Label>
              <Input type="number" step="0.0001" value={form.precoOfertadoUnitario} onChange={(e) => setForm((f) => ({ ...f, precoOfertadoUnitario: e.target.value }))} />
            </div>
            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            <Button onClick={calcular} disabled={calculando}>
              {calculando ? 'Calculando...' : 'Calcular viabilidade'}
            </Button>
          </CardContent>
        </Card>

        {resultado && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Piso, alvo e teto</CardTitle>
                <CardDescription>Único bloqueio é o teto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-xs text-muted-foreground">Piso</div><div className="font-bold">{moeda(resultado.base.pisoAlvoTeto.piso)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Alvo</div><div className="font-bold">{moeda(resultado.base.pisoAlvoTeto.alvo)}</div></div>
                  <div><div className="text-xs text-muted-foreground">Teto</div><div className="font-bold">{moeda(resultado.base.pisoAlvoTeto.teto)}</div></div>
                </div>
                {resultado.base.avaliacaoPreco && (
                  <div className="flex items-center gap-2 justify-center">
                    <Badge className={SITUACAO_COR[resultado.base.avaliacaoPreco.situacao]}>{SITUACAO_LABEL[resultado.base.avaliacaoPreco.situacao]}</Badge>
                    <span className="text-sm text-muted-foreground">margem real de {pct(resultado.base.avaliacaoPreco.margemRealPercentual)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Composição do custo real unitário</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="text-sm space-y-1">
                  {([
                    ['Custo de aquisição', resultado.base.composicao.custoAquisicaoUnitario],
                    ['Frete rateado', resultado.base.composicao.freteRateadoUnitario],
                    ['Entrega parcelada', resultado.base.composicao.entregaParceladaUnitario],
                    ['Perda esperada', resultado.base.composicao.perdaEsperadaUnitario],
                    ['Armazenagem', resultado.base.composicao.armazenagemUnitario],
                    ['Mão de obra', resultado.base.composicao.maoObraUnitario],
                    ['Rateio de custo fixo', resultado.base.composicao.rateioCustoFixoUnitario],
                    ['Custo do prazo de recebimento', resultado.base.composicao.custoPrazoRecebimentoUnitario],
                    ['Garantia (despesa)', resultado.base.composicao.garantiaDespesaUnitario],
                    ['Contingência', resultado.base.composicao.contingenciaUnitario],
                    ['Tributo embutido', resultado.base.composicao.tributoEmbutidoUnitario],
                  ] as const).map(([rotulo, valor]) => (
                    <div key={rotulo} className="flex justify-between">
                      <dt className="text-muted-foreground">{rotulo}</dt>
                      <dd>{moeda(valor)}</dd>
                    </div>
                  ))}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <dt>Custo real unitário</dt>
                    <dd>{moeda(resultado.base.composicao.custoRealUnitario)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Análise de retorno</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Investimento necessário</span><span className="font-medium">{moeda(resultado.base.retorno.investimentoNovoDesembolso)}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cabe no capital disponível</span>
                  <span className={resultado.base.retorno.cabeNoCapitalDisponivel ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {resultado.base.retorno.cabeNoCapitalDisponivel ? 'Sim' : `Faltam ${moeda(resultado.base.retorno.faltaCapital)}`}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Lucro líquido estimado</span><span className="font-medium">{moeda(resultado.base.retorno.lucroLiquidoTotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retorno sobre o investido</span><span className="font-medium">{pct(resultado.base.retorno.retornoSobreInvestido)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ciclo</span><span className="font-medium">{resultado.base.retorno.cicloDias} dias</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retorno ao mês</span><span className="font-medium">{pct(resultado.base.retorno.retornoAoMes)}</span></div>
                {!resultado.base.retorno.precoNecessarioCabeNoTeto && (
                  <Alert className="mt-2">
                    <AlertDescription>
                      Para atingir o retorno desejado, o preço precisa ser {moeda(resultado.base.retorno.precoNecessarioParaRetornoDesejado)} por
                      unidade, e o teto do edital é {moeda(resultado.base.pisoAlvoTeto.teto)}. Este pregão não entrega o retorno pretendido.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cenários base × conservador</CardTitle>
                <CardDescription>{resultado.resumoComparativo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-1">Base</div>
                    <div>Custo real: {moeda(resultado.base.composicao.custoRealUnitario)}</div>
                    <div>Investimento: {moeda(resultado.base.retorno.investimentoNovoDesembolso)}</div>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Conservador</div>
                    <div>Custo real: {moeda(resultado.conservador.composicao.custoRealUnitario)}</div>
                    <div>Investimento: {moeda(resultado.conservador.retorno.investimentoNovoDesembolso)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(resultado.exposicaoCaixa.estouraCaixaLivre || resultado.exposicaoCaixa.estouraCapacidadeEntrega) && (
              <Card className="border-red-600">
                <CardHeader>
                  <CardTitle className="text-red-600">Exposição de caixa e capacidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {resultado.exposicaoCaixa.estouraCaixaLivre && (
                    <p>Este contrato exige {moeda(resultado.exposicaoCaixa.picoCaixaNegativo)} de caixa por {resultado.exposicaoCaixa.diasExposicao} dias — faltam {moeda(resultado.exposicaoCaixa.faltaCaixa)} frente ao caixa livre e crédito disponível.</p>
                  )}
                  {resultado.exposicaoCaixa.estouraCapacidadeEntrega && <p>O volume solicitado excede a capacidade de entrega mensal cadastrada.</p>}
                  {!viabilidade?.cienciaEstouroConfirmada ? (
                    <Button size="xs" onClick={confirmarCiencia} disabled={confirmandoCiencia}>
                      {confirmandoCiencia ? 'Confirmando...' : 'Estou ciente e quero seguir'}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ciência confirmada.</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Comparar com o vencedor</CardTitle>
                <CardDescription>Dá base para questionar, não afirma inexequibilidade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Preço do vencedor (R$/unidade)</Label>
                  <Input type="number" step="0.0001" value={form.precoVencedorUnitario} onChange={(e) => setForm((f) => ({ ...f, precoVencedorUnitario: e.target.value }))} />
                </div>
                {form.precoVencedorUnitario && (
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const vencedor = parseFloat(form.precoVencedorUnitario)
                      const diff = ((vencedor - resultado.base.pisoAlvoTeto.piso) / resultado.base.pisoAlvoTeto.piso) * 100
                      return `${diff >= 0 ? diff.toFixed(1) + '% acima' : Math.abs(diff).toFixed(1) + '% abaixo'} do seu piso calculado (${moeda(resultado.base.pisoAlvoTeto.piso)}).`
                    })()}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
