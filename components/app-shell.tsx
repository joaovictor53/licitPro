// components/app-shell.tsx
// Estrutura das páginas autenticadas: barra lateral fixa (menu no celular), conta e saída.
// As rotas já exigem sessão (proxy.ts); aqui a sessão só serve para mostrar o usuário e o menu de admin.
'use client'

import { useState, useSyncExternalStore, type ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Briefcase, Gem, History, LayoutDashboard, LogOut, Menu, Moon, Radar, Scale, ShieldAlert, Sun, UserCircle, X } from 'lucide-react'
import { authClient, useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface ItemMenu {
  href: string
  rotulo: string
  icone: ComponentType<{ className?: string }>
  /** Marca o item como ativo também nas rotas filhas (/participacoes/123). */
  prefixo?: boolean
}

const GRUPOS: Array<{ titulo: string; itens: ItemMenu[] }> = [
  {
    titulo: 'Operação',
    itens: [
      { href: '/dashboard', rotulo: 'Painel', icone: LayoutDashboard },
      { href: '/radar', rotulo: 'Radar de editais', icone: Radar },
      { href: '/participacoes', rotulo: 'Participações', icone: Briefcase, prefixo: true },
    ],
  },
  {
    titulo: 'Análise',
    itens: [
      { href: '/analisador', rotulo: 'Analisador de concorrente', icone: ShieldAlert },
      { href: '/historico', rotulo: 'Histórico de análises', icone: History, prefixo: true },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { href: '/perfil', rotulo: 'Perfil e empresa', icone: UserCircle },
      { href: '/planos', rotulo: 'Planos', icone: Gem },
    ],
  },
]

const ITEM_ADMIN: ItemMenu = { href: '/admin', rotulo: 'Administração', icone: BarChart3 }

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname()
  const { data: sessao } = useSession()
  const grupos = sessao?.user.role === 'admin' ? [...GRUPOS, { titulo: 'Sistema', itens: [ITEM_ADMIN] }] : GRUPOS

  const ativo = (item: ItemMenu) => caminho === item.href || (item.prefixo === true && caminho.startsWith(`${item.href}/`))

  return (
    <nav aria-label="Principal" className="flex flex-col gap-5 px-3">
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">{grupo.titulo}</p>
          {grupo.itens.map((item) => {
            const Icone = item.icone
            const atual = ativo(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={aoNavegar}
                aria-current={atual ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none',
                  'hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  atual ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/75'
                )}
              >
                <Icone className={cn('size-4 shrink-0', atual ? 'text-sidebar-primary' : 'text-sidebar-foreground/50')} />
                {item.rotulo}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Marca() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md">
      <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Scale className="size-4" />
      </span>
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground">LicitPro</span>
    </Link>
  )
}

const assinarTema = (aviso: () => void) => {
  const observador = new MutationObserver(aviso)
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observador.disconnect()
}
const temaEscuro = () => document.documentElement.classList.contains('dark')

function AlternarTema() {
  const escuro = useSyncExternalStore(assinarTema, temaEscuro, () => false)

  const alternar = () => {
    const novo = !temaEscuro()
    document.documentElement.classList.toggle('dark', novo)
    try {
      localStorage.setItem('tema', novo ? 'escuro' : 'claro')
    } catch {
      /* sem armazenamento: o tema vale só nesta visita */
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      {escuro ? <Sun className="size-4 text-sidebar-foreground/50" /> : <Moon className="size-4 text-sidebar-foreground/50" />}
      {escuro ? 'Tema claro' : 'Tema escuro'}
    </button>
  )
}

function Conta() {
  const router = useRouter()
  const { data: sessao } = useSession()

  const sair = async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!sessao) return null
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="px-3 pb-2">
        <p className="truncate text-sm font-medium">{sessao.user.name}</p>
        <p className="truncate text-xs text-sidebar-foreground/50">{sessao.user.email}</p>
      </div>
      <AlternarTema />
      <button
        id="btn-sair"
        type="button"
        onClick={sair}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <LogOut className="size-4 text-sidebar-foreground/50" />
        Sair
      </button>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral (telas grandes) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <Marca />
        <div className="flex-1 overflow-y-auto pb-4">
          <Navegacao />
        </div>
        <Conta />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (celular e tablet) */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
            className="rounded-md p-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-base font-semibold tracking-tight">LicitPro</span>
        </header>

        <main id="conteudo" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Menu em gaveta (celular e tablet) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Marca />
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMenuAberto(false)}
                className="rounded-md p-2 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              <Navegacao aoNavegar={() => setMenuAberto(false)} />
            </div>
            <Conta />
          </div>
        </div>
      )}
    </div>
  )
}
