// app/esqueci-senha/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Mail, MailCheck, ShieldAlert } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Shader3 } from '@/components/shader3'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const aoEnviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/redefinir-senha',
    })

    setCarregando(false)

    if (error) {
      setErro(error.message ?? 'Não foi possível enviar o e-mail de redefinição.')
      return
    }

    setEnviado(true)
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Shader3 />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Card className="bg-white/90 backdrop-blur-md border-slate-300 shadow-2xl text-slate-900">
          <CardHeader className="space-y-4 pb-4">
            <div className="flex items-center gap-3 justify-center border-b border-slate-200 pb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <ShieldAlert className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">LicitPro Analyzer</h1>
                <p className="text-xs text-slate-600 font-semibold">Analisador de Inabilitação</p>
              </div>
            </div>

            <div className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-slate-900">Esqueci minha senha</CardTitle>
              <CardDescription className="text-slate-600 font-medium">
                {enviado
                  ? 'Confira sua caixa de entrada.'
                  : 'Informe seu e-mail e enviaremos um link de redefinição.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {enviado ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <MailCheck className="text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  Se existir uma conta para <span className="font-semibold">{email}</span>, o link de
                  redefinição já está a caminho. Ele expira em 1 hora.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={aoEnviar} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="text-slate-800 font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-9 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {erro && (
                  <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription className="font-medium">{erro}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={carregando}
                  className="w-full mt-2 cursor-pointer rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md"
                >
                  {carregando ? 'Enviando...' : 'Enviar link de redefinição'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="border-t border-slate-200 pt-4 mt-2">
            <p className="text-sm text-slate-600 text-center w-full font-medium">
              <Link href="/login" className="text-primary hover:underline font-bold inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
