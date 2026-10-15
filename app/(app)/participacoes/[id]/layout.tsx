// app/(app)/participacoes/[id]/layout.tsx
// Cabeçalho com as etapas do processo, comum a todas as telas da participação.

import { CabecalhoParticipacao } from '@/components/cabecalho-participacao'

export default function LayoutParticipacao({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CabecalhoParticipacao />
      {children}
    </>
  )
}
