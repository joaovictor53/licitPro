// components/resultado-card.tsx
'use client'

import { Bookmark, Scale, FileText, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { NaoConformidade } from '@/types/analise-tipos'
import { useState } from 'react'

interface ResultadoCardProps {
  item: NaoConformidade
}

export const ResultadoCard = ({ item }: ResultadoCardProps) => {
  const isMaterial = item.gravidade === 'material'
  const [expandido, setExpandido] = useState(false)
  const temDetalhes = item.evidencia || item.recomendacao

  return (
    <div
      className={`border rounded-xl mb-3 bg-white shadow-sm transition-shadow hover:shadow-md ${
        isMaterial
          ? 'border-red-200 border-l-4 border-l-red-500'
          : 'border-amber-200 border-l-4 border-l-amber-400'
      }`}
    >
      {/* Cabeçalho */}
      <div className="p-4">
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

        <p className="text-sm text-slate-700 leading-relaxed mb-2">{item.problema}</p>

        {item.fundamento_legal && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Scale className="w-3 h-3 flex-shrink-0" />
            <span>{item.fundamento_legal}</span>
          </p>
        )}

        {/* Botão expandir */}
        {temDetalhes && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="flex items-center gap-1 mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            {expandido ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver evidência e recomendação
              </>
            )}
          </button>
        )}
      </div>

      {/* Detalhes expandíveis */}
      {expandido && temDetalhes && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          {item.evidencia && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Evidência no documento
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2.5 leading-relaxed italic">
                &ldquo;{item.evidencia}&rdquo;
              </p>
            </div>
          )}

          {item.recomendacao && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Argumento para o recurso
                </span>
              </div>
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2.5 leading-relaxed">
                {item.recomendacao}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
