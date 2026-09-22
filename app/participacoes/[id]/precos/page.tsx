// app/participacoes/[id]/precos/page.tsx
// Ferramenta 7, Composição de Preço.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Avaliacao {
  situacao: 'abaixo_piso' | 'entre_piso_alvo' | 'no_alvo' | 'perto_teto' | 'acima_teto' | null
  margemUnitaria: number | null
  margemPercentual: number | null
  totalItem: number
}

interface ItemPreco {
  id: string
  ordem: number
  descricao: string
  unidade: string | null
  quantidade: string
  marcaModelo: string | null
  custoUnitario: string | null
  pisoUnitario: string | null
  alvoUnitario: string | null
  tetoUnitario: string | null
  precoOfertado: string | null
  avaliacao: Avaliacao
}

interface VersaoPlanilha {
  id: string
  versao: number
  arquivoNome: string
  createdAt: string
  totais: { totalGeral: number; margemConsolidadaPercentual: number | null }
}

const SITUACAO_LABEL: Record<string, string> = {
  abaixo_piso: 'Abaixo do piso',
  entre_piso_alvo: 'Entre piso e alvo',
  no_alvo: 'No alvo',
  perto_teto: 'Perto do teto',
  acima_teto: 'Acima do teto',
}

const SITUACAO_VARIANTE: Record<string, string> = {
  abaixo_piso: 'bg-red-600 text-white hover:bg-red-600',
  entre_piso_alvo: 'bg-amber-500 text-white hover:bg-amber-500',
  no_alvo: 'bg-emerald-600 text-white hover:bg-emerald-600',
  perto_teto: 'bg-orange-500 text-white hover:bg-orange-500',
  acima_teto: 'bg-red-700 text-white hover:bg-red-700',
}

export default function PrecosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [itens, setItens] = useState<ItemPreco[]>([])
  const [valorEstimado, setValorEstimado] = useState<string | null>(null)
  const [versoes, setVersoes] = useState<VersaoPlanilha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [gerando, setGerando] = useState(false)
  const [descricaoNova, setDescricaoNova] = useState('')
  const [percentualDesconto, setPercentualDesconto] = useState('5')

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respItens, respVersoes] = await Promise.all([
        fetch(`/api/participacoes/${id}/itens-preco`),
        fetch(`/api/participacoes/${id}/planilha-precos`),
      ])
      if (respItens.ok) {
        const dados = await respItens.json()
        setItens(dados.itens ?? [])
        setValorEstimado(dados.valorEstimado)
      }
      if (respVersoes.ok) {
        const dados = await respVersoes.json()
        setVersoes(dados.versoes ?? [])
      }
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const adicionarItem = async () => {
    if (!descricaoNova.trim()) return
    const resposta = await fetch(`/api/participacoes/${id}/itens-preco`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: descricaoNova.trim(), quantidade: '1' }),
    })
    if (resposta.ok) {
      setDescricaoNova('')
      carregar()
    }
  }

  const removerItem = async (itemId: string) => {
    await fetch(`/api/participacoes/${id}/itens-preco/${itemId}`, { method: 'DELETE' })
    carregar()
  }

  const atualizarCampo = async (itemId: string, campo: string, valor: string) => {
    setItens((atual) => atual.map((item) => (item.id === itemId ? { ...item, [campo]: valor } : item)))
  }

  const salvarCampo = async (itemId: string, campo: string, valor: string) => {
    await fetch(`/api/participacoes/${id}/itens-preco/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor || null }),
    })
    carregar()
  }

  const aplicarAlvo = async () => {
    await fetch(`/api/participacoes/${id}/itens-preco/aplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'aplicar_alvo' }),
    })
    carregar()
  }

  const aplicarDesconto = async () => {
    const percentual = parseFloat(percentualDesconto)
    if (!Number.isFinite(percentual)) return
    await fetch(`/api/participacoes/${id}/itens-preco/aplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'desconto_linear', percentualDesconto: percentual }),
    })
    carregar()
  }

  const gerarPlanilha = async () => {
    setErro('')
    setGerando(true)
    const resposta = await fetch(`/api/participacoes/${id}/planilha-precos`, { method: 'POST' })
    const dados = await resposta.json().catch(() => null)
    setGerando(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível gerar a planilha.')
      return
    }
    carregar()
  }

  if (isPending || !sessao || carregando) return null

  const totalGeral = itens.reduce((soma, item) => soma + item.avaliacao.totalItem, 0)
  const itensAcimaTeto = itens.filter((i) => i.avaliacao.situacao === 'acima_teto').length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Composição de Preço</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
            <ArrowLeft />
            Voltar à participação
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/viabilidade`} />}>
              Viabilidade
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/proposta`} />}>
              Proposta
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Itens e preços</CardTitle>
            <CardDescription>
              Sem planilha modelo do edital identificada — a Ferramenta 3 ainda não extrai estrutura de
              planilha, então a geração sempre usa o formato padrão do sistema. Custo, piso e alvo aqui
              são digitados por item; a Ferramenta 4 hoje calcula um agregado único.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={descricaoNova}
                onChange={(e) => setDescricaoNova(e.target.value)}
                placeholder="Descrição do novo item ou lote"
                className="flex-1 h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
              />
              <Button size="xs" onClick={adicionarItem}>
                <Plus />
                Adicionar item
              </Button>
            </div>

            {itens.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd.</TableHead>
                    <TableHead>Marca/modelo</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Piso</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Teto</TableHead>
                    <TableHead>Preço ofertado</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-40 text-sm">{item.descricao}</TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.quantidade}
                          onBlur={(e) => salvarCampo(item.id, 'quantidade', e.target.value)}
                          className="w-16 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.marcaModelo ?? ''}
                          onBlur={(e) => salvarCampo(item.id, 'marcaModelo', e.target.value)}
                          className="w-28 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.custoUnitario ?? ''}
                          onBlur={(e) => salvarCampo(item.id, 'custoUnitario', e.target.value)}
                          className="w-20 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.pisoUnitario ?? ''}
                          onBlur={(e) => salvarCampo(item.id, 'pisoUnitario', e.target.value)}
                          className="w-20 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.alvoUnitario ?? ''}
                          onBlur={(e) => salvarCampo(item.id, 'alvoUnitario', e.target.value)}
                          className="w-20 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.tetoUnitario ?? ''}
                          onBlur={(e) => salvarCampo(item.id, 'tetoUnitario', e.target.value)}
                          className="w-20 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          defaultValue={item.precoOfertado ?? ''}
                          onChange={(e) => atualizarCampo(item.id, 'precoOfertado', e.target.value)}
                          onBlur={(e) => salvarCampo(item.id, 'precoOfertado', e.target.value)}
                          className="w-20 h-8 rounded-md border border-input bg-input/30 px-1 text-xs font-medium"
                        />
                      </TableCell>
                      <TableCell>
                        {item.avaliacao.situacao ? (
                          <Badge className={SITUACAO_VARIANTE[item.avaliacao.situacao]}>{SITUACAO_LABEL[item.avaliacao.situacao]}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem preço</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.avaliacao.totalItem.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-xs" onClick={() => removerItem(item.id)}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {itens.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-3 border-t pt-4">
                <div className="flex gap-2 items-center flex-wrap">
                  <Button variant="outline" size="xs" onClick={aplicarAlvo}>Aplicar preço-alvo em tudo</Button>
                  <div className="flex items-center gap-1">
                    <input
                      value={percentualDesconto}
                      onChange={(e) => setPercentualDesconto(e.target.value)}
                      className="w-14 h-8 rounded-md border border-input bg-input/30 px-1 text-xs"
                    />
                    <Button variant="outline" size="xs" onClick={aplicarDesconto}>% desconto linear</Button>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">Total geral: {totalGeral.toFixed(2)}</div>
                  {valorEstimado && (
                    <div className="text-xs text-muted-foreground">Valor estimado do edital: {Number(valorEstimado).toFixed(2)}</div>
                  )}
                </div>
              </div>
            )}

            {itensAcimaTeto > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{itensAcimaTeto} item(ns) acima do teto do edital — a geração da planilha bloqueia até corrigir.</AlertDescription>
              </Alert>
            )}

            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerar planilha de preços</CardTitle>
            <CardDescription>Toda geração cria uma nova versão. Sai em XLSX, no formato padrão do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={gerarPlanilha} disabled={gerando || itens.length === 0}>
              {gerando ? 'Gerando...' : 'Gerar planilha de preços'}
            </Button>

            {versoes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Versão</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead>Gerada em</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versoes.map((versao) => (
                    <TableRow key={versao.id}>
                      <TableCell>v{versao.versao}</TableCell>
                      <TableCell>{versao.totais.totalGeral.toFixed(2)}</TableCell>
                      <TableCell>{versao.totais.margemConsolidadaPercentual != null ? `${versao.totais.margemConsolidadaPercentual.toFixed(1)}%` : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(versao.createdAt).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <a href={`/api/participacoes/${id}/planilha-precos/${versao.id}/arquivo`} className="text-xs text-primary underline">
                          Baixar
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
