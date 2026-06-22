// components/resultado-card.tsx

import { Bookmark, Scale } from 'lucide-react'
import { NaoConformidade } from '@/types/analise-tipos'

interface ResultadoCardProps {
  item: NaoConformidade
}

export const ResultadoCard = ({ item }: ResultadoCardProps) => {
  const isMaterial = item.gravidade === 'material'

  return (
    <div
      className={`border rounded-xl p-4 mb-3 bg-white shadow-sm transition-shadow hover:shadow-md ${
        isMaterial
          ? 'border-red-200 border-l-4 border-l-red-500'
          : 'border-amber-200 border-l-4 border-l-amber-400'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-semibold text-sm text-slate-800 leading-snug">{item.titulo}</span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium ${
            isMaterial
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isMaterial ? '⚠ Material — insanável' : '△ Sanável'}
        </span>
      </div>

      {item.item_edital && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <Bookmark className="w-3 h-3 flex-shrink-0" />
          <span>{item.item_edital}</span>
        </p>
      )}

      <p className="text-sm text-slate-600 leading-relaxed mb-2">{item.problema}</p>

      {item.fundamento_legal && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Scale className="w-3 h-3 flex-shrink-0" />
          <span>{item.fundamento_legal}</span>
        </p>
      )}
    </div>
  )
}
