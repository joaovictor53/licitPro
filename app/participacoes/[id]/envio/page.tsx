// app/participacoes/[id]/envio/page.tsx
// Ferramenta 10, Envio.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, Send } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Envio {
  prazoFinalEnvioEm: string | null
  dataHoraEnvioEm: string | null
  numeroProtocolo: string | null
  naoEnviadaMotivo: string | null
}

const NIVEL_LABEL: Record<string, string> = {
  importante: 'Importante — 3 dias ou menos',
  critico: 'Crítico — 1 dia ou menos',
  urgente: 'Urgente — 6 horas ou menos',
  bloqueante: 'Prazo vencido',
}

export default function EnvioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [envio, setEnvio] = useState<Envio | null>(null)
  const [conferenciaFinal, setConferenciaFinal] = useState<{ ok: boolean; pendencias: string[] } | null>(null)
  const [nivelAlerta, setNivelAlerta] = useState<string | null>(null)
  const [plataforma, setPlataforma] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [prazo, setPrazo] = useState('')
  const [protocolo, setProtocolo] = useState('')
  const [comprovante, setComprovante] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/participacoes/${id}/envio`)
      if (resposta.ok) {
        const dados = await resposta.json()
        setEnvio(dados.envio)
        setConferenciaFinal(dados.conferenciaFinal)
        setNivelAlerta(dados.nivelAlerta)
        setPlataforma(dados.plataforma)
        if (dados.envio?.prazoFinalEnvioEm) setPrazo(dados.envio.prazoFinalEnvioEm.slice(0, 16))
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const salvarPrazo = async () => {
    await fetch(`/api/participacoes/${id}/envio`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'definir_prazo', prazoFinalEnvioEm: prazo || null }),
    })
    carregar()
  }

  const registrarEnvio = async () => {
    setErro('')
    const resposta = await fetch(`/api/participacoes/${id}/envio`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'registrar_envio', numeroProtocolo: protocolo, comprovanteTexto: comprovante }),
    })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível registrar o envio.')
      return
    }
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Send className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Envio</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/sessao`} />}>
            Registro da Sessão
          </Button>
        </div>

        <Alert>
          <AlertDescription>O sistema nunca envia sozinho ao portal — o envio é sempre manual, feito pelo operador, com a credencial da empresa.</AlertDescription>
        </Alert>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Onde enviar</CardTitle>
            <CardDescription>{plataforma ?? 'Plataforma não informada na participação.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Prazo final de envio</label>
                <input
                  type="datetime-local"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
                />
              </div>
              <Button variant="outline" size="xs" onClick={salvarPrazo}>Salvar prazo</Button>
            </div>
            {nivelAlerta && (
              <Badge className={nivelAlerta === 'bloqueante' ? 'bg-red-700 text-white hover:bg-red-700 w-fit' : 'bg-amber-500 text-white hover:bg-amber-500 w-fit'}>
                {NIVEL_LABEL[nivelAlerta]}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conferência final</CardTitle>
            <CardDescription>Se alguma falhar, bloqueia o registro do envio.</CardDescription>
          </CardHeader>
          <CardContent>
            {conferenciaFinal?.ok ? (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>Tudo conferido — pode registrar o envio.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1">
                    {conferenciaFinal?.pendencias.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registro do envio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {envio?.dataHoraEnvioEm ? (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertDescription>
                  Enviada em {new Date(envio.dataHoraEnvioEm).toLocaleString('pt-BR')} — protocolo {envio.numeroProtocolo}.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <input
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  placeholder="Número de protocolo"
                  className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
                />
                <textarea
                  value={comprovante}
                  onChange={(e) => setComprovante(e.target.value)}
                  placeholder="Comprovante (print, link ou anotação)"
                  className="min-h-16 rounded-md border border-input bg-input/30 px-3 py-2 text-sm"
                />
                <Button onClick={registrarEnvio} disabled={!conferenciaFinal?.ok}>Registrar envio</Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
