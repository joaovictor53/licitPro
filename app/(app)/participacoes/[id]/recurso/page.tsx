// app/participacoes/[id]/recurso/page.tsx
// Ferramenta 2, Ficha do Recurso — primeira tela da participação depois de
// "Analisar a fundo". Mostra de onde vem o dinheiro do contrato e o risco de
// receber, antes de o operador gastar tempo lendo o edital inteiro.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileText, Landmark, Printer } from 'lucide-react'
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
  municipio: string | null
  uf: string | null
  objeto: string
}

interface CampoDotacao {
  valor: string | null
  trecho: string | null
  pagina: number | null
}

interface DotacaoOrcamentaria {
  programaTrabalho: CampoDotacao
  fonteRecurso: CampoDotacao
  elementoDespesa: CampoDotacao
  mencaoConvenioEmendaRepasse: CampoDotacao
}

interface FatorSemaforo {
  nivel: 'verde' | 'amarelo' | 'vermelho'
  motivo: string
}

interface IndicadorPagamentoOrgao {
  prazoMedioDias: number | null
  quantidadeContratos: number
  atrasosRegistrados: number
}

interface FichaRecurso {
  dotacaoOrcamentaria: DotacaoOrcamentaria | null
  origem: string | null
  instrumento: string | null
  situacao: string | null
  numeroInstrumento: string | null
  valorRecurso: string | null
  vigenciaEm: string | null
  prazoEstimadoPagamentoEm: string | null
  evidencia: string | null
  anotacaoOperador: string | null
  semaforo: 'verde' | 'amarelo' | 'vermelho' | null
  semaforoFatores: FatorSemaforo[] | null
  cienciaConfirmada: boolean
  cienciaSemaforo: string | null
  cienciaFatores: FatorSemaforo[] | null
}

const ORIGENS = [
  ['nao_identificado', 'Não identificado'],
  ['federal', 'Federal'],
  ['estadual', 'Estadual'],
  ['municipal', 'Municipal'],
  ['misto', 'Misto'],
  ['terceiro', 'Terceiro'],
] as const

const INSTRUMENTOS = [
  ['dotacao_propria', 'Dotação própria'],
  ['convenio', 'Convênio'],
  ['contrato_repasse', 'Contrato de repasse'],
  ['emenda_parlamentar', 'Emenda parlamentar'],
  ['termo_fomento', 'Termo de fomento'],
  ['financiamento', 'Financiamento'],
  ['outro', 'Outro'],
] as const

const SITUACOES = [
  ['nao_localizado', 'Não localizado'],
  ['apenas_previsto', 'Apenas previsto'],
  ['empenhado', 'Empenhado'],
  ['liquidado', 'Liquidado'],
  ['pago', 'Pago'],
] as const

const SEMAFORO_LABEL: Record<string, string> = { verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho' }
const SEMAFORO_COR: Record<string, string> = {
  verde: 'bg-green-600 text-white hover:bg-green-600',
  amarelo: 'bg-amber-500 text-white hover:bg-amber-500',
  vermelho: 'bg-red-600 text-white hover:bg-red-600',
}

const paraInputDate = (valor: string | null): string => (valor ? valor.slice(0, 10) : '')

const CampoAutoPreenchido = ({ titulo, campo }: { titulo: string; campo: CampoDotacao | undefined }) => (
  <div className="text-sm">
    <div className="font-medium">{titulo}</div>
    {campo?.valor ? (
      <>
        <div className="text-muted-foreground">{campo.valor}</div>
        <details className="mt-0.5">
          <summary className="text-xs text-primary cursor-pointer">Ver trecho do edital{campo.pagina != null ? ` (pág. ${campo.pagina})` : ''}</summary>
          <blockquote className="text-xs mt-1 border-l-2 pl-2 italic text-muted-foreground">&ldquo;{campo.trecho}&rdquo;</blockquote>
        </details>
      </>
    ) : (
      <div className="text-xs text-muted-foreground italic">Não localizado no edital</div>
    )}
  </div>
)

export default function FichaRecursoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [participacao, setParticipacao] = useState<Participacao | null>(null)
  const [ficha, setFicha] = useState<FichaRecurso | null>(null)
  const [indicador, setIndicador] = useState<IndicadorPagamentoOrgao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoCiencia, setConfirmandoCiencia] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    origem: 'nao_identificado',
    instrumento: '',
    situacao: 'nao_localizado',
    numeroInstrumento: '',
    valorRecurso: '',
    vigenciaEm: '',
    prazoEstimadoPagamentoEm: '',
    evidencia: '',
    anotacaoOperador: '',
  })

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respParticipacao, respFicha] = await Promise.all([
        fetch(`/api/participacoes/${id}`),
        fetch(`/api/participacoes/${id}/ficha-recurso`),
      ])
      if (respParticipacao.ok) {
        const dados = await respParticipacao.json()
        setParticipacao(dados.participacao)
      }
      if (respFicha.ok) {
        const dados = await respFicha.json()
        setFicha(dados.ficha)
        setIndicador(dados.indicadorPagamento)
        if (dados.ficha) {
          setForm({
            origem: dados.ficha.origem ?? 'nao_identificado',
            instrumento: dados.ficha.instrumento ?? '',
            situacao: dados.ficha.situacao ?? 'nao_localizado',
            numeroInstrumento: dados.ficha.numeroInstrumento ?? '',
            valorRecurso: dados.ficha.valorRecurso ?? '',
            vigenciaEm: paraInputDate(dados.ficha.vigenciaEm),
            prazoEstimadoPagamentoEm: paraInputDate(dados.ficha.prazoEstimadoPagamentoEm),
            evidencia: dados.ficha.evidencia ?? '',
            anotacaoOperador: dados.ficha.anotacaoOperador ?? '',
          })
        }
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/ficha-recurso`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        instrumento: form.instrumento || null,
        vigenciaEm: form.vigenciaEm || null,
        prazoEstimadoPagamentoEm: form.prazoEstimadoPagamentoEm || null,
      }),
    })
    const dados = await resposta.json().catch(() => null)
    setSalvando(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível salvar a ficha.')
      return
    }
    setFicha(dados.ficha)
    setIndicador(dados.indicadorPagamento)
  }

  const confirmarCiencia = async () => {
    setConfirmandoCiencia(true)
    const resposta = await fetch(`/api/participacoes/${id}/ficha-recurso/ciencia`, { method: 'POST' })
    const dados = await resposta.json().catch(() => null)
    setConfirmandoCiencia(false)
    if (resposta.ok) setFicha(dados.ficha)
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

  const precisaConfirmarCiencia = ficha?.semaforo && ficha.semaforo !== 'verde' && !ficha.cienciaConfirmada

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Landmark className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{participacao.orgao}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{participacao.objeto}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href="/radar" />}>
            <ArrowLeft />
            Voltar ao radar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
              <FileText />
              Ir para o edital
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
            <Button variant="outline" size="xs" onClick={() => window.print()}>
              <Printer />
              Relatório
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ficha do Recurso</CardTitle>
            <CardDescription>
              De onde vem o dinheiro que vai pagar o contrato e qual o risco de receber. Preencher é
              obrigatório para seguir; o resultado não precisa ser bom — o semáforo avisa, nunca bloqueia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm font-medium">Dotação orçamentária encontrada no edital</div>
            {ficha?.dotacaoOrcamentaria ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <CampoAutoPreenchido titulo="Programa de trabalho" campo={ficha.dotacaoOrcamentaria.programaTrabalho} />
                <CampoAutoPreenchido titulo="Fonte de recurso" campo={ficha.dotacaoOrcamentaria.fonteRecurso} />
                <CampoAutoPreenchido titulo="Elemento de despesa" campo={ficha.dotacaoOrcamentaria.elementoDespesa} />
                <CampoAutoPreenchido titulo="Convênio / emenda / repasse" campo={ficha.dotacaoOrcamentaria.mencaoConvenioEmendaRepasse} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Ainda não disponível — envie o edital na aba &ldquo;Ir para o edital&rdquo; para preencher automaticamente.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preenchimento do operador</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <select
                value={form.origem}
                onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              >
                {ORIGENS.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Instrumento</Label>
              <select
                value={form.instrumento}
                onChange={(e) => setForm((f) => ({ ...f, instrumento: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              >
                <option value="">Selecione</option>
                {INSTRUMENTOS.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <select
                value={form.situacao}
                onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              >
                {SITUACOES.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Número do instrumento</Label>
              <Input value={form.numeroInstrumento} onChange={(e) => setForm((f) => ({ ...f, numeroInstrumento: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor do recurso (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.valorRecurso}
                onChange={(e) => setForm((f) => ({ ...f, valorRecurso: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vigência</Label>
              <Input type="date" value={form.vigenciaEm} onChange={(e) => setForm((f) => ({ ...f, vigenciaEm: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo estimado de pagamento</Label>
              <Input
                type="date"
                value={form.prazoEstimadoPagamentoEm}
                onChange={(e) => setForm((f) => ({ ...f, prazoEstimadoPagamentoEm: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Evidência (link ou descrição) — obrigatória se a situação não for &ldquo;não localizado&rdquo;</Label>
              <Input
                value={form.evidencia}
                onChange={(e) => setForm((f) => ({ ...f, evidencia: e.target.value }))}
                placeholder="https://... ou descrição do print/arquivo consultado"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Anotação do operador (não entra no semáforo nem no relatório do cliente)</Label>
              <textarea
                value={form.anotacaoOperador}
                onChange={(e) => setForm((f) => ({ ...f, anotacaoOperador: e.target.value }))}
                rows={3}
                className="w-full rounded-md border border-input bg-input/30 px-3 py-2 text-sm"
              />
            </div>

            {erro && (
              <Alert variant="destructive" className="sm:col-span-2">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <div className="sm:col-span-2 print:hidden">
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar ficha'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {ficha?.semaforo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Semáforo
                <Badge className={SEMAFORO_COR[ficha.semaforo]}>{SEMAFORO_LABEL[ficha.semaforo]}</Badge>
              </CardTitle>
              <CardDescription>Nunca só a cor — sempre a lista do que gerou aquela cor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm">
                {ficha.semaforoFatores?.map((fator, indice) => (
                  <li key={indice} className="flex items-start gap-2">
                    <Badge variant="outline" className={SEMAFORO_COR[fator.nivel]}>{SEMAFORO_LABEL[fator.nivel]}</Badge>
                    <span>{fator.motivo}</span>
                  </li>
                ))}
              </ul>

              {indicador && (
                <>
                  <Separator />
                  <div className="text-xs text-muted-foreground">
                    <div className="font-medium text-foreground text-sm mb-1">Indicador de pagamento do órgão</div>
                    {indicador.quantidadeContratos === 0 ? (
                      <p>Sem histórico de contratos anteriores nesta carteira — amostra ainda zerada.</p>
                    ) : (
                      <p>
                        Prazo médio de {indicador.prazoMedioDias} dia(s) entre empenho e pagamento, com base em{' '}
                        {indicador.quantidadeContratos} contrato(s) e {indicador.atrasosRegistrados} atraso(s) registrado(s).
                      </p>
                    )}
                  </div>
                </>
              )}

              {precisaConfirmarCiencia && (
                <Alert className="print:hidden">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      O semáforo está {SEMAFORO_LABEL[ficha.semaforo].toLowerCase()}. Confirme que está ciente dos fatores
                      acima antes de seguir com esta participação.
                    </span>
                    <Button size="xs" onClick={confirmarCiencia} disabled={confirmandoCiencia}>
                      {confirmandoCiencia ? 'Confirmando...' : 'Estou ciente e quero seguir'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {ficha.cienciaConfirmada && (
                <p className="text-xs text-muted-foreground">
                  Ciência confirmada com semáforo {ficha.cienciaSemaforo ? SEMAFORO_LABEL[ficha.cienciaSemaforo] : '—'}.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
