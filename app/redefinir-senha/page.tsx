// app/redefinir-senha/page.tsx
'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Shader3 } from '@/components/shader3'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

const MOLDURA_CARD = 'bg-white/90 backdrop-blur-md border-slate-300 shadow-2xl text-slate-900'

function FormularioRedefinicao() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const erroLink = searchParams.get('error')

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  const linkInvalido = !token || erroLink !== null

  const aoEnviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem.')
      return
    }

    if (!token) return

    setCarregando(true)
    const { error } = await authClient.resetPassword({ newPassword: senha, token })
    setCarregando(false)

    if (error) {
      setErro(error.message ?? 'Não foi possível redefinir a senha.')
      return
    }

    setConcluido(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <Card className={MOLDURA_CARD}>
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
          <CardTitle className="text-2xl font-bold text-slate-900">Nova senha</CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            Defina a senha que você usará para entrar.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {linkInvalido ? (
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="font-medium">
              Este link de redefinição é inválido ou já expirou. Solicite um novo.
            </AlertDescription>
          </Alert>
        ) : concluido ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <CheckCircle className="text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              Senha alterada com sucesso. Redirecionando para o login...
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={aoEnviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha" className="text-slate-800 font-semibold">Nova senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pl-9 pr-10 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  tabIndex={-1}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-600 font-medium">Mínimo de 8 caracteres.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmacao" className="text-slate-800 font-semibold">Confirmar senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  id="confirmacao"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="border-t border-slate-200 pt-4 mt-2">
        <p className="text-sm text-slate-600 text-center w-full font-medium">
          {linkInvalido ? (
            <Link href="/esqueci-senha" className="text-primary hover:underline font-bold">
              Solicitar novo link
            </Link>
          ) : (
            <Link href="/login" className="text-primary hover:underline font-bold">
              Voltar para o login
            </Link>
          )}
        </p>
      </CardFooter>
    </Card>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Shader3 />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Suspense
          fallback={
            <Card className={MOLDURA_CARD}>
              <CardContent className="py-10 text-center">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto" />
              </CardContent>
            </Card>
          }
        >
          <FormularioRedefinicao />
        </Suspense>
      </div>
    </main>
  )
}
