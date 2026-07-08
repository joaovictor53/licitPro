// components/auth-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eye, EyeOff, Lock, Mail, ShieldAlert, User } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

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
    <main className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LicitPro</h1>
            <p className="text-xs text-slate-400 font-medium">Analisador de Inabilitação</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-800 mb-1">
            {ehCadastro ? 'Criar conta' : 'Entrar'}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {ehCadastro
              ? 'Cadastre-se para acessar o analisador.'
              : 'Entre com sua conta para continuar.'}
          </p>

          <form onSubmit={aoEnviar} className="flex flex-col gap-4">
            {ehCadastro && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nome" className="text-xs font-semibold text-slate-500">
                  Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoComplete="name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-500">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>
            {/* Senha com cor de fonte preta */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-xs font-semibold text-slate-500">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={ehCadastro ? 'new-password' : 'current-password'}
                  className="w-full pl-9 pr-10 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 transition-colors focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((valor) => !valor)}
                  tabIndex={-1}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {ehCadastro && (
                <p className="text-xs text-slate-400">Mínimo de 8 caracteres.</p>
              )}
            </div>

            {erro && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1"
            >
              {carregando ? 'Aguarde...' : ehCadastro ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          {/* <div className="flex items-center gap-3 my-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400">ou</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div> */}

          {/* <button
            onClick={entrarComGoogle}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            Continuar com Google
          </button> */}

          <p className="text-xs text-slate-400 text-center mt-5">
            {ehCadastro ? (
              <>
                Já tem uma conta?{' '}
                <a href="/login" className="text-blue-600 hover:underline">
                  Entrar
                </a>
              </>
            ) : (
              <>
                Não tem uma conta?{' '}
                <a href="/signup" className="text-blue-600 hover:underline">
                  Criar conta
                </a>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  )
}
