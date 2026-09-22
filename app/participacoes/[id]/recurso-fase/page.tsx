// app/participacoes/[id]/recurso-fase/page.tsx
// Ferramenta 14, Recurso (fase recursal) — não confundir com a Ficha do
// Recurso (Ferramenta 2). O sistema não redige peça recursal, só controla
// prazo, protocolo e material com fonte para quem vai redigir.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Scale } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { calcularNivelAlertaRecurso } from '@/lib/alerta-recurso'

interface RecursoProprio {
  id: string
  atoRecorrido: string
  dataHoraAtoEm: string
  intencaoRegistradaEm: string | null
  prazoRazoesEm: string | null
  razoesProtocoladoEm: string | null
  decisaoResultado: string | null
  estado: string
}

interface RecursoTerceiro {
  id: string
  quem: string
  contraOQue: string
  prazoContrarrazoesEm: string | null
  contrarrazoesProtocoladoEm: string | null
  decisaoResultado: string | null
  estado: string
}

const NIVEL_LABEL: Record<string, string> = { em_curso: 'Em curso', ultimo_dia: 'Último dia', vencido: 'Vencido' }
const NIVEL_VARIANTE: Record<string, string> = {
  em_curso: 'bg-slate-500 text-white hover:bg-slate-500',
  ultimo_dia: 'bg-amber-500 text-white hover:bg-amber-500',
  vencido: 'bg-red-700 text-white hover:bg-red-700',
}

export default function RecursoFasePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [recursosProprios, setRecursosProprios] = useState<RecursoProprio[]>([])
  const [recursosTerceiros, setRecursosTerceiros] = useState<RecursoTerceiro[]>([])
  const [materialBase, setMaterialBase] = useState<{ daMatriz: { titulo: string; pagina: number | null; clausula: string | null }[]; daViabilidade: { piso: number; alvo: number; teto: number } | null } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [novoAto, setNovoAto] = useState('')
  const [novaDataAto, setNovaDataAto] = useState('')
  const [novoTerceiroQuem, setNovoTerceiroQuem] = useState('')
  const [novoTerceiroContra, setNovoTerceiroContra] = useState('')
  const [novoTerceiroData, setNovoTerceiroData] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respProprio, respTerceiro] = await Promise.all([
        fetch(`/api/participacoes/${id}/recurso-proprio`),
        fetch(`/api/participacoes/${id}/recurso-terceiro`),
      ])
      if (respProprio.ok) {
        const dados = await respProprio.json()
        setRecursosProprios(dados.recursos ?? [])
        setMaterialBase(dados.materialBase)
      }
      if (respTerceiro.ok) {
        const dados = await respTerceiro.json()
        setRecursosTerceiros(dados.recursos ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const criarRecursoProprio = async () => {
    if (!novoAto.trim() || !novaDataAto) return
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/recurso-proprio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atoRecorrido: novoAto, dataHoraAtoEm: novaDataAto }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar o evento.')
      return
    }
    setNovoAto('')
    setNovaDataAto('')
    carregar()
  }

  const registrarIntencao = async (recursoId: string) => {
    await fetch(`/api/participacoes/${id}/recurso-proprio/${recursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'registrar_intencao' }),
    })
    carregar()
  }

  const protocolarRazoes = async (recursoId: string) => {
    const numero = window.prompt('Número de protocolo das razões:')
    if (!numero) return
    await fetch(`/api/participacoes/${id}/recurso-proprio/${recursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'protocolar_razoes', razoesProtocoloNumero: numero }),
    })
    carregar()
  }

  const registrarDecisaoProprio = async (recursoId: string, resultado: 'acolhido' | 'rejeitado' | 'parcialmente_acolhido') => {
    await fetch(`/api/participacoes/${id}/recurso-proprio/${recursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'registrar_decisao', decisaoResultado: resultado }),
    })
    carregar()
  }

  const criarRecursoTerceiro = async () => {
    if (!novoTerceiroQuem.trim() || !novoTerceiroContra.trim() || !novoTerceiroData) return
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/recurso-terceiro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quem: novoTerceiroQuem, contraOQue: novoTerceiroContra, dataIdentificacaoEm: novoTerceiroData }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar o evento.')
      return
    }
    setNovoTerceiroQuem('')
    setNovoTerceiroContra('')
    setNovoTerceiroData('')
    carregar()
  }

  const protocolarContrarrazoes = async (recursoId: string) => {
    const numero = window.prompt('Número de protocolo das contrarrazões:')
    if (!numero) return
    await fetch(`/api/participacoes/${id}/recurso-terceiro/${recursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'protocolar_contrarrazoes', contrarrazoesProtocoloNumero: numero }),
    })
    carregar()
  }

  const registrarDecisaoTerceiro = async (recursoId: string, resultado: 'acolhido' | 'rejeitado' | 'parcialmente_acolhido') => {
    await fetch(`/api/participacoes/${id}/recurso-terceiro/${recursoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'registrar_decisao', decisaoResultado: resultado }),
    })
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Scale className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Recurso</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
          <ArrowLeft />
          Voltar à participação
        </Button>

        <Alert>
          <AlertDescription>
            O sistema não redige peça recursal — só controla prazo, protocolo e reúne o material com
            fonte (matriz, viabilidade, registro da sessão) para quem vai redigir. Calendário de dias
            úteis conta só sábado/domingo — sem feriado municipal integrado ainda.
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
            <CardTitle>Quando a empresa recorre</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={novoAto} onChange={(e) => setNovoAto(e.target.value)} placeholder="Qual foi o ato (desclassificação, inabilitação...)" className="flex-1 h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <input type="datetime-local" value={novaDataAto} onChange={(e) => setNovaDataAto(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <Button size="xs" onClick={criarRecursoProprio}>Registrar evento</Button>
            </div>

            {recursosProprios.map((r) => {
              const nivel = calcularNivelAlertaRecurso(r.prazoRazoesEm ? new Date(r.prazoRazoesEm) : null)
              return (
                <div key={r.id} className="border rounded-md p-3 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.atoRecorrido}</span>
                    <Badge className="bg-slate-600 text-white hover:bg-slate-600">{r.estado}</Badge>
                  </div>
                  {nivel && <Badge className={`w-fit ${NIVEL_VARIANTE[nivel]}`}>{NIVEL_LABEL[nivel]}</Badge>}
                  <div className="flex gap-2 flex-wrap">
                    {!r.intencaoRegistradaEm && <Button variant="outline" size="xs" onClick={() => registrarIntencao(r.id)}>Registrar intenção de recorrer</Button>}
                    {r.intencaoRegistradaEm && !r.razoesProtocoladoEm && <Button variant="outline" size="xs" onClick={() => protocolarRazoes(r.id)}>Protocolar razões</Button>}
                    {r.razoesProtocoladoEm && !r.decisaoResultado && (
                      <>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoProprio(r.id, 'acolhido')}>Acolhido</Button>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoProprio(r.id, 'rejeitado')}>Rejeitado</Button>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoProprio(r.id, 'parcialmente_acolhido')}>Parcialmente acolhido</Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quando outro recorre contra a empresa</CardTitle>
            <CardDescription>Tão importante quanto o primeiro — empresa que ganhou e não apresenta contrarrazões pode perder por omissão.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={novoTerceiroQuem} onChange={(e) => setNovoTerceiroQuem(e.target.value)} placeholder="Quem recorreu" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <input value={novoTerceiroContra} onChange={(e) => setNovoTerceiroContra(e.target.value)} placeholder="Contra o quê" className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
              <input type="datetime-local" value={novoTerceiroData} onChange={(e) => setNovoTerceiroData(e.target.value)} className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm" />
            </div>
            <Button variant="outline" size="xs" className="w-fit" onClick={criarRecursoTerceiro}>Registrar</Button>

            {recursosTerceiros.map((r) => {
              const nivel = calcularNivelAlertaRecurso(r.prazoContrarrazoesEm ? new Date(r.prazoContrarrazoesEm) : null)
              return (
                <div key={r.id} className="border rounded-md p-3 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.quem} — {r.contraOQue}</span>
                    <Badge className="bg-slate-600 text-white hover:bg-slate-600">{r.estado}</Badge>
                  </div>
                  {nivel && <Badge className={`w-fit ${NIVEL_VARIANTE[nivel]}`}>{NIVEL_LABEL[nivel]}</Badge>}
                  <div className="flex gap-2 flex-wrap">
                    {!r.contrarrazoesProtocoladoEm && <Button variant="outline" size="xs" onClick={() => protocolarContrarrazoes(r.id)}>Protocolar contrarrazões</Button>}
                    {r.contrarrazoesProtocoladoEm && !r.decisaoResultado && (
                      <>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoTerceiro(r.id, 'acolhido')}>Acolhido</Button>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoTerceiro(r.id, 'rejeitado')}>Rejeitado</Button>
                        <Button variant="outline" size="xs" onClick={() => registrarDecisaoTerceiro(r.id, 'parcialmente_acolhido')}>Parcialmente acolhido</Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {materialBase && (
          <Card>
            <CardHeader>
              <CardTitle>Material base (com fonte)</CardTitle>
              <CardDescription>Para quem vai redigir a peça — o sistema não redige.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {materialBase.daViabilidade && (
                <div>Piso técnico (viabilidade): <strong>{materialBase.daViabilidade.piso}</strong> — pode fundamentar inexequibilidade.</div>
              )}
              <div className="space-y-1">
                {materialBase.daMatriz.slice(0, 10).map((item, indice) => (
                  <div key={indice} className="text-xs text-muted-foreground">
                    {item.titulo}{item.clausula ? ` — item ${item.clausula}` : ''}{item.pagina ? `, pág. ${item.pagina}` : ''}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
