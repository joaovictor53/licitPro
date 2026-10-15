// app/participacoes/[id]/documentos/page.tsx
// Ferramenta 6, Preparação Documental — aba "Documentos" da participação:
// checklist vindo da matriz de conformidade, dossiê da empresa e exigências
// acessórias.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileStack, Landmark } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Participacao {
  id: string
  orgao: string
  objeto: string
}

interface Documento {
  id: string
  tipo: string
  nome: string
  validadeEm: string | null
}

interface ItemChecklist {
  id: string
  situacao: 'ok' | 'vence_antes' | 'faltando' | 'nao_confere' | 'a_verificar'
  marcoValidadoContra: string | null
  marcoDataEm: string | null
  vinculadoAutomaticamente: boolean
  documentoEmpresaId: string | null
  documentoNome: string | null
  titulo: string
  oQueExige: string
  criterioAceitacao: string | null
  trecho: string
  pagina: number | null
  clausula: string | null
  risco: 'desclassifica' | 'inabilita' | 'sanavel'
}

interface Acessoria {
  id: string
  status: 'pendente' | 'cumprida'
  prazoLimiteEm: string | null
  custoEstimado: string | null
  responsavel: string | null
  comprovante: string | null
  justificativa: string | null
  titulo: string
  oQueExige: string
  trecho: string
  pagina: number | null
}

interface Contadores {
  documentosPendentes: number
  vencendoAntesSessao: number
  exigenciasAcessoriasPendentes: number
  itensCriticosNaoConferidos: number
}

const SITUACAO_LABEL: Record<ItemChecklist['situacao'], string> = {
  ok: 'OK',
  vence_antes: 'Vence antes',
  faltando: 'Faltando',
  nao_confere: 'Não confere',
  a_verificar: 'A verificar',
}

const SITUACAO_COR: Record<ItemChecklist['situacao'], string> = {
  ok: 'bg-green-600 text-white hover:bg-green-600',
  vence_antes: 'bg-amber-500 text-white hover:bg-amber-500',
  faltando: 'bg-red-600 text-white hover:bg-red-600',
  nao_confere: 'bg-red-600 text-white hover:bg-red-600',
  a_verificar: 'bg-slate-500 text-white hover:bg-slate-500',
}

const TIPOS_DOCUMENTO = [
  ['certidao_federal', 'Certidão Federal'],
  ['certidao_estadual', 'Certidão Estadual'],
  ['certidao_municipal', 'Certidão Municipal'],
  ['fgts', 'FGTS'],
  ['trabalhista', 'Certidão Trabalhista (CNDT)'],
  ['contrato_social', 'Contrato Social'],
  ['balanco_patrimonial', 'Balanço Patrimonial'],
  ['atestado_capacidade_tecnica', 'Atestado de Capacidade Técnica'],
  ['alvara_funcionamento', 'Alvará de Funcionamento'],
  ['inscricao_estadual', 'Inscrição Estadual'],
  ['inscricao_municipal', 'Inscrição Municipal'],
  ['outro', 'Outro'],
] as const

export default function DocumentosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  const [participacao, setParticipacao] = useState<Participacao | null>(null)
  const [itens, setItens] = useState<ItemChecklist[]>([])
  const [acessorias, setAcessorias] = useState<Acessoria[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [contadores, setContadores] = useState<Contadores | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  const [erro, setErro] = useState('')

  const [novoDocumento, setNovoDocumento] = useState({ tipo: 'certidao_federal', nome: '', validadeEm: '', evidencia: '' })
  const [salvandoNovoDocumento, setSalvandoNovoDocumento] = useState(false)

  useEffect(() => {
    if (!isPending && !sessao) router.push('/login')
  }, [sessao, isPending, router])

  const carregar = useCallback(async () => {
    try {
      const [respParticipacao, respChecklist, respDocumentos] = await Promise.all([
        fetch(`/api/participacoes/${id}`),
        fetch(`/api/participacoes/${id}/checklist`),
        fetch('/api/empresa/documentos'),
      ])
      if (respParticipacao.ok) setParticipacao((await respParticipacao.json()).participacao)
      if (respChecklist.ok) {
        const dados = await respChecklist.json()
        setItens(dados.itens ?? [])
        setAcessorias(dados.acessorias ?? [])
        setContadores(dados.contadores ?? null)
      }
      if (respDocumentos.ok) setDocumentos((await respDocumentos.json()).documentos ?? [])
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    if (sessao) carregar()
  }, [sessao, carregar])

  const vincularDocumento = async (itemId: string, documentoEmpresaId: string | null) => {
    setSalvandoId(itemId)
    const resposta = await fetch(`/api/participacoes/${id}/checklist/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentoEmpresaId }),
    })
    const dados = await resposta.json().catch(() => null)
    setSalvandoId(null)
    if (resposta.ok) {
      setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, ...dados.item, documentoNome: documentos.find((d) => d.id === documentoEmpresaId)?.nome ?? null } : i)))
    }
  }

  const confirmarVinculo = async (item: ItemChecklist) => {
    await vincularDocumento(item.id, item.documentoEmpresaId)
  }

  const atualizarAcessoria = async (itemId: string, corpo: Partial<Acessoria>) => {
    setSalvandoId(itemId)
    const resposta = await fetch(`/api/participacoes/${id}/acessorias/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    const dados = await resposta.json().catch(() => null)
    setSalvandoId(null)
    if (resposta.ok) {
      setAcessorias((atual) => atual.map((a) => (a.id === itemId ? { ...a, ...dados.item } : a)))
    } else {
      setErro(dados?.erro ?? 'Não foi possível salvar.')
    }
  }

  const cadastrarDocumento = async () => {
    if (!novoDocumento.nome.trim()) {
      setErro('Informe o nome do documento.')
      return
    }
    setSalvandoNovoDocumento(true)
    setErro('')
    const resposta = await fetch('/api/empresa/documentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...novoDocumento, validadeEm: novoDocumento.validadeEm || null }),
    })
    const dados = await resposta.json().catch(() => null)
    setSalvandoNovoDocumento(false)
    if (!resposta.ok) {
      setErro(dados?.erro ?? 'Não foi possível cadastrar o documento.')
      return
    }
    setDocumentos((atual) => [dados.documento, ...atual])
    setNovoDocumento({ tipo: 'certidao_federal', nome: '', validadeEm: '', evidencia: '' })
  }

  if (isPending || !sessao || carregando) return null

  if (!participacao) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Participação não encontrada.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shrink-0">
            <FileStack className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight leading-tight truncate">{participacao.orgao}</h1>
            <p className="text-xs text-muted-foreground font-medium truncate">{participacao.objeto}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="outline" size="xs" nativeButton={false} render={<Link href="/radar" />}>
            <ArrowLeft />
            Voltar ao radar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/recurso`} />}>
              <Landmark />
              Ficha do recurso
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}`} />}>
              Edital
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/viabilidade`} />}>
              Viabilidade
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/decisao`} />}>
              Decisão
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/precos`} />}>
              Preços
            </Button>
            <Button variant="outline" size="xs" nativeButton={false} render={<Link href={`/participacoes/${id}/proposta`} />}>
              Proposta
            </Button>
          </div>
        </div>

        {contadores && (
          <Card>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div>
                <div className="text-2xl font-bold">{contadores.documentosPendentes}</div>
                <div className="text-xs text-muted-foreground">Documentos pendentes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{contadores.vencendoAntesSessao}</div>
                <div className="text-xs text-muted-foreground">Vencendo antes da sessão</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{contadores.exigenciasAcessoriasPendentes}</div>
                <div className="text-xs text-muted-foreground">Acessórias pendentes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{contadores.itensCriticosNaoConferidos}</div>
                <div className="text-xs text-muted-foreground">Itens críticos não conferidos</div>
              </div>
            </CardContent>
          </Card>
        )}

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Meus documentos</CardTitle>
            <CardDescription>Cadastrados aqui ficam disponíveis para vincular em qualquer participação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-4 gap-2">
              <select
                value={novoDocumento.tipo}
                onChange={(e) => setNovoDocumento((f) => ({ ...f, tipo: e.target.value }))}
                className="h-9 rounded-md border border-input bg-input/30 px-3 text-sm"
              >
                {TIPOS_DOCUMENTO.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
              <Input placeholder="Nome" value={novoDocumento.nome} onChange={(e) => setNovoDocumento((f) => ({ ...f, nome: e.target.value }))} />
              <Input type="date" value={novoDocumento.validadeEm} onChange={(e) => setNovoDocumento((f) => ({ ...f, validadeEm: e.target.value }))} />
              <Input placeholder="Evidência (link)" value={novoDocumento.evidencia} onChange={(e) => setNovoDocumento((f) => ({ ...f, evidencia: e.target.value }))} />
            </div>
            <Button size="xs" onClick={cadastrarDocumento} disabled={salvandoNovoDocumento}>
              {salvandoNovoDocumento ? 'Salvando...' : 'Cadastrar documento'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de habilitação</CardTitle>
            <CardDescription>Vem direto da matriz lida no edital — não é digitado de novo.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Situação</TableHead>
                  <TableHead>Exigência</TableHead>
                  <TableHead>Documento vinculado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      <Badge className={SITUACAO_COR[item.situacao]}>{SITUACAO_LABEL[item.situacao]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-80 align-top">
                      <div className="font-medium">{item.titulo}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.oQueExige}</div>
                      {item.clausula && <div className="text-xs text-muted-foreground mt-0.5">Item {item.clausula}</div>}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <select
                          value={item.documentoEmpresaId ?? ''}
                          disabled={salvandoId === item.id}
                          onChange={(e) => vincularDocumento(item.id, e.target.value || null)}
                          className="h-8 rounded-md border border-input bg-input/30 px-2 text-xs"
                        >
                          <option value="">— Nenhum —</option>
                          {documentos.map((doc) => (
                            <option key={doc.id} value={doc.id}>{doc.nome}</option>
                          ))}
                        </select>
                        {item.vinculadoAutomaticamente && (
                          <Button size="xs" variant="outline" onClick={() => confirmarVinculo(item)} disabled={salvandoId === item.id}>
                            Confirmar vínculo sugerido
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {itens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                      Nenhuma exigência de habilitação encontrada na leitura do edital.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {acessorias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exigências acessórias</CardTitle>
              <CardDescription>Garantia, amostra, POC, visita técnica — não são documento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {acessorias.map((item, indice) => (
                <div key={item.id}>
                  {indice > 0 && <Separator className="mb-4" />}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{item.titulo}</div>
                      <div className="text-xs text-muted-foreground">{item.oQueExige}</div>
                    </div>
                    <Badge className={item.status === 'cumprida' ? 'bg-green-600 text-white hover:bg-green-600' : 'bg-slate-500 text-white hover:bg-slate-500'}>
                      {item.status === 'cumprida' ? 'Cumprida' : 'Pendente'}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Comprovante ou justificativa</Label>
                      <Input
                        defaultValue={item.comprovante ?? item.justificativa ?? ''}
                        onBlur={(e) => atualizarAcessoria(item.id, { comprovante: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Responsável</Label>
                      <Input defaultValue={item.responsavel ?? ''} onBlur={(e) => atualizarAcessoria(item.id, { responsavel: e.target.value })} />
                    </div>
                  </div>
                  {item.status === 'pendente' && (
                    <Button
                      size="xs"
                      className="mt-2"
                      disabled={salvandoId === item.id}
                      onClick={() => atualizarAcessoria(item.id, { status: 'cumprida', comprovante: item.comprovante })}
                    >
                      Marcar como cumprida
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
