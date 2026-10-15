// components/estado-participacao.tsx
// Resumo de participação (o que /api/participacoes devolve) e o selo do estado.

import { Badge } from '@/components/ui/badge'
import { ROTULOS_ESTADO } from '@/lib/etapas-participacao'
import type { EstadoParticipacao } from '@/types/participacao-tipos'
import { cn } from '@/lib/utils'

export interface ResumoParticipacao {
  id: string
  orgao: string
  objeto: string
  estado: EstadoParticipacao
  municipio: string | null
  uf: string | null
  modalidade: string | null
  valorEstimado: string | null
  dataSessaoEm: string | null
  updatedAt: string
}

/** Estados que encerram o acompanhamento: não contam como "em andamento". */
export const ESTADOS_ENCERRADOS: EstadoParticipacao[] = ['descartada', 'encerrada', 'inabilitada']

const COR_POR_ESTADO = (estado: EstadoParticipacao): string => {
  if (estado === 'descartada' || estado === 'encerrada') return 'bg-muted text-muted-foreground'
  if (estado === 'inabilitada') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  if (['habilitada', 'vencedora_provisoria', 'adjudicada', 'homologada', 'contratada'].includes(estado)) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
  }
  if (estado.startsWith('aguardando') || estado === 'suspensa') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  return 'bg-primary/10 text-primary'
}

export function BadgeEstado({ estado, className }: { estado: EstadoParticipacao; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('border-0 font-medium', COR_POR_ESTADO(estado), className)}>
      {ROTULOS_ESTADO[estado] ?? estado}
    </Badge>
  )
}
