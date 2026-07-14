// app/historico/page.tsx

import Link from 'next/link'
import { eq, desc, count } from 'drizzle-orm'
import {
  ShieldAlert,
  History,
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { exigirUsuario } from '@/lib/sessao'
import { db } from '@/app/src'
import { analise } from '@/app/src/db/schema'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default async function HistoricoPage() {
  const session = await exigirUsuario()

  const [analises, [{ total }]] = await Promise.all([
    db
      .select({
        id: analise.id,
        nomeEdital: analise.nomeEdital,
        nomeProposta: analise.nomeProposta,
        resumo: analise.resumo,
        totalIrregularidades: analise.totalIrregularidades,
        totalMaterial: analise.totalMaterial,
        totalSanavel: analise.totalSanavel,
        createdAt: analise.createdAt,
      })
      .from(analise)
      .where(eq(analise.userId, session.user.id))
      .orderBy(desc(analise.createdAt)),
    db
      .select({ total: count() })
      .from(analise)
      .where(eq(analise.userId, session.user.id)),
  ])

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Meu Histórico
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {total} análise{total !== 1 ? 's' : ''} realizada{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'xs' })}>
            <ArrowLeft />
            Voltar
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Contador */}
        <Alert className="mb-6">
          <History className="text-primary" />
          <AlertDescription>
            Você realizou <span className="font-semibold">{total}</span>{' '}
            análise{total !== 1 ? 's' : ''} no total
          </AlertDescription>
        </Alert>

        {/* Lista de análises */}
        {analises.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">
                Nenhuma análise realizada ainda
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Volte à página principal para iniciar sua primeira varredura.
              </p>
              <Link href="/" className={buttonVariants({ variant: 'link', size: 'xs' })}>
                <ArrowLeft />
                Ir para análise
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {analises.map((item) => (
              <Link key={item.id} href={`/historico/${item.id}`} className="block">
                <Card size="sm" className="hover:shadow-md hover:ring-foreground/20 transition-all">
                  <CardContent>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </p>
                        <p className="text-sm font-semibold truncate">
                          {item.nomeEdital}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          vs {item.nomeProposta}
                        </p>
                      </div>

                      {/* Badge de irregularidades */}
                      {item.totalIrregularidades > 0 ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={badgeVariants({ variant: 'destructive' })}>
                            <AlertTriangle />
                            {item.totalMaterial}
                          </span>
                          <span
                            className={cn(
                              badgeVariants({ variant: 'secondary' }),
                              'bg-amber-100 text-amber-700'
                            )}
                          >
                            {item.totalSanavel}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            badgeVariants({ variant: 'secondary' }),
                            'bg-amber-100 text-amber-700 flex-shrink-0'
                          )}
                        >
                          <CheckCircle />
                          OK
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.resumo}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
