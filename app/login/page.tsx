// app/login/page.tsx
"use client"
import { AuthForm } from '@/components/auth-form'
import { Shader3 } from '@/components/shader3'

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-4 py-10">

      {/* Shader fixado ao fundo */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Shader3 />
      </div>

      {/* AuthForm centralizado por cima */}
      <div className="relative z-10 w-full max-w-sm">
        <AuthForm modo="login" />
      </div>

    </main>
  )
}