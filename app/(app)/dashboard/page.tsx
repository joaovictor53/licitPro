// app/(app)/dashboard/page.tsx
// Painel: o que está em andamento, o que vence logo e o que precisa de ação.
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarClock, ClipboardList, Hourglass, Radar, ShieldAlert, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AvisoEmailVerificado } from '@/components/aviso-email-verificado'
import { BadgeEstado, ESTADOS_ENCERRADOS, type ResumoParticipacao } from '@/components/estado-participacao'
import { FASES_DO_PAINEL, faseDoPainelDoEstado } from '@/lib/etapas-participacao'
import { descreverPrazo, diasAte, formatarDataHora, formatarMoeda, formatarMoedaCompacta } from '@/lib/formatacao'

type Carga = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'pronto'; participacoes: ResumoParticipacao[] }

function Indicador({
  icone: Icone,
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  icone: typeof Wallet
  rotulo: string
  valor: string
  detalhe?: string
  /** Destaca o valor em vermelho: só para o que exige atenção. */
  alerta?: boolean
}) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icone aria-hidden className="size-4" />
          {rotulo}
        </p>
        <p className={`mt-1 text-2xl font-semibold tabular-nums ${alerta ? 'text-destructive' : ''}`}>{valor}</p>
        {detalhe && <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  )
}

function EsqueletoPainel() {
  return (
    <div className="grid animate-pulse gap-4" aria-busy="true" aria-label="Carregando o painel">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-muted" />
      <div className="h-56 rounded-xl bg-muted" />
    </div>
  )
}

export default function PainelPage() {
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' })

  useEffect(() => {
    fetch('/api/participacoes')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falha'))))
      .then((dados) => setCarga({ estado: 'pronto', participacoes: dados.participacoes }))
      .catch(() => setCarga({ estado: 'erro' }))
  }, [])

  const dados = useMemo(() => {
    if (carga.estado !== 'pronto') return null
    const todas = carga.participacoes
    const andamento = todas.filter((p) => !ESTADOS_ENCERRADOS.includes(p.estado))
    const sessoes = andamento
      .filter((p) => p.dataSessaoEm && (diasAte(p.dataSessaoEm) ?? -1) >= 0)
      .sort((a, b) => new Date(a.dataSessaoEm!).getTime() - new Date(b.dataSessaoEm!).getTime())
    const emSeteDias = sessoes.filter((p) => (diasAte(p.dataSessaoEm) ?? 99) <= 7)
    const aguardando = andamento.filter((p) => p.estado.startsWith('aguardando'))
    const valor = andamento.reduce((soma, p) => soma + (p.valorEstimado ? Number(p.valorEstimado) : 0), 0)
    const porFase = FASES_DO_PAINEL.map((fase) => ({ ...fase, total: andamento.filter((p) => faseDoPainelDoEstado(p.estado) === fase.id).length }))
    return { todas, andamento, sessoes, emSeteDias, aguardando, valor, porFase, recentes: todas.slice(0, 5) }
  }, [carga])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">Suas participações, os prazos que se aproximam e o que está esperando por você.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" nativeButton={false} render={<Link href="/radar" />}>
            <Radar />
            Buscar editais
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/analisador" />}>
            <ShieldAlert />
            Analisar concorrente
          </Button>
        </div>
      </div>

      <AvisoEmailVerificado />

      {carga.estado === 'carregando' && <EsqueletoPainel />}

      {carga.estado === 'erro' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm">Não foi possível carregar suas participações.</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      )}

      {dados && dados.todas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Radar className="size-6" />
            </span>
            <div>
              <p className="font-medium">Nenhuma participação ainda</p>
              <p className="text-sm text-muted-foreground">Encontre um edital no radar e clique em analisar a fundo: ele aparece aqui, com todas as etapas do processo.</p>
            </div>
            <Button nativeButton={false} render={<Link href="/radar" />}>
              Abrir o radar de editais
              <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      )}

      {dados && dados.todas.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Indicador icone={ClipboardList} rotulo="Em andamento" valor={String(dados.andamento.length)} detalhe={`${dados.todas.length} no total`} />
            <Indicador
              icone={CalendarClock}
              alerta={dados.emSeteDias.length > 0}
              rotulo="Sessões em 7 dias"
              valor={String(dados.emSeteDias.length)}
              detalhe={dados.sessoes[0] ? `próxima ${descreverPrazo(diasAte(dados.sessoes[0].dataSessaoEm))}` : 'nenhuma marcada'}
            />
            <Indicador icone={Hourglass} rotulo="Esperando ação" valor={String(dados.aguardando.length)} detalhe="documentos, cotação, aprovação, assinatura" />
            <Indicador icone={Wallet} rotulo="Valor estimado em jogo" valor={formatarMoedaCompacta(dados.valor)} detalhe="soma dos editais em andamento" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Funil por fase</CardTitle>
              <CardDescription>Onde estão as participações em andamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {dados.porFase.map((fase) => (
                  <li key={fase.id} className="rounded-lg border p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{fase.rotulo}</p>
                    <p className="text-2xl font-semibold tabular-nums">{fase.total}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${dados.andamento.length ? Math.round((fase.total / dados.andamento.length) * 100) : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Próximas sessões</CardTitle>
                <CardDescription>Em ordem de data.</CardDescription>
              </CardHeader>
              <CardContent>
                {dados.sessoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sessão futura registrada nas participações em andamento.</p>
                ) : (
                  <ul className="divide-y">
                    {dados.sessoes.slice(0, 6).map((p) => {
                      const dias = diasAte(p.dataSessaoEm)
                      return (
                        <li key={p.id}>
                          <Link href={`/participacoes/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{p.orgao}</span>
                              <span className="block truncate text-xs text-muted-foreground">{p.objeto}</span>
                            </span>
                            <span className="shrink-0 text-right">
                              <span className={`block text-sm font-medium ${(dias ?? 9) <= 1 ? 'text-destructive' : ''}`}>{descreverPrazo(dias)}</span>
                              <span className="block text-xs text-muted-foreground">{formatarDataHora(p.dataSessaoEm)}</span>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Atividade recente</CardTitle>
                  <CardDescription>Últimas participações atualizadas.</CardDescription>
                </div>
                <Button size="xs" variant="ghost" nativeButton={false} render={<Link href="/participacoes" />}>
                  Ver todas
                  <ArrowRight />
                </Button>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {dados.recentes.map((p) => (
                    <li key={p.id}>
                      <Link href={`/participacoes/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 outline-none hover:bg-muted/50 focus-visible:bg-muted/50">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.orgao}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.objeto} · {formatarMoeda(p.valorEstimado)}
                          </span>
                        </span>
                        <BadgeEstado estado={p.estado} className="shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
