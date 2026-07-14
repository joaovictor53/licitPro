// app/admin/page.tsx

import Link from 'next/link'
import { eq, desc, count, countDistinct, gte, sql } from 'drizzle-orm'
import {
  ShieldAlert,
  ArrowLeft,
  BarChart3,
  Users,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { exigirAdmin } from '@/lib/sessao'
import { db } from '@/app/src'
import { analise, user } from '@/app/src/db/schema'
import { PLANOS, PLANO_PADRAO, ehPlanoValido } from '@/lib/planos'
import { PlanoSelect } from '@/components/plano-select'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default async function AdminPage() {
  const session = await exigirAdmin()

  const agora = new Date()
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Estatísticas gerais (colunas planas, nunca jsonb)
  const [[totalGeral], [totalUsuarios], [ultimos7], [ultimos30]] =
    await Promise.all([
      db.select({ total: count() }).from(analise),
      db.select({ total: countDistinct(analise.userId) }).from(analise),
      db
        .select({ total: count() })
        .from(analise)
        .where(gte(analise.createdAt, seteDiasAtras)),
      db
        .select({ total: count() })
        .from(analise)
        .where(gte(analise.createdAt, trintaDiasAtras)),
    ])

  // Usuários com uso do mês corrente (para gestão de planos)
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const [usuarios, usoMes] = await Promise.all([
    db
      .select({
        id: user.id,
        nome: user.name,
        email: user.email,
        plano: user.plano,
        role: user.role,
        criadoEm: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt)),
    db
      .select({ userId: analise.userId, total: count() })
      .from(analise)
      .where(gte(analise.createdAt, inicioDoMes))
      .groupBy(analise.userId),
  ])
  const usoPorUsuario = new Map(usoMes.map((u) => [u.userId, u.total]))

  // Análises por usuário
  const porUsuario = await db
    .select({
      userId: user.id,
      nome: user.name,
      email: user.email,
      totalAnalises: count(analise.id),
      ultimaAnalise: sql<string>`max(${analise.createdAt})`.as(
        'ultima_analise'
      ),
    })
    .from(analise)
    .innerJoin(user, eq(analise.userId, user.id))
    .groupBy(user.id, user.name, user.email)
    .orderBy(sql`count(${analise.id}) desc`)

  // Últimas 50 análises
  const ultimasAnalises = await db
    .select({
      id: analise.id,
      nomeEdital: analise.nomeEdital,
      nomeProposta: analise.nomeProposta,
      resumo: analise.resumo,
      totalIrregularidades: analise.totalIrregularidades,
      totalMaterial: analise.totalMaterial,
      totalSanavel: analise.totalSanavel,
      createdAt: analise.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(analise)
    .innerJoin(user, eq(analise.userId, user.id))
    .orderBy(desc(analise.createdAt))
    .limit(50)

  const stats = [
    {
      label: 'Total de análises',
      valor: totalGeral.total,
      icone: BarChart3,
      cor: 'blue',
    },
    {
      label: 'Usuários ativos',
      valor: totalUsuarios.total,
      icone: Users,
      cor: 'emerald',
    },
    {
      label: 'Últimos 7 dias',
      valor: ultimos7.total,
      icone: TrendingUp,
      cor: 'amber',
    },
    {
      label: 'Últimos 30 dias',
      valor: ultimos30.total,
      icone: CalendarDays,
      cor: 'violet',
    },
  ]

  const corClasses: Record<string, { text: string; iconBg: string; barra: string }> = {
    blue: {
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      barra: 'bg-blue-500',
    },
    emerald: {
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      barra: 'bg-indigo-500',
    },
    amber: {
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      barra: 'bg-amber-500',
    },
    violet: {
      text: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      barra: 'bg-violet-500',
    },
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                LicitPro Analyzer Admin
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                Painel administrativo
              </p>
            </div>
          </div>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'xs' })}>
            <ArrowLeft />
            Voltar
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((stat) => {
            const cores = corClasses[stat.cor]
            const Icone = stat.icone
            return (
              <Card
                key={stat.label}
                size="sm"
                className="relative transition-shadow hover:shadow-md"
              >
                <div
                  className={cn(
                    'absolute inset-x-0 top-0 h-0.5',
                    cores.barra
                  )}
                />
                <CardContent className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium truncate">
                      {stat.label}
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold tabular-nums mt-1',
                        cores.text
                      )}
                    >
                      {stat.valor}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'w-8 h-8 shrink-0 rounded-lg flex items-center justify-center',
                      cores.iconBg
                    )}
                  >
                    <Icone className="w-4 h-4" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabela: Usuários e Planos */}
        <Card size="sm" className="mb-8">
          <CardHeader className="border-b [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              Usuários e Planos
            </CardTitle>
          </CardHeader>
          {usuarios.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Plano</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Uso no mês</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => {
                  const planoId = ehPlanoValido(u.plano) ? u.plano : PLANO_PADRAO
                  const limite = PLANOS[planoId].limiteAnalises
                  const usadas = usoPorUsuario.get(u.id) ?? 0
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        {u.role === 'admin' ? (
                          <span className={badgeVariants({ variant: 'default' })}>
                            Admin
                          </span>
                        ) : (
                          <PlanoSelect userId={u.id} plano={planoId} />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.role === 'admin' ? (
                          <span className={badgeVariants({ variant: 'secondary' })}>
                            {usadas} / ∞
                          </span>
                        ) : (
                          <span
                            className={cn(
                              badgeVariants({ variant: 'secondary' }),
                              usadas >= limite && 'bg-red-100 text-red-700'
                            )}
                          >
                            {usadas} / {limite}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {u.criadoEm
                          ? new Date(u.criadoEm).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Tabela: Análises por Usuário */}
        <Card size="sm" className="mb-8">
          <CardHeader className="border-b [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              Análises por Usuário
            </CardTitle>
          </CardHeader>
          {porUsuario.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma análise registrada ainda.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Total</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Última análise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porUsuario.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-center">
                      <span className={badgeVariants({ variant: 'secondary' })}>
                        {u.totalAnalises}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.ultimaAnalise
                        ? new Date(u.ultimaAnalise).toLocaleDateString(
                          'pt-BR',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Tabela: Histórico Completo */}
        <Card size="sm">
          <CardHeader className="border-b [.border-b]:pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-primary" />
              Histórico Completo
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                Últimas 50 análises
              </span>
            </CardTitle>
          </CardHeader>
          {ultimasAnalises.length === 0 ? (
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma análise registrada ainda.
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Data</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Edital</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Proposta</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Irregularidades</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimasAnalises.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground text-xs">
                      {a.createdAt
                        ? new Date(a.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-xs">{a.userName}</p>
                      <p className="text-muted-foreground text-xs">{a.userEmail}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                      {a.nomeEdital}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate">
                      {a.nomeProposta}
                    </TableCell>
                    <TableCell className="text-center">
                      {a.totalIrregularidades > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={badgeVariants({ variant: 'destructive' })}>
                            <AlertTriangle />
                            {a.totalMaterial}
                          </span>
                          <span
                            className={cn(
                              badgeVariants({ variant: 'secondary' }),
                              'bg-amber-100 text-amber-700'
                            )}
                          >
                            {a.totalSanavel}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            badgeVariants({ variant: 'secondary' }),
                            'bg-amber-100 text-amber-700'
                          )}
                        >
                          <CheckCircle />
                          OK
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/historico/${a.id}`}
                        className={buttonVariants({ variant: 'link', size: 'xs' })}
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </main>
  )
}
