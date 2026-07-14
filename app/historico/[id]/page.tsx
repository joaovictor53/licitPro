// app/historico/[id]/page.tsx

import Link from 'next/link'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import {
  ShieldAlert,
  ArrowLeft,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { exigirUsuario } from '@/lib/sessao'
import { db } from '@/app/src'
import { analise } from '@/app/src/db/schema'
import { ResultadoCard } from '@/components/resultado-card'
import { TextoCopiavel } from '@/components/texto-copiavel'
import { RelatorioDownload } from '@/components/relatorio-download'
import type { ResultadoAnalise } from '@/types/analise-tipos'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default async function HistoricoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await exigirUsuario()
  const { id } = await params

  // Buscar análise pelo UUID
  const [registro] = await db
    .select()
    .from(analise)
    .where(eq(analise.id, id))
    .limit(1)

  if (!registro) {
    notFound()
  }

  // Verificar que a análise pertence ao usuário logado (ou é admin)
  if (registro.userId !== session.user.id && session.user.role !== 'admin') {
    notFound()
  }

  const resultado = registro.resultado as ResultadoAnalise

  const totalMaterial = resultado.nao_conformidades.filter(
    (i) => i.gravidade === 'material'
  ).length
  const totalSanavel = resultado.nao_conformidades.filter(
    (i) => i.gravidade === 'sanável'
  ).length

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
                Detalhe da Análise
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {registro.createdAt
                  ? new Date(registro.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </p>
            </div>
          </div>
          <Link href="/historico" className={buttonVariants({ variant: 'outline', size: 'xs' })}>
            <ArrowLeft />
            Voltar
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Info dos arquivos */}
        <Alert className="mb-4">
          <Clock className="text-muted-foreground" />
          <AlertDescription className="text-xs">
            <p>
              <span className="font-medium">Edital:</span> {registro.nomeEdital}
            </p>
            <p>
              <span className="font-medium">Proposta:</span>{' '}
              {registro.nomeProposta}
            </p>
          </AlertDescription>
        </Alert>

        {/* Resumo */}
        <Card size="sm" className="mb-4">
          <CardContent className="flex gap-3">
            <FileSearch className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                Resumo da análise
              </p>
              <p className="text-sm leading-relaxed">
                {resultado.resumo}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contadores */}
        {resultado.total_irregularidades > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card size="sm" className="bg-red-50 ring-red-200">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-red-600">{totalMaterial}</p>
                <p className="text-xs text-red-500 font-medium mt-0.5">
                  Material(is) — insanável(is)
                </p>
              </CardContent>
            </Card>
            <Card size="sm" className="bg-amber-50 ring-amber-200">
              <CardContent className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {totalSanavel}
                </p>
                <p className="text-xs text-amber-500 font-medium mt-0.5">
                  Sanável(is)
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Não conformidades */}
        {resultado.nao_conformidades.length === 0 ? (
          <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
            <CheckCircle className="text-amber-600" />
            <AlertDescription className="text-amber-800">
              Nenhuma irregularidade encontrada na proposta do concorrente.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-semibold">
                {resultado.total_irregularidades} irregularidade
                {resultado.total_irregularidades !== 1 ? 's' : ''} encontrada
                {resultado.total_irregularidades !== 1 ? 's' : ''}
              </span>
            </div>
            {resultado.nao_conformidades.map((item) => (
              <ResultadoCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Relatório + Textos gerados */}
        <div className="space-y-4 mb-6">
          <RelatorioDownload
            resultado={resultado}
            nomeEdital={registro.nomeEdital}
          />
          <TextoCopiavel
            titulo="Recurso administrativo"
            texto={resultado.recurso_administrativo}
            icone={<FileSearch className="w-4 h-4 text-primary" />}
          />
          <TextoCopiavel
            titulo="Mensagem ao pregoeiro"
            texto={resultado.mensagem_pregoeiro}
            icone={<MessageSquare className="w-4 h-4 text-primary" />}
          />
        </div>

        {/* Botão voltar */}
        <Link
          href="/historico"
          className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
        >
          <ArrowLeft />
          Voltar ao histórico
        </Link>
      </div>
    </main>
  )
}
