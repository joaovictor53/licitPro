// components/readequacao-lance.tsx
// Proposta readequada depois dos lances: o operador informa o valor final (lance), o sistema
// ajusta os preços unitários proporcionalmente, mostra o resultado e as regras do edital, e só
// grava se nenhuma regra for violada. Item a item continua pela tabela de preços acima.
'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RegrasReadequacao, ResultadoReadequacao } from '@/lib/readequacao-proposta'

interface Resposta {
  resultado: ResultadoReadequacao
  regras: RegrasReadequacao
  regrasVieramDoEdital: boolean
  aplicado: boolean
}

const brl = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function ReadequacaoLance({ participacaoId, aoAplicar }: { participacaoId: string; aoAplicar: () => void }) {
  const [lance, setLance] = useState('')
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const enviar = async (aplicar: boolean) => {
    setOcupado(true)
    setErro('')
    const r = await fetch(`/api/participacoes/${participacaoId}/readequacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modo: 'proporcional', lance, aplicar }),
    })
    const dados = await r.json().catch(() => null)
    setOcupado(false)
    if (!r.ok) {
      setErro(dados?.erro ?? 'Não foi possível calcular.')
      return
    }
    setResposta(dados)
    if (dados.aplicado) aoAplicar()
  }

  const resultado = resposta?.resultado

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readequação ao lance</CardTitle>
        <CardDescription>
          Depois da disputa: informe o valor final e o sistema ajusta os preços unitários na mesma proporção, fechando os centavos. Aplicar
          troca os preços ofertados; depois gere a proposta de novo.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 max-w-xs">
          <Label htmlFor="lance-final">Lance final (valor total)</Label>
          <Input id="lance-final" value={lance} onChange={(e) => setLance(e.target.value)} inputMode="decimal" placeholder="ex.: 12.345,67" />
        </div>
        <div className="flex gap-2">
          <Button size="xs" variant="outline" disabled={ocupado || !lance.trim()} onClick={() => enviar(false)}>
            Calcular
          </Button>
          <Button size="xs" disabled={ocupado || !lance.trim() || !resultado || resultado.bloqueada} onClick={() => enviar(true)}>
            Aplicar nos preços
          </Button>
        </div>

        {resposta && (
          <div className="text-sm flex flex-col gap-1">
            <p>
              Total anterior: {brl(resultado!.totalAnterior)} → novo: <strong>{brl(resultado!.totalNovo)}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              {resposta.regrasVieramDoEdital
                ? `Regra lida do edital (pág. ${resposta.regras.pagina}): "${resposta.regras.trecho}"`
                : 'O edital lido não traz a regra: valem o padrão do sistema (não aumentar o unitário; total igual ao lance).'}
            </p>
            {resposta.aplicado && <p className="text-emerald-700">Preços aplicados. Gere a proposta de novo.</p>}
          </div>
        )}

        {resultado?.bloqueada && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1">
                {resultado.violacoes.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {erro && (
          <Alert variant="destructive">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
