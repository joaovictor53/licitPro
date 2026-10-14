// components/condicoes-proposta.tsx
// Ferramenta 8 — condições comerciais que o edital exige da proposta (validade, prazo de entrega,
// garantia, dados bancários...), lidas do texto do edital com página e trecho, e o que a empresa oferece.
'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CampoExigidoProposta } from '@/lib/exigencias-proposta'
import type { CondicoesOferecidas, UnidadePrazo } from '@/types/proposta-tipos'

const UNIDADES: UnidadePrazo[] = ['horas', 'dias', 'meses', 'anos']
// Marca, modelo e fabricante valem item a item (Composição de Preço), não aqui.
const POR_ITEM = new Set(['marca', 'modelo', 'fabricante'])

const descreverLimite = (campo: CampoExigidoProposta): string => {
  if (campo.limite == null || campo.unidade == null) return `Exigido pelo edital (pág. ${campo.referencia.pagina}).`
  return `O edital exige ${campo.sentido === 'minimo' ? 'no mínimo' : 'no máximo'} ${campo.limite} ${campo.unidade} (pág. ${campo.referencia.pagina}).`
}

export function CondicoesProposta({ participacaoId, aoSalvar }: { participacaoId: string; aoSalvar?: () => void }) {
  const [campos, setCampos] = useState<CampoExigidoProposta[]>([])
  const [valores, setValores] = useState<CondicoesOferecidas>({})
  const [temEdital, setTemEdital] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'ok'; texto: string } | null>(null)

  useEffect(() => {
    fetch(`/api/participacoes/${participacaoId}/condicoes-proposta`)
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        if (!dados) return
        setCampos((dados.campos as CampoExigidoProposta[]).filter((campo) => !POR_ITEM.has(campo.id)))
        setValores(dados.valores ?? {})
        setTemEdital(dados.temEdital)
      })
  }, [participacaoId])

  const alterar = (campoId: string, parcial: { valor?: string; unidade?: UnidadePrazo }) =>
    setValores((atual) => ({ ...atual, [campoId]: { ...atual[campoId], valor: atual[campoId]?.valor ?? '', ...parcial } }))

  const salvar = async () => {
    setSalvando(true)
    setMensagem(null)
    const resposta = await fetch(`/api/participacoes/${participacaoId}/condicoes-proposta`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valores }),
    })
    const dados = await resposta.json().catch(() => null)
    setSalvando(false)
    if (!resposta.ok) {
      setMensagem({ tipo: 'erro', texto: dados?.erro ?? 'Não foi possível salvar.' })
      return
    }
    setMensagem({ tipo: 'ok', texto: 'Condições salvas.' })
    aoSalvar?.()
  }

  if (!temEdital) return null
  if (campos.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Condições da proposta</CardTitle>
        <CardDescription>
          Lidas do texto do edital, com página. Prazo pior que o exigido é recusado. Confira o trecho do edital antes de
          confiar: a leitura é por palavras, não por interpretação.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {campos.map((campo) => (
          <div key={campo.id} className="flex flex-col gap-1">
            <Label htmlFor={`condicao-${campo.id}`}>{campo.rotulo}</Label>
            <div className="flex gap-2">
              <Input
                id={`condicao-${campo.id}`}
                value={valores[campo.id]?.valor ?? ''}
                inputMode={campo.tipo === 'prazo' ? 'numeric' : undefined}
                onChange={(e) => alterar(campo.id, { valor: e.target.value })}
              />
              {campo.tipo === 'prazo' && (
                <select
                  aria-label={`Unidade de ${campo.rotulo}`}
                  className="border rounded-md px-2 text-sm bg-background"
                  value={valores[campo.id]?.unidade ?? campo.unidade ?? 'dias'}
                  onChange={(e) => alterar(campo.id, { unidade: e.target.value as UnidadePrazo })}
                >
                  {UNIDADES.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{descreverLimite(campo)}</p>
            <p className="text-xs text-muted-foreground italic">“{campo.referencia.trecho}”</p>
          </div>
        ))}

        {mensagem && (
          <Alert variant={mensagem.tipo === 'erro' ? 'destructive' : 'default'}>
            <AlertDescription>{mensagem.texto}</AlertDescription>
          </Alert>
        )}

        <Button onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar condições'}
        </Button>
      </CardContent>
    </Card>
  )
}
