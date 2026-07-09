// components/auth-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, Lock, Mail, ShieldAlert, User } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthFormProps {
  modo: 'login' | 'cadastro'
}

export const AuthForm = ({ modo }: AuthFormProps) => {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const ehCadastro = modo === 'cadastro'

  const aoEnviar = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = ehCadastro
      ? await authClient.signUp.email({ name: nome, email, password: senha })
      : await authClient.signIn.email({ email, password: senha })

    setCarregando(false)

    if (error) {
      setErro(error.message ?? 'Não foi possível completar a operação.')
      return
    }

    router.push('/')
    router.refresh()
  }

  const entrarComGoogle = async () => {
    await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LicitPro</h1>
            <p className="text-xs text-muted-foreground font-medium">Analisador de Inabilitação</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{ehCadastro ? 'Criar conta' : 'Entrar'}</CardTitle>
            <CardDescription>
              {ehCadastro
                ? 'Cadastre-se para acessar o analisador.'
                : 'Entre com sua conta para continuar.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={aoEnviar} className="flex flex-col gap-4">
              {ehCadastro && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      autoComplete="name"
                      className="pl-9 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5" >
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={ehCadastro ? 'new-password' : 'current-password'}
                    className="pl-9 pr-10 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setMostrarSenha((valor) => !valor)}
                    tabIndex={-1}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground "
                  >
                    {mostrarSenha ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {ehCadastro && (
                  <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
                )}
              </div>

              {erro && (
                <Alert variant="destructive">
                  <AlertTriangle />
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" variant="outline" disabled={carregando} className="w-full mt-1 cursor-pointer rounded-lg">
                {carregando ? 'Aguarde...' : ehCadastro ? 'Criar conta' : 'Entrar'}
              </Button>
            </form>

            {/* <div className="flex items-center gap-3 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div> */}

            {/* <Button variant="outline" onClick={entrarComGoogle} className="w-full">
              Continuar com Google
            </Button> */}
          </CardContent>

          <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
              {ehCadastro ? (
                <>
                  Já tem uma conta?{' '}
                  <a href="/login" className="text-primary hover:underline">
                    Entrar
                  </a>
                </>
              ) : (
                <>
                  Não tem uma conta?{' '}
                  <a href="/signup" className="text-primary hover:underline">
                    Criar conta
                  </a>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
