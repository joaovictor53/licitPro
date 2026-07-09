// components/texto-copiavel.tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icone}
          {titulo}
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="xs" onClick={copiar} aria-label={`Copiar ${titulo}`}>
            {copiado ? (
              <>
                <Check className="text-emerald-500" />
                <span className="text-emerald-600 font-medium">Copiado!</span>
              </>
            ) : (
              <>
                <Copy />
                Copiar
              </>
            )}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <div className="bg-muted/50 border rounded-lg p-3 max-h-72 overflow-y-auto">
          <pre className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
            {texto}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
