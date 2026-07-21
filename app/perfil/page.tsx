// app/perfil/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useSession } from '@/lib/auth-client'
import { EmpresaForm } from '@/components/empresa-form'
import { Button } from '@/components/ui/button'

export default function PerfilPage() {
  const router = useRouter()
  const { data: sessao, isPending } = useSession()

  useEffect(() => {
    if (!isPending && !sessao) {
      router.push('/login')
    }
  }, [sessao, isPending, router])

  if (isPending || !sessao) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">Meu perfil</h1>
            <p className="text-xs text-muted-foreground font-medium">{sessao.user.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="outline"
          size="xs"
          nativeButton={false}
          render={<Link href="/dashboard" />}
          className="mb-4"
        >
          <ArrowLeft />
          Voltar ao painel
        </Button>

        <EmpresaForm
          razaoSocialInicial={sessao.user.razaoSocial ?? ''}
          cnpjInicial={sessao.user.cnpj ?? ''}
          enderecoInicial={sessao.user.endereco ?? ''}
        />
      </main>
    </div>
  )
}
