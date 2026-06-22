// components/texto-copiavel.tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface TextoCopiavelProps {
  titulo: string
  texto: string
  icone: React.ReactNode
}

export const TextoCopiavel = ({ titulo, texto, icone }: TextoCopiavelProps) => {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icone}
          {titulo}
        </div>
        <button
          onClick={copiar}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          aria-label={`Copiar ${titulo}`}
        >
          {copiado ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600 font-medium">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500">Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-72 overflow-y-auto">
        <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
          {texto}
        </pre>
      </div>
    </div>
  )
}
