// components/plano-select.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PLANOS, type PlanoId } from '@/lib/planos'
import { cn } from '@/lib/utils'

interface PlanoSelectProps {
  userId: string
  plano: PlanoId
}

export function PlanoSelect({ userId, plano }: PlanoSelectProps) {
  const router = useRouter()
  const [salvando, setSalvando] = useState(false)

  const alterar = async (novoPlano: string) => {
    setSalvando(true)
    try {
      const resposta = await fetch(`/api/admin/usuarios/${userId}/plano`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: novoPlano }),
      })
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => null)
        alert(dados?.erro ?? 'Erro ao alterar o plano.')
      }
      router.refresh()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <select
      value={plano}
      disabled={salvando}
      onChange={(e) => alterar(e.target.value)}
      className={cn(
        'h-7 rounded-md border border-input bg-background px-2 text-xs shadow-xs',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 cursor-pointer'
      )}
    >
      {Object.entries(PLANOS).map(([id, p]) => (
        <option key={id} value={id}>
          {p.nome}
        </option>
      ))}
    </select>
  )
}
