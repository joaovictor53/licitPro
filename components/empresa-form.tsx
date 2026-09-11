'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, MapPin, Plus, ScrollText, Search, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Catálogo oficial completo do IBGE (1.332 CNAEs, ver data/cnae-ibge.json) —
// usado para o cadastro aceitar qualquer CNAE existente.
interface CnaeIbge {
  codigo: string
  descricao: string
}

// Subconjunto que a Arumã já configurou com palavras-chave — só esses o
// Radar de Editais sabe efetivamente buscar no modo "Por CNAE".
interface CnaeCadastrado {
  cnae: string
  descricao: string | null
}

const soDigitos = (cnae: string): string => cnae.replace(/\D/g, '')

const normalizarTexto = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const filtrarCnaesIbge = (lista: CnaeIbge[], filtro: string): CnaeIbge[] => {
  const alvoTexto = normalizarTexto(filtro.trim())
  if (alvoTexto === '') return lista

  // Só entra na comparação por dígitos quando o filtro realmente tem algum —
  // "".includes("") é sempre true, então sem essa guarda um filtro só com
  // letras (ex: "obras") batia em TODO item pelo lado dos dígitos e a busca
  // por texto parecia não fazer nada.
  const alvoDigitos = soDigitos(filtro)

  return lista.filter((item) => {
    const batePorDigitos = alvoDigitos !== '' && soDigitos(item.codigo).includes(alvoDigitos)
    const batePorTexto = normalizarTexto(item.descricao).includes(alvoTexto)
    return batePorDigitos || batePorTexto
  })
}

const LIMITE_OPCOES_EXIBIDAS = 200

interface SeletorCnaeProps {
  id: string
  multiplo?: boolean
  valor: string | string[]
  aoMudar: (valor: string | string[]) => void
  desabilitado: boolean
  catalogo: CnaeIbge[]
}

const SeletorCnae = ({ id, multiplo, valor, aoMudar, desabilitado, catalogo }: SeletorCnaeProps) => {
  const [filtro, setFiltro] = useState('')
  const [candidatoAtivo, setCandidatoAtivo] = useState<string | null>(null)

  const filtradosCompleto = useMemo(() => filtrarCnaesIbge(catalogo, filtro), [catalogo, filtro])
  const filtrados = filtradosCompleto.slice(0, LIMITE_OPCOES_EXIBIDAS)

  const valoresSelecionados = Array.isArray(valor) ? valor : valor ? [valor] : []
  const buscarNoCatalogo = (codigo: string): CnaeIbge => catalogo.find((c) => c.codigo === codigo) ?? { codigo, descricao: '' }

  const jaEscolhido = candidatoAtivo != null && valoresSelecionados.includes(candidatoAtivo)
  const podeAdicionar = candidatoAtivo != null && !(multiplo && jaEscolhido)

  const adicionar = () => {
    if (!candidatoAtivo) return
    if (multiplo) {
      if (!valoresSelecionados.includes(candidatoAtivo)) aoMudar([...valoresSelecionados, candidatoAtivo])
    } else {
      aoMudar(candidatoAtivo)
    }
    setCandidatoAtivo(null)
    setFiltro('')
  }

  const remover = (codigo: string) => {
    aoMudar(multiplo ? valoresSelecionados.filter((v) => v !== codigo) : '')
  }

  return (
    <div className="flex flex-col gap-2">
      {valoresSelecionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valoresSelecionados.map((codigo) => {
            const item = buscarNoCatalogo(codigo)
            return (
              <Badge key={codigo} variant="secondary" className="gap-1 pr-1 max-w-full">
                <span className="truncate">{item.codigo}{item.descricao ? ` — ${item.descricao}` : ''}</span>
                <button
                  type="button"
                  onClick={() => remover(codigo)}
                  disabled={desabilitado}
                  aria-label={`Remover ${item.codigo}`}
                  className="rounded-full hover:bg-foreground/10 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <Input
          id={id}
          type="text"
          placeholder="Filtrar por código ou descrição..."
          value={filtro}
          onChange={(e) => {
            setFiltro(e.target.value)
            setCandidatoAtivo(null)
          }}
          disabled={desabilitado}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Digite parte do código (ex: <span className="font-mono">4724</span>) ou uma palavra da
        atividade (ex: <span className="font-mono">obras</span>, <span className="font-mono">hortifruti</span>).
        Clique num resultado da lista e depois em &ldquo;{multiplo ? 'Adicionar' : 'Selecionar'}&rdquo;.
      </p>

      <div className="max-h-48 overflow-y-auto rounded-md border border-input divide-y divide-border">
        {filtrados.length === 0 && (
          <p className="text-sm text-muted-foreground px-3 py-2">Nenhum CNAE encontrado para esse filtro.</p>
        )}
        {filtrados.map((item) => (
          <button
            key={item.codigo}
            type="button"
            disabled={desabilitado}
            onClick={() => setCandidatoAtivo(item.codigo)}
            className={cn(
              'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors',
              candidatoAtivo === item.codigo && 'bg-primary/10 font-medium'
            )}
          >
            {item.codigo} — {item.descricao}
          </button>
        ))}
        {filtradosCompleto.length > LIMITE_OPCOES_EXIBIDAS && (
          <p className="text-xs text-muted-foreground px-3 py-2">
            {filtradosCompleto.length} resultados — mostrando os primeiros {LIMITE_OPCOES_EXIBIDAS}, refine o filtro.
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={desabilitado || !podeAdicionar}
        onClick={adicionar}
        className="self-start"
      >
        <Plus />
        {multiplo ? 'Adicionar' : 'Selecionar'}
      </Button>
    </div>
  )
}

export const EmpresaForm = () => {
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cnaePrincipal, setCnaePrincipal] = useState('')
  const [cnaesSecundarios, setCnaesSecundarios] = useState<string[]>([])
  const [catalogoIbge, setCatalogoIbge] = useState<CnaeIbge[]>([])
  const [cnaesCadastrados, setCnaesCadastrados] = useState<CnaeCadastrado[]>([])
  const [carregandoDados, setCarregandoDados] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      try {
        const [respostaEmpresa, respostaCnaes, respostaCnaesIbge] = await Promise.all([
          fetch('/api/empresa'),
          fetch('/api/cnaes'),
          fetch('/api/cnaes-ibge'),
        ])
        if (respostaEmpresa.ok) {
          const dados = await respostaEmpresa.json()
          setRazaoSocial(dados.razaoSocial ?? '')
          setCnpj(dados.cnpj ?? '')
          setEndereco(dados.endereco ?? '')
          setCnaePrincipal(dados.cnaePrincipal ?? '')
          setCnaesSecundarios(dados.cnaesSecundarios ?? [])
        }
        if (respostaCnaes.ok) setCnaesCadastrados(await respostaCnaes.json())
        if (respostaCnaesIbge.ok) setCatalogoIbge(await respostaCnaesIbge.json())
      } finally {
        setCarregandoDados(false)
      }
    }
    carregar()
  }, [])

  const principalPesquisavel =
    cnaePrincipal !== '' && cnaesCadastrados.some((c) => soDigitos(c.cnae) === soDigitos(cnaePrincipal))

  const aoEnviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    setSucesso(false)
    setCarregando(true)

    const resposta = await fetch('/api/empresa', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razaoSocial: razaoSocial.trim(),
        cnpj: cnpj.trim(),
        endereco: endereco.trim(),
        cnaePrincipal: cnaePrincipal || null,
        cnaesSecundarios,
      }),
    })

    setCarregando(false)

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null)
      setErro(dados?.erro ?? 'Não foi possível salvar os dados da empresa.')
      return
    }

    setSucesso(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da empresa</CardTitle>
        <CardDescription>
          Usados para preencher automaticamente o recorrente no recurso administrativo e na
          mensagem ao pregoeiro, sem deixar placeholders como &ldquo;[nome do recorrente]&rdquo;.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={aoEnviar} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="razaoSocial" className="font-semibold">Razão social</Label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="razaoSocial"
                type="text"
                placeholder="Nome da sua empresa, Ltda."
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                disabled={carregandoDados}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnpj" className="font-semibold">CNPJ</Label>
            <div className="relative">
              <ScrollText className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                disabled={carregandoDados}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endereco" className="font-semibold">Endereço completo</Label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="endereco"
                type="text"
                placeholder="Rua, número, bairro, cidade — UF, CEP"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                disabled={carregandoDados}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnaePrincipal" className="font-semibold flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              CNAE principal
            </Label>
            <SeletorCnae
              id="cnaePrincipal"
              valor={cnaePrincipal}
              aoMudar={(v) => setCnaePrincipal(v as string)}
              desabilitado={carregandoDados}
              catalogo={catalogoIbge}
            />
            {cnaePrincipal && !principalPesquisavel && (
              <p className="text-xs text-amber-600">
                Esse CNAE ainda não tem palavras-chave revisadas pela Arumã no{' '}
                <span className="font-medium">Radar de Editais</span> — na primeira busca, o sistema
                vai gerá-las automaticamente a partir do IBGE (pode trazer mais ruído até alguém
                revisar). Se preferir não esperar, use a busca livre.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cnaesSecundarios" className="font-semibold">CNAEs secundários (opcional)</Label>
            <SeletorCnae
              id="cnaesSecundarios"
              multiplo
              valor={cnaesSecundarios}
              aoMudar={(v) => setCnaesSecundarios(v as string[])}
              desabilitado={carregandoDados}
              catalogo={catalogoIbge}
            />
          </div>

          {erro && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {sucesso && !erro && (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>Dados da empresa salvos com sucesso.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={carregando || carregandoDados} className="w-full mt-1">
            {carregando ? 'Salvando...' : 'Salvar dados da empresa'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
