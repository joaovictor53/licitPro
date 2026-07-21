'use client'

import { useState } from 'react'
import { AlertTriangle, Building2, CheckCircle2, MapPin, ScrollText } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EmpresaFormProps {
  razaoSocialInicial: string
  cnpjInicial: string
  enderecoInicial: string
}

export const EmpresaForm = ({
  razaoSocialInicial,
  cnpjInicial,
  enderecoInicial,
}: EmpresaFormProps) => {
  const [razaoSocial, setRazaoSocial] = useState(razaoSocialInicial)
  const [cnpj, setCnpj] = useState(cnpjInicial)
  const [endereco, setEndereco] = useState(enderecoInicial)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const aoEnviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    setSucesso(false)
    setCarregando(true)

    const { error } = await authClient.updateUser({
      razaoSocial: razaoSocial.trim(),
      cnpj: cnpj.trim(),
      endereco: endereco.trim(),
    })

    setCarregando(false)

    if (error) {
      setErro(error.message ?? 'Não foi possível salvar os dados da empresa.')
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
                className="pl-9"
              />
            </div>
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

          <Button type="submit" disabled={carregando} className="w-full mt-1">
            {carregando ? 'Salvando...' : 'Salvar dados da empresa'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
