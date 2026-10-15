// app/empresa/financeiro/page.tsx
// Ferramenta 4 — dados financeiros da empresa, usados como padrão em toda
// participação (ajustáveis participação a participação na aba Viabilidade).
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Wallet } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CAMPOS = [
  ['aliquotaEfetivaPercentual', 'Alíquota efetiva (%) — informada pelo contador'],
  ['custoFixoMensal', 'Custo fixo mensal (R$)'],
  ['faturamentoMedioMensal', 'Faturamento médio mensal (R$)'],
  ['custoDinheiroMensalPercentual', 'Custo do dinheiro (% ao mês)'],
  ['contingenciaPadraoPercentual', 'Contingência padrão (%)'],
  ['perdaEsperadaPadraoPercentual', 'Perda esperada padrão (%)'],
  ['margemMinimaPercentual', 'Margem mínima (%)'],
  ['capitalDisponivelPadrao', 'Capital disponível padrão (R$)'],
  ['retornoDesejadoPadraoPercentual', 'Retorno líquido desejado padrão (%)'],
  ['prazoMaximoSemCaixaDias', 'Prazo máximo sem caixa (dias)'],
  ['caixaLivre', 'Caixa livre (R$)'],
  ['creditoDisponivel', 'Crédito disponível (R$)'],
  ['estoqueAtualValor', 'Estoque atual (R$)'],
  ['capacidadeEntregaMensal', 'Capacidade de entrega mensal (unidades)'],
] as const

type Campo = (typeof CAMPOS)[number][0]

export default function PerfilFinanceiroPage() {
  const router = useRouter()
  const { data: sessao, isPending } = useSession()
  const [form, setForm] = useState<Record<Campo, string>>(() =>
    Object.fromEntries(CAMPOS.map(([campo]) => [campo, ''])) as Record<Campo, string>
  )
  const [aliquotaInfo, setAliquotaInfo] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/empresa/perfil-financeiro')
      if (resposta.ok) {
        const dados = await resposta.json()
        if (dados.perfil) {
          setForm((atual) => {
            const proximo = { ...atual }
            for (const [campo] of CAMPOS) {
              const valor = dados.perfil[campo]
              proximo[campo] = valor != null ? String(valor) : ''
            }
            return proximo
          })
          if (dados.perfil.aliquotaInformadaEm) {
            const data = new Date(dados.perfil.aliquotaInformadaEm)
            const meses = (Date.now() - data.getTime()) / (1000 * 60 * 60 * 24 * 30)
            setAliquotaInfo(
              `Informada em ${data.toLocaleDateString('pt-BR')}${meses > 6 ? ' — mais de 6 meses, revise com o contador.' : '.'}`
            )
          }
        }
      }
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const salvar = async () => {
    setSalvando(true)
    setErro('')
    const corpo = Object.fromEntries(
      CAMPOS.map(([campo]) =>
        campo === 'prazoMaximoSemCaixaDias'
          ? [campo, form[campo] ? Number(form[campo]) : null]
          : [campo, form[campo] || null]
      )
    )
    const resposta = await fetch('/api/empresa/perfil-financeiro', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    setSalvando(false)
    if (!resposta.ok) {
      setErro('Não foi possível salvar.')
      return
    }
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <Wallet className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Perfil financeiro da empresa</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Button variant="outline" size="xs" nativeButton={false} render={<Link href="/radar" />}>
          <ArrowLeft />
          Voltar ao radar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Dados usados como padrão em toda participação</CardTitle>
            <CardDescription>
              Podem ser ajustados participação a participação na aba Viabilidade. Tributo é sempre
              o percentual informado pelo contador — o sistema nunca calcula alíquota sozinho.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            {CAMPOS.map(([campo, rotulo]) => (
              <div key={campo} className="space-y-1.5">
                <Label>{rotulo}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form[campo]}
                  onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                />
                {campo === 'aliquotaEfetivaPercentual' && aliquotaInfo && (
                  <p className="text-xs text-muted-foreground">{aliquotaInfo}</p>
                )}
              </div>
            ))}

            {erro && (
              <Alert variant="destructive" className="sm:col-span-2">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <div className="sm:col-span-2">
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
