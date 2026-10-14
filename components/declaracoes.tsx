// components/declaracoes.tsx
// Ferramenta 13 / 9 — gera declarações da habilitação e a procuração em PDF para assinar.
// O sistema não assina nem guarda o PDF: baixa o arquivo, o sócio/administrador confere e assina.
'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Opcoes {
  signatario: { situacao: string; mensagem: string }
  tiposPadrao: Array<{ tipo: string; titulo: string }>
  exigidasPeloEdital: Array<{ exigenciaId: string; titulo: string; pagina: number | null; tipoPadrao: string | null }>
}

export function Declaracoes({ participacaoId }: { participacaoId: string }) {
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null)
  const [cidade, setCidade] = useState('')
  const [outorgante, setOutorgante] = useState({ nome: '', cpf: '', cargo: '' })
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch(`/api/participacoes/${participacaoId}/declaracoes`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setOpcoes)
  }, [participacaoId])

  const gerar = async (corpo: Record<string, unknown>) => {
    setOcupado(true)
    setErro('')
    const resposta = await fetch(`/api/participacoes/${participacaoId}/declaracoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cidade, ...corpo }),
    })
    setOcupado(false)
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null)
      setErro(dados?.erro ?? 'Não foi possível gerar o documento.')
      return
    }
    const nome = /filename="([^"]+)"/.exec(resposta.headers.get('Content-Disposition') ?? '')?.[1] ?? 'documento.pdf'
    const url = URL.createObjectURL(await resposta.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = nome
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!opcoes) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Declarações e procuração</CardTitle>
        <CardDescription>
          Modelos gerais, preenchidos com o cadastro da empresa. Leia, confira e peça a assinatura — o sistema não assina por ninguém e os
          textos precisam de revisão jurídica. Sem dado no cadastro, o documento não é gerado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant={opcoes.signatario.situacao === 'socio_administrador' ? 'default' : 'destructive'}>
          <AlertDescription>{opcoes.signatario.mensagem}</AlertDescription>
        </Alert>

        <div className="flex flex-col gap-1 max-w-xs">
          <Label htmlFor="cidade-declaracao">Cidade (linha da data)</Label>
          <Input id="cidade-declaracao" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade da sede da empresa" />
        </div>

        {opcoes.exigidasPeloEdital.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Pedidas pelo edital</p>
            {opcoes.exigidasPeloEdital.map((e) => (
              <div key={e.exigenciaId} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {e.titulo}
                  {e.pagina ? <span className="text-xs text-muted-foreground"> (pág. {e.pagina})</span> : null}
                  <span className="block text-xs text-muted-foreground">{e.tipoPadrao ? 'texto padrão' : 'pelo trecho do edital'}</span>
                </span>
                <Button size="xs" variant="outline" disabled={ocupado} onClick={() => gerar({ exigenciaId: e.exigenciaId })}>
                  Gerar PDF
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Textos padrão</p>
          {opcoes.tiposPadrao.map((t) => (
            <div key={t.tipo} className="flex items-center justify-between gap-2 text-sm">
              <span>{t.titulo}</span>
              <Button size="xs" variant="outline" disabled={ocupado} onClick={() => gerar({ tipo: t.tipo })}>
                Gerar PDF
              </Button>
            </div>
          ))}
        </div>

        {opcoes.signatario.situacao === 'precisa_procuracao' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Procuração (quem assina não é sócio nem administrador)</p>
            <p className="text-xs text-muted-foreground">Informe o sócio ou administrador que outorga e assina a procuração.</p>
            {(['nome', 'cpf', 'cargo'] as const).map((campo) => (
              <Input
                key={campo}
                aria-label={`Outorgante: ${campo}`}
                placeholder={campo === 'nome' ? 'Nome do outorgante' : campo === 'cpf' ? 'CPF do outorgante' : 'Cargo (ex.: sócio-administrador)'}
                value={outorgante[campo]}
                onChange={(e) => setOutorgante((atual) => ({ ...atual, [campo]: e.target.value }))}
              />
            ))}
            <Button size="xs" disabled={ocupado} onClick={() => gerar({ procuracao: true, outorgante })}>
              Gerar procuração
            </Button>
          </div>
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
