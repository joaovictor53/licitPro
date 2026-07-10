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

  return (
    <div className="w-full max-w-sm">
      {/* 
        Card com fundo semi-transparente branco de alta opacidade (bg-white/90) 
        para garantir contraste total contra qualquer shader escuro ou colorido.
      */}
      <Card className="bg-white/90 backdrop-blur-md border-slate-300 shadow-2xl text-slate-900">
        <CardHeader className="space-y-4 pb-4">

          {/* Ícone e Nome do app agora DENTRO do Card */}
          <div className="flex items-center gap-3 justify-center border-b border-slate-200 pb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">LicitPro</h1>
              <p className="text-xs text-slate-600 font-semibold">Analisador de Inabilitação</p>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {ehCadastro ? 'Criar conta' : 'Entrar'}
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium">
              {ehCadastro
                ? 'Cadastre-se para acessar o analisador.'
                : 'Entre com sua conta para continuar.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={aoEnviar} className="flex flex-col gap-4">

            {ehCadastro && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nome" className="text-slate-800 font-semibold">Nome</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoComplete="name"
                    className="pl-9 rounded-lg border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5" >
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senha" className="text-slate-800 font-semibold">Senha</Label>
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
                  autoComplete={ehCadastro ? 'new-password' : 'current-password'}
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
              {ehCadastro && (
                <p className="text-xs text-slate-600 font-medium">Mínimo de 8 caracteres.</p>
              )}
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
              {carregando ? 'Aguarde...' : ehCadastro ? 'Criar conta' : 'Entrar'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="border-t border-slate-200 pt-4 mt-2">
          <p className="text-sm text-slate-600 text-center w-full font-medium">
            {ehCadastro ? (
              <>
                Já tem uma conta?{' '}
                <a href="/login" className="text-primary hover:underline font-bold">
                  Entrar
                </a>
              </>
            ) : (
              <>
                Não tem uma conta?{' '}
                <a href="/signup" className="text-primary hover:underline font-bold">
                  Criar conta
                </a>
              </>
            )}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}