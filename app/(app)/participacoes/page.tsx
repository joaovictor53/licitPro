// app/(app)/participacoes/page.tsx
// Todas as participações da empresa, com busca e filtro por fase do processo.
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Radar, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BadgeEstado, ESTADOS_ENCERRADOS, type ResumoParticipacao } from '@/components/estado-participacao'
import { FASES_DO_PAINEL, faseDoPainelDoEstado, progressoDoProcesso } from '@/lib/etapas-participacao'
import { descreverPrazo, diasAte, formatarDataHora, formatarMoeda } from '@/lib/formatacao'
import { cn } from '@/lib/utils'

type Carga = { estado: 'carregando' } | { estado: 'erro' } | { estado: 'pronto'; participacoes: ResumoParticipacao[] }

const FILTROS = [{ id: 'todas', rotulo: 'Todas' }, ...FASES_DO_PAINEL.map((f) => ({ id: f.id, rotulo: f.rotulo })), { id: 'encerradas', rotulo: 'Encerradas' }]

const pertence = (p: ResumoParticipacao, filtro: string): boolean => {
  if (filtro === 'todas') return true
  if (filtro === 'encerradas') return ESTADOS_ENCERRADOS.includes(p.estado)
  return faseDoPainelDoEstado(p.estado) === filtro && !ESTADOS_ENCERRADOS.includes(p.estado)
}

export default function ParticipacoesPage() {
  const [carga, setCarga] = useState<Carga>({ estado: 'carregando' })
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    fetch('/api/participacoes')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falha'))))
      .then((dados) => setCarga({ estado: 'pronto', participacoes: dados.participacoes }))
      .catch(() => setCarga({ estado: 'erro' }))
  }, [])

  const visiveis = useMemo(() => {
    if (carga.estado !== 'pronto') return []
    const termo = busca.trim().toLowerCase()
    return carga.participacoes.filter(
      (p) => pertence(p, filtro) && (!termo || `${p.orgao} ${p.objeto} ${p.municipio ?? ''} ${p.uf ?? ''}`.toLowerCase().includes(termo))
    )
  }, [carga, filtro, busca])

  const contagem = (id: string) => (carga.estado === 'pronto' ? carga.participacoes.filter((p) => pertence(p, id)).length : 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Participações</h1>
          <p className="text-sm text-muted-foreground">Cada edital que você decidiu acompanhar, do estudo ao contrato.</p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/radar" />}>
          <Radar />
          Buscar editais
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar participação" placeholder="Buscar por órgão, objeto ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
        <div role="group" aria-label="Filtrar por fase" className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                filtro === f.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {f.rotulo}
              {carga.estado === 'pronto' && <span className="ml-1.5 tabular-nums opacity-70">{contagem(f.id)}</span>}
            </button>
          ))}
        </div>
      </div>

      {carga.estado === 'carregando' && (
        <div className="grid animate-pulse gap-3" aria-busy="true" aria-label="Carregando participações">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {carga.estado === 'erro' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm">Não foi possível carregar as participações.</p>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      )}

      {carga.estado === 'pronto' && visiveis.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {carga.participacoes.length === 0 ? 'Você ainda não tem participações. Encontre um edital no radar.' : 'Nenhuma participação para este filtro.'}
          </CardContent>
        </Card>
      )}

      <ul className="grid gap-3">
        {visiveis.map((p) => {
          const dias = diasAte(p.dataSessaoEm)
          return (
            <li key={p.id}>
              <Link
                href={`/participacoes/${p.id}`}
                className="block rounded-xl border bg-card p-4 outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.orgao}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{p.objeto}</p>
                  </div>
                  <BadgeEstado estado={p.estado} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {(p.municipio || p.uf) && <span>{[p.municipio, p.uf].filter(Boolean).join(' / ')}</span>}
                  {p.modalidade && <span>{p.modalidade}</span>}
                  <span>Estimado: {formatarMoeda(p.valorEstimado)}</span>
                  {p.dataSessaoEm && (
                    <span className={cn((dias ?? 9) >= 0 && (dias ?? 9) <= 1 && 'font-medium text-destructive')}>
                      Sessão {formatarDataHora(p.dataSessaoEm)} ({descreverPrazo(dias)})
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${progressoDoProcesso(p.estado)}%` }} />
                    </span>
                    <span className="tabular-nums">{progressoDoProcesso(p.estado)}%</span>
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
