// app/planos/page.tsx

import Link from 'next/link'
import { ArrowLeft, Check, ShieldAlert, Sparkles } from 'lucide-react'
import { exigirUsuario } from '@/lib/sessao'
import { PLANOS, ehPlanoValido, PLANO_PADRAO, type PlanoId } from '@/lib/planos'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const DESTAQUE: PlanoId = 'profissional'

const BENEFICIOS: Record<PlanoId, string[]> = {
  gratis: [
    '1 análise completa',
    'Válido por 2 dias',
    'Recurso administrativo gerado',
    'Mensagem ao pregoeiro',
  ],
  basico: [
    '8 análises por mês',
    'Recurso administrativo gerado',
    'Mensagem ao pregoeiro',
    'Histórico de análises',
  ],
  profissional: [
    '20 análises por mês',
    'Recurso administrativo gerado',
    'Mensagem ao pregoeiro',
    'Histórico de análises',
  ],
  empresarial: [
    '100 análises por mês',
    'Recurso administrativo gerado',
    'Mensagem ao pregoeiro',
    'Histórico de análises',
  ],
}

export default async function PlanosPage() {
  const session = await exigirUsuario()
  const planoAtual: PlanoId = ehPlanoValido(session.user.plano)
    ? session.user.plano
    : PLANO_PADRAO

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
              <h1 className="text-xl font-bold tracking-tight">Planos</h1>
              <p className="text-xs text-muted-foreground font-medium">
                Escolha o plano ideal para o seu volume de licitações
              </p>
            </div>
          </div>
          <Link href="/" className={buttonVariants({ variant: 'outline', size: 'xs' })}>
            <ArrowLeft />
            Voltar
          </Link>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(PLANOS) as PlanoId[]).map((id) => {
            const plano = PLANOS[id]
            const atual = id === planoAtual
            const destaque = id === DESTAQUE

            return (
              <Card
                key={id}
                size="sm"
                className={cn(
                  'relative flex flex-col transition-shadow hover:shadow-md',
                  destaque && 'ring-2 ring-primary',
                  atual && 'bg-muted/50'
                )}
              >
                {destaque && (
                  <span
                    className={cn(
                      badgeVariants({ variant: 'default' }),
                      'absolute -top-2.5 left-1/2 -translate-x-1/2'
                    )}
                  >
                    <Sparkles />
                    Mais popular
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="text-base">{plano.nome}</CardTitle>
                  <p className="text-xs text-muted-foreground">{plano.descricao}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <div>
                    <p className="text-3xl font-bold tabular-nums">
                      {plano.limiteAnalises}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plano.limiteAnalises === 1 ? 'análise' : 'análises'}
                      {id === 'gratis' ? ` em ${plano.duracaoDias} dias` : ' por mês'}
                    </p>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {BENEFICIOS[id].map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-px" />
                        {b}
                      </li>
                    ))}
                  </ul>

                  {atual ? (
                    <span
                      className={cn(
                        badgeVariants({ variant: 'secondary' }),
                        'justify-center py-1.5 w-full'
                      )}
                    >
                      Plano atual
                    </span>
                  ) : id !== 'gratis' ? (
                    <a
                      href={`mailto:suporte@arquidiocesedemanaus.org.br?subject=${encodeURIComponent(
                        `Assinatura LicitPro — Plano ${plano.nome}`
                      )}`}
                      className={buttonVariants({
                        variant: destaque ? 'default' : 'outline',
                        size: 'sm',
                      })}
                    >
                      Assinar
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-8">
          A contratação é feita diretamente com a nossa equipe — ao assinar, seu plano é
          ativado na sua conta.
        </p>
      </div>
    </main>
  )
}
