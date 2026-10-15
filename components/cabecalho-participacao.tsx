// components/cabecalho-participacao.tsx
// Cabeçalho comum a todas as telas de uma participação: quem é o edital, em que etapa está e
// as etapas do processo como navegação. Substitui a fileira de botões que havia na página principal.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { BadgeEstado, type ResumoParticipacao } from '@/components/estado-participacao'
import { ETAPAS, indiceDaEtapaDaPagina, progressoDoProcesso, situacaoDaEtapa } from '@/lib/etapas-participacao'
import { descreverPrazo, diasAte, formatarDataHora, formatarMoeda } from '@/lib/formatacao'
import { cn } from '@/lib/utils'

export function CabecalhoParticipacao() {
  const { id } = useParams<{ id: string }>()
  const caminho = usePathname()
  const [participacao, setParticipacao] = useState<ResumoParticipacao | null>(null)

  // Reconsulta a cada troca de página: ações de uma ferramenta mudam o estado da participação.
  useEffect(() => {
    let ativo = true
    fetch(`/api/participacoes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((dados) => {
        if (ativo && dados?.participacao) setParticipacao(dados.participacao)
      })
    return () => {
      ativo = false
    }
  }, [id, caminho])

  const base = `/participacoes/${id}`
  const trecho = caminho === base ? '' : caminho.slice(base.length + 1).split('/')[0]
  const etapaVista = indiceDaEtapaDaPagina(trecho)

  if (!participacao) {
    return <div className="h-32 animate-pulse border-b bg-muted/40" aria-busy="true" aria-label="Carregando participação" />
  }

  const dias = diasAte(participacao.dataSessaoEm)
  const descartada = participacao.estado === 'descartada'

  return (
    <div className="border-b bg-card">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <nav aria-label="Trilha" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/participacoes" className="hover:text-foreground hover:underline">
            Participações
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <span className="truncate">{participacao.orgao}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{participacao.orgao}</h1>
            <p className="line-clamp-2 max-w-3xl text-sm text-muted-foreground">{participacao.objeto}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeEstado estado={participacao.estado} />
          </div>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {(participacao.municipio || participacao.uf) && (
            <div className="flex gap-1">
              <dt className="sr-only">Local</dt>
              <dd>{[participacao.municipio, participacao.uf].filter(Boolean).join(' / ')}</dd>
            </div>
          )}
          {participacao.modalidade && (
            <div className="flex gap-1">
              <dt className="sr-only">Modalidade</dt>
              <dd>{participacao.modalidade}</dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt>Estimado:</dt>
            <dd className="font-medium text-foreground">{formatarMoeda(participacao.valorEstimado)}</dd>
          </div>
          {participacao.dataSessaoEm && (
            <div className="flex gap-1">
              <dt>Sessão:</dt>
              <dd className={cn('font-medium', (dias ?? 9) >= 0 && (dias ?? 9) <= 1 ? 'text-destructive' : 'text-foreground')}>
                {formatarDataHora(participacao.dataSessaoEm)} ({descreverPrazo(dias)})
              </dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt>Andamento:</dt>
            <dd className="font-medium text-foreground tabular-nums">{progressoDoProcesso(participacao.estado)}%</dd>
          </div>
        </dl>

        {descartada && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Participação descartada: as etapas abaixo ficam disponíveis só para consulta.</p>
        )}

        {/* Etapas do processo */}
        <ol className="mt-4 flex gap-1 overflow-x-auto pb-1" aria-label="Etapas do processo">
          {ETAPAS.map((etapa, indice) => {
            const situacao = situacaoDaEtapa(indice, participacao.estado)
            const vista = etapaVista === indice
            const href = etapa.paginas[0].caminho ? `${base}/${etapa.paginas[0].caminho}` : base
            return (
              <li key={etapa.id} className="flex shrink-0 items-center">
                <Link
                  href={href}
                  aria-current={vista ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    vista ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                      situacao === 'concluida' && 'border-primary bg-primary text-primary-foreground',
                      situacao === 'atual' && 'border-primary bg-background text-primary ring-2 ring-primary/30',
                      situacao === 'futura' && 'bg-background'
                    )}
                  >
                    {situacao === 'concluida' ? <Check className="size-3" aria-label="concluída" /> : indice + 1}
                  </span>
                  {etapa.rotulo}
                  {situacao === 'atual' && <span className="sr-only"> (etapa atual)</span>}
                </Link>
                {indice < ETAPAS.length - 1 && <span aria-hidden className="mx-0.5 h-px w-3 bg-border" />}
              </li>
            )
          })}
        </ol>

        {/* Páginas da etapa que está sendo vista, quando há mais de uma */}
        {etapaVista !== null && ETAPAS[etapaVista].paginas.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pb-3 pt-1" role="group" aria-label={`Ferramentas de ${ETAPAS[etapaVista].rotulo}`}>
            {ETAPAS[etapaVista].paginas.map((pagina) => (
              <Link
                key={pagina.caminho}
                href={pagina.caminho ? `${base}/${pagina.caminho}` : base}
                aria-current={pagina.caminho === trecho ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  pagina.caminho === trecho ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                {pagina.rotulo}
              </Link>
            ))}
          </div>
        )}
        {(etapaVista === null || ETAPAS[etapaVista].paginas.length <= 1) && <div className="pb-3" />}
      </div>
    </div>
  )
}
