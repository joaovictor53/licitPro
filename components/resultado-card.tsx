// components/resultado-card.tsx
'use client'

import { Bookmark, Scale, FileText, Lightbulb, ChevronDown, ChevronUp, SearchCheck, Target } from 'lucide-react'
import { NaoConformidade } from '@/types/analise-tipos'
import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface ResultadoCardProps {
  item: NaoConformidade
}

export const ResultadoCard = ({ item }: ResultadoCardProps) => {
  const isMaterial = item.gravidade === 'material'
  const requerVerificacao = item.requer_verificacao_manual === true
  const [expandido, setExpandido] = useState(false)
  const temDetalhes = item.evidencia || item.recomendacao

  const impactoInfo =
    item.impacto_recurso === 'alto'
      ? { label: 'Alto', cls: 'text-red-600' }
      : item.impacto_recurso === 'baixo'
        ? { label: 'Baixo', cls: 'text-slate-500' }
        : item.impacto_recurso === 'medio'
          ? { label: 'Médio', cls: 'text-amber-600' }
          : null

  return (
    <Card
      size="sm"
      className={`mb-3 transition-shadow hover:shadow-md border-l-4 ${
        requerVerificacao ? 'border-l-blue-400' : isMaterial ? 'border-l-red-500' : 'border-l-amber-400'
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold text-sm leading-snug">{item.titulo}</span>
          {requerVerificacao ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 whitespace-nowrap">
              <SearchCheck className="w-3 h-3" />
              Verificação manual
            </Badge>
          ) : (
            <Badge
              variant={isMaterial ? 'destructive' : 'secondary'}
              className={isMaterial ? '' : 'bg-amber-100 text-amber-700'}
            >
              {isMaterial ? '⚠ Material — insanável' : '△ Sanável'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {requerVerificacao && (
          <div className="flex items-start gap-1.5 text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2.5 mb-2 leading-relaxed">
            <SearchCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-600" />
            <span>
              Sem base documental suficiente para confirmar automaticamente
              {isMaterial ? ' (gravidade sugerida: material)' : ' (gravidade sugerida: sanável)'}.
              Confira o trecho no documento original antes de usar este ponto no recurso.
            </span>
          </div>
        )}

        {item.item_edital && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Bookmark className="w-3 h-3 flex-shrink-0" />
            <span>{item.item_edital}</span>
          </p>
        )}

        {impactoInfo && (
          <p className="flex items-center gap-1.5 text-xs mb-2">
            <Target className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Impacto no recurso:</span>
            <span className={`font-semibold ${impactoInfo.cls}`}>{impactoInfo.label}</span>
          </p>
        )}

        <p className="text-sm leading-relaxed mb-2">{item.problema}</p>

        {item.fundamento_legal && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="w-3 h-3 flex-shrink-0" />
            <span>{item.fundamento_legal}</span>
          </p>
        )}

        {/* Botão expandir */}
        {temDetalhes && (
          <Button
            variant="link"
            size="xs"
            onClick={() => setExpandido(!expandido)}
            className="mt-3 px-0"
          >
            {expandido ? (
              <>
                <ChevronUp />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown />
                Ver evidência e recomendação
              </>
            )}
          </Button>
        )}
      </CardContent>

      {/* Detalhes expandíveis */}
      {expandido && temDetalhes && (
        <>
          <Separator />
          <CardContent className="space-y-3">
            {item.evidencia && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Evidência no documento
                  </span>
                  {item.pagina != null && (
                    <Badge variant="outline" className="text-[10px] font-normal py-0">
                      Página {item.pagina}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 border rounded-lg p-2.5 leading-relaxed italic">
                  &ldquo;{item.evidencia}&rdquo;
                </p>
              </div>
            )}

            {item.recomendacao && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Argumento para o recurso
                  </span>
                </div>
                <p className="text-xs text-foreground bg-primary/5 border border-primary/20 rounded-lg p-2.5 leading-relaxed">
                  {item.recomendacao}
                </p>
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}
