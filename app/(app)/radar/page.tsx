// app/radar/page.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, FileSearch, Radar as RadarIcon, Sparkles, XCircle } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
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
  categoriaRadar: 'relevante' | 'talvez' | 'irrelevante' | null
  notaRadar: number | null
  termosRadar: string[] | null
  alteracoes: { campo: string; antes: string | null; depois: string | null }[]
  semaforoOrgao: { cor: 'verde' | 'amarelo' | 'vermelho' | 'cinza'; pontos: number | null; motivos: string[] }
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

const ROTULOS_ALTERACAO: Record<string, string> = {
  objeto: 'Objeto',
  valorEstimado: 'Valor estimado',
  dataAberturaProposta: 'Abertura das propostas',
  dataEncerramentoProposta: 'Encerramento das propostas',
  modalidade: 'Modalidade',
  linkOrigem: 'Link do processo',
}

const PILULA_SEMAFORO: Record<string, string> = {
  verde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  amarelo: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  vermelho: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  cinza: 'bg-muted text-muted-foreground',
}

const ROTULO_SEMAFORO: Record<string, string> = {
  verde: 'Verde',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
  cinza: 'Cinza',
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
  const [avisoColeta, setAvisoColeta] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | 'relevante' | 'talvez'>('todas')

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
    setAvisoColeta('')
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
    const incompleta = (dados.coleta?.restantes ?? 0) > 0
    if (incompleta) {
      setAvisoColeta(
        `A última busca ficou INCOMPLETA: ${dados.coleta.restantes} janela(s) não terminaram, então pode haver editais que ainda não apareceram. Rode a busca de novo.`
      )
    }
    // Com a coleta incompleta o aviso vai no alerta vermelho; os demais avisos seguem na mensagem.
    setMensagem(dados.aviso && !incompleta ? `${base} ${dados.aviso}` : base)
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
      if (acao === 'analisar') {
        router.push(`/participacoes/${id}/recurso`)
        return
      }
      setParticipacoes((atual) => atual.filter((p) => p.id !== id))
      setNovosIds((atual) => {
        const proximo = new Set(atual)
        proximo.delete(id)
        return proximo
      })
    }
  }

  if (isPending || !sessao) return null

  const visiveis = participacoes.filter((p) => filtroCategoria === 'todas' || p.categoriaRadar === filtroCategoria)
  const totalRelevantes = participacoes.filter((p) => p.categoriaRadar === 'relevante').length
  const totalTalvez = participacoes.filter((p) => p.categoriaRadar === 'talvez').length
  const totalAlterados = participacoes.filter((p) => p.alteracoes?.length > 0).length

  return (
    <div className="bg-background lg:grid lg:grid-cols-[19rem_1fr]">
      {/* Painel de busca, no estilo da barra lateral do Caçador */}
      <aside className="border-b bg-muted/40 px-5 py-6 lg:min-h-screen lg:border-b-0 lg:border-r">
        <h2 className="text-lg font-bold tracking-tight">Radar</h2>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Tipo de busca</Label>
          <div className="grid grid-cols-2 gap-1.5">
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
        </div>

        <div className="mt-4 flex flex-col gap-4 rounded-md border bg-background p-4">
          <p className="text-sm font-medium">Buscar editais</p>

          {form.modoBusca === 'cnae' ? (
            <p className="text-xs text-muted-foreground">
              Usa o CNAE principal da empresa contra a tabela de palavras-chave da Arumã. Cadastre o
              CNAE em <Link href="/perfil" className="underline">Perfil</Link>.
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
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="valorMin">Valor mínimo</Label>
                  <Input
                    id="valorMin"
                    type="number"
                    value={form.faixaValorMin}
                    onChange={(e) => setForm((f) => ({ ...f, faixaValorMin: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="valorMax">Valor máximo</Label>
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
            <Label htmlFor="esfera">Esfera</Label>
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
            <Label htmlFor="estados">Estados (UF, separados por vírgula)</Label>
            <Input
              id="estados"
              value={form.estados}
              onChange={(e) => setForm((f) => ({ ...f, estados: e.target.value }))}
              placeholder="ex: AM, PA"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orgaosIncluir">Órgãos a incluir</Label>
            <Input
              id="orgaosIncluir"
              value={form.orgaosIncluir}
              onChange={(e) => setForm((f) => ({ ...f, orgaosIncluir: e.target.value }))}
              placeholder="trecho do nome, com vírgula"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orgaosExcluir">Órgãos a excluir</Label>
            <Input
              id="orgaosExcluir"
              value={form.orgaosExcluir}
              onChange={(e) => setForm((f) => ({ ...f, orgaosExcluir: e.target.value }))}
              placeholder="trecho do nome, com vírgula"
            />
          </div>

          <Button onClick={ativarRadar} disabled={ativando || carregandoConfig} className="w-full">
            <RadarIcon />
            {ativando ? 'Buscando no PNCP...' : 'Buscar editais'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Sem estado marcado a busca não roda. A coleta continua de onde parou se for interrompida.
          </p>
        </div>
      </aside>

      {/* Área principal: título, avisos e a lista, como nas telas do Caçador */}
      <main className="min-w-0 px-6 py-8 lg:px-10">
        <h1 className="text-4xl font-bold tracking-tight">Radar de Editais</h1>

        {avisoColeta && (
          <Alert variant="destructive" className="mt-5">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{avisoColeta}</AlertDescription>
          </Alert>
        )}
        {erro && (
          <Alert variant="destructive" className="mt-5">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        {mensagem && !erro && (
          <p className="mt-4 text-sm text-muted-foreground">{mensagem}</p>
        )}

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">Editais encontrados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {participacoes.length} na lista · {totalRelevantes} relevante(s) · {totalTalvez} talvez ·{' '}
          {totalAlterados} alterado(s). Ordenados pela sessão mais próxima; um edital só sai daqui
          quando você analisa a fundo ou descarta.
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(['todas', 'relevante', 'talvez'] as const).map((categoria) => (
            <Button
              key={categoria}
              type="button"
              size="sm"
              variant={filtroCategoria === categoria ? 'default' : 'outline'}
              onClick={() => setFiltroCategoria(categoria)}
            >
              {categoria === 'todas' ? 'Todos' : categoria === 'relevante' ? 'Relevantes' : 'Talvez'}
            </Button>
          ))}
        </div>

        {visiveis.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {participacoes.length === 0
              ? 'Nenhum edital na lista ainda. Use “Buscar editais” no painel ao lado.'
              : 'Nenhum edital nesta categoria.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Órgão</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Sessão</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.map((p) => (
                  <TableRow
                    key={p.id}
                    className={novosIds.has(p.id) ? 'bg-emerald-50 dark:bg-emerald-950/30' : undefined}
                  >
                    <TableCell className="align-top">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          p.categoriaRadar === 'relevante'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : p.categoriaRadar === 'talvez'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                              : 'bg-muted text-muted-foreground'
                        }`}
                        title={
                          p.categoriaRadar === 'talvez'
                            ? 'O objeto sozinho não decide. Os itens do edital são consultados para reavaliar.'
                            : undefined
                        }
                      >
                        {p.categoriaRadar === 'relevante' ? 'Relevante' : p.categoriaRadar === 'talvez' ? 'Talvez' : '—'}
                      </span>
                      {p.notaRadar != null && (
                        <div className="mt-1 text-xs text-muted-foreground">Nota {p.notaRadar}</div>
                      )}
                      {novosIds.has(p.id) && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="size-3" />
                          Novo
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-44 align-top whitespace-normal" title={p.orgao}>
                      <div className="font-medium">{p.orgao}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.municipio, p.uf].filter(Boolean).join(' — ') || 'Local não informado'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72 align-top whitespace-normal">
                      {p.alteracoes?.length > 0 && (
                        <span
                          className="mb-1 mr-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          title={p.alteracoes
                            .map((a) => `${ROTULOS_ALTERACAO[a.campo] ?? a.campo}: ${a.antes ?? '—'} → ${a.depois ?? '—'}`)
                            .join('\n')}
                        >
                          Edital alterado
                        </span>
                      )}
                      {p.objeto}
                      {p.termosRadar && p.termosRadar.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Casou com: {p.termosRadar.join(', ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">{formatarValor(p.valorEstimado)}</TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{formatarQuantoFalta(p.dataSessaoEm)}</Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PILULA_SEMAFORO[p.semaforoOrgao.cor]}`}
                        title={`Pagamento do órgão (seu histórico)\n${p.semaforoOrgao.motivos.join('\n')}`}
                      >
                        {ROTULO_SEMAFORO[p.semaforoOrgao.cor]}
                      </span>
                    </TableCell>
                    <TableCell className="align-top">
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
                          aria-label="Descartar"
                        >
                          <XCircle />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}
