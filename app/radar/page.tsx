// app/radar/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileSearch, Radar as RadarIcon, Sparkles, XCircle } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

interface ParticipacaoRadar {
  id: string
  orgao: string
  municipio: string | null
  uf: string | null
  esfera: string | null
  objeto: string
  modalidade: string | null
  valorEstimado: string | null
  dataSessaoEm: string | null
  linkPortalOrigem: string | null
}

interface RadarConfigForm {
  modoBusca: 'cnae' | 'livre'
  esfera: 'federal' | 'estadual' | 'municipal' | 'privado' | ''
  estados: string
  orgaosIncluir: string
  orgaosExcluir: string
  textoLivre: string
  faixaValorMin: string
  faixaValorMax: string
}

const CONFIG_VAZIA: RadarConfigForm = {
  modoBusca: 'cnae',
  esfera: '',
  estados: '',
  orgaosIncluir: '',
  orgaosExcluir: '',
  textoLivre: '',
  faixaValorMin: '',
  faixaValorMax: '',
}

const separarLista = (texto: string): string[] =>
  texto
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

const formatarValor = (valor: string | null): string => {
  if (!valor) return 'Não informado'
  const numero = Number(valor)
  return Number.isNaN(numero)
    ? valor
    : numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatarQuantoFalta = (dataSessaoEm: string | null): string => {
  if (!dataSessaoEm) return 'Sessão não informada'
  const diffMs = new Date(dataSessaoEm).getTime() - Date.now()
  if (diffMs <= 0) return 'Sessão já passou'
  const dias = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  const horas = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  return dias > 0 ? `${dias}d ${horas}h` : `${horas}h`
}

export default function RadarPage() {
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [form, setForm] = useState<RadarConfigForm>(CONFIG_VAZIA)
  const [participacoes, setParticipacoes] = useState<ParticipacaoRadar[]>([])
  const [carregandoConfig, setCarregandoConfig] = useState(true)
  const [ativando, setAtivando] = useState(false)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [novosIds, setNovosIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/radar')
      if (!resposta.ok) return
      const dados = await resposta.json()
      setForm({
        modoBusca: dados.config.modoBusca,
        esfera: dados.config.esfera ?? '',
        estados: (dados.config.estados ?? []).join(', '),
        orgaosIncluir: (dados.config.orgaosIncluir ?? []).join(', '),
        orgaosExcluir: (dados.config.orgaosExcluir ?? []).join(', '),
        textoLivre: dados.config.textoLivre ?? '',
        faixaValorMin: dados.config.faixaValorMin?.toString() ?? '',
        faixaValorMax: dados.config.faixaValorMax?.toString() ?? '',
      })
      setParticipacoes(dados.participacoes ?? [])
    } finally {
      setCarregandoConfig(false)
    }
  }, [])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const ativarRadar = async () => {
    setErro('')
    setMensagem('')
    setAtivando(true)

    const resposta = await fetch('/api/radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modoBusca: form.modoBusca,
        esfera: form.esfera || null,
        estados: separarLista(form.estados).map((e) => e.toUpperCase()),
        orgaosIncluir: separarLista(form.orgaosIncluir),
        orgaosExcluir: separarLista(form.orgaosExcluir),
        textoLivre: form.textoLivre.trim() || null,
        faixaValorMin: form.faixaValorMin ? Number(form.faixaValorMin) : null,
        faixaValorMax: form.faixaValorMax ? Number(form.faixaValorMax) : null,
      }),
    })

    const dados = await resposta.json().catch(() => null)
    setAtivando(false)

    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível ativar o radar.')
      return
    }

    setParticipacoes(dados.participacoes ?? [])
    setNovosIds(new Set<string>(dados.novosIds ?? []))
    const base = `${dados.encontrados} edital(is) compatível(is) encontrado(s) — ${dados.novos} novo(s) na lista.`
    setMensagem(dados.aviso ? `${base} ${dados.aviso}` : base)
  }

  const decidir = async (id: string, acao: 'analisar' | 'descartar') => {
    setProcessandoId(id)
    const resposta = await fetch(`/api/radar/participacoes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao }),
    })
    setProcessandoId(null)

    if (resposta.ok) {
      setParticipacoes((atual) => atual.filter((p) => p.id !== id))
      setNovosIds((atual) => {
        const proximo = new Set(atual)
        proximo.delete(id)
        return proximo
      })
    }
  }

  if (isPending || !sessao) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <RadarIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Radar de Editais</h1>
            <p className="text-xs text-muted-foreground font-medium">
              Busca no PNCP a partir do CNAE da empresa ou de texto livre
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Button
          variant="outline"
          size="xs"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft />
          Voltar ao painel
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>
              Os filtros afunilam: esfera → estado → município → órgão. Sem estado marcado, o
              radar não roda — é o campo mínimo para não buscar o Brasil inteiro numa chamada só.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.modoBusca === 'cnae' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm((f) => ({ ...f, modoBusca: 'cnae' }))}
                disabled={carregandoConfig}
              >
                Por CNAE
              </Button>
              <Button
                type="button"
                variant={form.modoBusca === 'livre' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm((f) => ({ ...f, modoBusca: 'livre' }))}
                disabled={carregandoConfig}
              >
                Livre
              </Button>
            </div>

            {form.modoBusca === 'cnae' ? (
              <p className="text-xs text-muted-foreground">
                Busca usando o CNAE principal cadastrado da empresa contra a tabela de palavras-chave
                mantida pela Arumã. Cadastre o CNAE em <Link href="/perfil" className="underline">Perfil</Link>.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="textoLivre">O que procurar</Label>
                  <Input
                    id="textoLivre"
                    value={form.textoLivre}
                    onChange={(e) => setForm((f) => ({ ...f, textoLivre: e.target.value }))}
                    placeholder="ex: merenda escolar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="valorMin">Valor mínimo (opcional)</Label>
                    <Input
                      id="valorMin"
                      type="number"
                      value={form.faixaValorMin}
                      onChange={(e) => setForm((f) => ({ ...f, faixaValorMin: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="valorMax">Valor máximo (opcional)</Label>
                    <Input
                      id="valorMax"
                      type="number"
                      value={form.faixaValorMax}
                      onChange={(e) => setForm((f) => ({ ...f, faixaValorMax: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="esfera">Esfera (opcional)</Label>
              <select
                id="esfera"
                value={form.esfera}
                onChange={(e) => setForm((f) => ({ ...f, esfera: e.target.value as RadarConfigForm['esfera'] }))}
                className="h-9 w-full rounded-md border border-input bg-input/30 px-3 text-sm"
              >
                <option value="">Todas</option>
                <option value="federal">Federal</option>
                <option value="estadual">Estadual</option>
                <option value="municipal">Municipal</option>
                <option value="privado">Privado</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estados">Estados (UF, obrigatório — separados por vírgula)</Label>
              <Input
                id="estados"
                value={form.estados}
                onChange={(e) => setForm((f) => ({ ...f, estados: e.target.value }))}
                placeholder="ex: AM, PA"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="orgaosIncluir">Órgãos a incluir (opcional)</Label>
                <Input
                  id="orgaosIncluir"
                  value={form.orgaosIncluir}
                  onChange={(e) => setForm((f) => ({ ...f, orgaosIncluir: e.target.value }))}
                  placeholder="trecho do nome, separado por vírgula"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="orgaosExcluir">Órgãos a excluir (opcional)</Label>
                <Input
                  id="orgaosExcluir"
                  value={form.orgaosExcluir}
                  onChange={(e) => setForm((f) => ({ ...f, orgaosExcluir: e.target.value }))}
                  placeholder="trecho do nome, separado por vírgula"
                />
              </div>
            </div>

            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            {mensagem && !erro && (
              <Alert>
                <AlertDescription>{mensagem}</AlertDescription>
              </Alert>
            )}

            <Button onClick={ativarRadar} disabled={ativando || carregandoConfig} className="w-full">
              <RadarIcon />
              {ativando ? 'Buscando no PNCP...' : 'Ativar radar'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editais encontrados</CardTitle>
            <CardDescription>
              Ordenados pela sessão mais próxima. A lista é cumulativa — um edital só sai daqui
              quando você clica em &ldquo;Analisar a fundo&rdquo; ou no X para descartar. Se a
              busca acima der erro, esta lista continua mostrando o que já estava aqui antes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {participacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum edital na lista ainda. Ative o radar para buscar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Órgão</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Sessão</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participacoes.map((p) => (
                    <TableRow
                      key={p.id}
                      className={novosIds.has(p.id) ? 'bg-emerald-50 dark:bg-emerald-950/30' : undefined}
                    >
                      <TableCell className="max-w-40 truncate" title={p.orgao}>
                        {novosIds.has(p.id) && (
                          <Badge className="mb-1 bg-emerald-600 text-white hover:bg-emerald-600">
                            <Sparkles />
                            Novo edital encontrado
                          </Badge>
                        )}
                        <div className="font-medium truncate">{p.orgao}</div>
                        <div className="text-xs text-muted-foreground">
                          {[p.municipio, p.uf].filter(Boolean).join(' — ') || 'Local não informado'}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-60 whitespace-normal">{p.objeto}</TableCell>
                      <TableCell>{formatarValor(p.valorEstimado)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatarQuantoFalta(p.dataSessaoEm)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={processandoId === p.id}
                            onClick={() => decidir(p.id, 'analisar')}
                          >
                            <FileSearch />
                            Analisar a fundo
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={processandoId === p.id}
                            onClick={() => decidir(p.id, 'descartar')}
                          >
                            <XCircle />
                          </Button>
                        </div>
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
