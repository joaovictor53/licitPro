// app/termos/page.tsx

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
  title: 'Termos de Uso — LicitPro Analyzer',
  description:
    'Termos de Uso do LicitPro Analyzer: condições de utilização, limites de responsabilidade e natureza da análise gerada.',
}

const ATUALIZADO_EM = '22 de julho de 2026'

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Termos de Uso</h1>
            <p className="text-xs text-muted-foreground font-medium">LicitPro Analyzer</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-8 pl-[52px]">
          Última atualização: {ATUALIZADO_EM}
        </p>

        <Separator className="mb-8" />

        <article className="space-y-6 text-sm leading-relaxed text-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-muted-foreground">
          <section>
            <h2>1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o LicitPro Analyzer (&ldquo;plataforma&rdquo;), você
              declara ter lido, compreendido e aceitado integralmente estes Termos de Uso. Caso
              não concorde com qualquer condição aqui prevista, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2>2. Descrição do serviço</h2>
            <p>
              O LicitPro Analyzer é uma ferramenta de <strong>apoio técnico</strong> que utiliza
              inteligência artificial para analisar editais e propostas de concorrentes,
              identificar possíveis não conformidades e gerar minutas de recurso administrativo e
              de mensagem ao pregoeiro.
            </p>
          </section>

          <section>
            <h2>3. Natureza da análise e limites de responsabilidade</h2>
            <p>
              A análise gerada pela plataforma tem caráter <strong>informativo e de apoio</strong>
              , apontando fundamentos que podem embasar um recurso, mas <strong>não constitui
              consultoria ou parecer jurídico</strong> e <strong>não garante o êxito</strong> de
              qualquer recurso, impugnação ou providência.
            </p>
            <p>
              A validação jurídica final de qualquer apontamento, bem como a decisão de
              protocolar o recurso ou enviar a mensagem ao pregoeiro, é de responsabilidade
              exclusiva de quem utiliza a ferramenta no pregão — o próprio licitante, um técnico
              em licitações ou um advogado. O usuário deve sempre conferir as citações e os
              trechos indicados diretamente nos documentos originais antes de qualquer uso.
            </p>
            <p>
              A plataforma pode conter imprecisões decorrentes da leitura automatizada de
              documentos (inclusive escaneados) e da interpretação por modelos de inteligência
              artificial. O LicitPro Analyzer não se responsabiliza por decisões tomadas com base
              exclusiva na análise, nem por prejuízos, perdas de prazo ou resultados adversos em
              processos licitatórios.
            </p>
          </section>

          <section>
            <h2>4. Responsabilidades do usuário</h2>
            <ul>
              <li>Utilizar a plataforma de acordo com a legislação aplicável.</li>
              <li>
                Garantir que possui autorização para submeter os documentos enviados para análise.
              </li>
              <li>Conferir e validar juridicamente o conteúdo gerado antes de utilizá-lo.</li>
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
            </ul>
          </section>

          <section>
            <h2>5. Dados e privacidade</h2>
            <p>
              Os documentos e dados enviados são utilizados para gerar a análise e podem ser
              armazenados no histórico da conta do usuário. O tratamento de dados pessoais observa
              a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2>6. Planos e pagamentos</h2>
            <p>
              O uso da plataforma pode estar sujeito a planos com limites de análises e cobranças,
              conforme descrito na página de planos. As condições comerciais vigentes prevalecem
              no momento da contratação.
            </p>
          </section>

          <section>
            <h2>7. Alterações destes Termos</h2>
            <p>
              Estes Termos podem ser atualizados a qualquer momento. A versão vigente estará sempre
              disponível nesta página, com a respectiva data de atualização.
            </p>
          </section>

          <section>
            <h2>8. Contato</h2>
            <p>
              Dúvidas sobre estes Termos podem ser encaminhadas pelos canais de atendimento
              informados na plataforma.
            </p>
          </section>

          <p className="!text-xs italic pt-2">
            Este documento é uma versão preliminar e deve ser revisado pelo setor jurídico antes
            da abertura comercial do produto.
          </p>
        </article>

        <Separator className="my-8" />

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
      </div>
    </main>
  )
}
