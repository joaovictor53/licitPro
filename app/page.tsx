// app/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  Scale,
  Sparkles,
  Gavel,
  Zap,
  BookOpenCheck,
  Lock,
  ChevronDown,
  FileSearch,
  Download,
  Menu,
  X,
} from 'lucide-react'
import { useSession } from '@/lib/auth-client'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy-deep text-slate-100 antialiased selection:bg-gold selection:text-navy-deep">
      <Header />
      <Hero />
      <HowItWorks />
      <Benefits />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  )
}

/* ---------- Header ---------- */
function Header() {
  const [open, setOpen] = useState(false)
  const { data: sessao } = useSession()

  const links = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#planos', label: 'Planos' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gold/10 backdrop-blur-xl bg-navy-deep/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient shadow-gold">
            <Scale className="h-5 w-5 text-navy-deep" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            LicitPro <span className="text-gold font-bold">Analyzer</span>
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-slate-400 hover:text-gold transition-colors font-medium"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {sessao ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy-deep shadow-gold hover:scale-[1.03] transition-all"
            >
              Acessar Painel
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-gold/50 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10 hover:border-gold transition-all"
            >
              Entrar / Acessar
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <button
          className="md:hidden text-gold"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gold/10 bg-navy-deep/95 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-slate-400 hover:text-gold"
            >
              {l.label}
            </a>
          ))}
          {sessao ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy-deep"
            >
              Acessar Painel
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block text-center rounded-lg border border-gold/50 px-4 py-2 text-sm font-medium text-gold"
            >
              Entrar / Acessar
            </Link>
          )}
        </div>
      )}
    </header>
  )
}

/* ---------- Hero ---------- */
function Hero() {
  const { data: sessao } = useSession()

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(600px circle at 20% 10%, oklch(0.82 0.13 85 / 0.15), transparent 60%), radial-gradient(500px circle at 85% 30%, oklch(0.5 0.15 260 / 0.25), transparent 60%)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-gold-soft mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="font-semibold text-gold-soft">Lei 14.133/2021 · Jurisprudência do TCU</span>
            </div>
            <h1 className="font-extrabold tracking-tight text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white">
              LicitPro <span className="text-gold-gradient">Analyzer</span>
              <span className="block mt-3 text-2xl md:text-3xl lg:text-4xl font-semibold text-slate-200">
                Transforme editais e propostas de concorrentes em recursos administrativos{' '}
                <span className="text-gold-gradient font-bold">vencedores</span>.
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Carregue o edital e a proposta do seu concorrente. Nossa inteligência artificial
              identifica não conformidades em segundos e gera a peça recursal e a mensagem ao
              pregoeiro prontas.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              {sessao ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-navy-deep shadow-gold transition-transform hover:scale-[1.03]"
                >
                  Ir para o Painel
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-navy-deep shadow-gold transition-transform hover:scale-[1.03]"
                >
                  Analisar Agora Grátis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold/30 px-6 py-3.5 font-medium text-slate-300 hover:border-gold/70 hover:bg-gold/5 transition-all"
              >
                Ver como funciona
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" />
                Sem cartão de crédito
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" />
                1 análise completa grátis
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gold" />
                PDFs processados localmente
              </div>
            </div>
          </div>

          {/* Mockup */}
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

function HeroMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-8 bg-gold/10 blur-3xl rounded-full"
      />
      <div className="relative glass gold-border-glow rounded-2xl p-4 md:p-5 shadow-elegant">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 pb-3 border-b border-gold/10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            licitpro / análise #2841 — pregão eletrônico 045/2026
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          {/* Upload column */}
          <div className="rounded-xl bg-navy/60 border border-gold/10 p-4 flex flex-col">
            <div className="text-[10px] uppercase tracking-wider text-gold-soft font-semibold mb-3">
              Documentos
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'Edital_PE-045-2026.pdf', size: '4,2 MB' },
                { name: 'Proposta_Concorrente.pdf', size: '1,8 MB' },
              ].map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-2 rounded-lg bg-navy-deep/60 border border-gold/10 px-2.5 py-2"
                >
                  <FileText className="h-4 w-4 text-gold" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold truncate text-slate-200">{f.name}</div>
                    <div className="text-[9px] text-slate-400">{f.size}</div>
                  </div>
                  <CheckCircle2 className="h-3.5 w-3.5 text-gold" />
                </div>
              ))}
              <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gold/30 py-3 text-[11px] text-slate-400">
                <Lock className="h-4 w-4 text-gold" />
                Leitura 100% local — seus PDFs não saem da sua máquina
              </div>
            </div>
          </div>

          {/* Report column */}
          <div className="rounded-xl bg-navy/60 border border-gold/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider text-gold-soft font-semibold">
                Não conformidades
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold">
                4 achados
              </span>
            </div>
            <div className="space-y-2">
              {[
                { t: 'CND Estadual vencida', sev: 'Alta' },
                { t: 'Patrimônio líquido insuficiente', sev: 'Alta' },
                { t: 'Atestado técnico sem registro (CAT)', sev: 'Média' },
                { t: 'Item 9.4 do edital descumprido', sev: 'Média' },
              ].map((i) => (
                <div
                  key={i.t}
                  className="flex items-start gap-2 rounded-lg bg-navy-deep/60 border border-gold/10 px-2.5 py-2"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold leading-tight text-slate-200">{i.t}</div>
                    <div className="text-[9px] text-gold-soft">Severidade: {i.sev}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold-gradient py-2 text-[11px] font-semibold text-navy-deep cursor-default">
              <Download className="h-3.5 w-3.5" />
              Baixar recurso (.docx)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    {
      icon: UploadCloud,
      title: 'Envie os dois documentos',
      desc: 'Upload seguro do edital e da proposta do concorrente. A leitura dos PDFs acontece 100% na sua máquina, protegendo a sua privacidade e a sua estratégia.',
      n: '01',
    },
    {
      icon: FileSearch,
      title: 'Varredura inteligente',
      desc: 'A IA cruza cada exigência do edital com a documentação apresentada: Lei 14.133/2021, jurisprudência do TCU e regularidade técnica e fiscal.',
      n: '02',
    },
    {
      icon: Download,
      title: 'Recurso pronto em segundos',
      desc: 'Copie de imediato a mensagem de intenção de recurso para o chat do pregoeiro e baixe a peça recursal completa, formatada e fundamentada.',
      n: '03',
    },
  ]
  return (
    <section id="como-funciona" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3 font-bold">
            Como funciona
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Da sessão do pregão ao recurso em <span className="text-gold-gradient font-bold">três passos</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative group glass rounded-2xl p-7 transition-all hover:border-gold/40 hover:-translate-y-1"
            >
              <div className="absolute top-5 right-6 text-5xl font-black text-gold/10 group-hover:text-gold/20 transition-colors">
                {s.n}
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gold-gradient shadow-gold mb-5">
                <s.icon className="h-6 w-6 text-navy-deep" strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-white">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gold/40" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Benefits ---------- */
function Benefits() {
  const items = [
    {
      icon: ShieldAlert,
      title: 'Detecção precisa de inabilitações',
      desc: 'Identificação de certidões vencidas, falta de patrimônio líquido mínimo e atestados técnicos sem comprovação — os três motivos que mais derrubam concorrentes.',
    },
    {
      icon: BookOpenCheck,
      title: 'Embasamento legal robusto',
      desc: 'Fundamentação automática com os artigos exatos da Lei 14.133/2021 e acórdãos do TCU aplicáveis a cada não conformidade encontrada.',
    },
    {
      icon: Zap,
      title: 'Mensagem pronta para o pregoeiro',
      desc: 'Gerador de texto para manifestar intenção de recurso no chat da sessão em segundos, dentro do prazo e com a fundamentação certa.',
    },
    {
      icon: Gavel,
      title: 'Peça recursal completa em .docx',
      desc: 'Recurso formatado e fundamentado, entregue em arquivo editável — só revisar, baixar e protocolar.',
    },
    {
      icon: Lock,
      title: 'Segurança de dados por arquitetura',
      desc: 'O processamento dos PDFs acontece diretamente na máquina do cliente. Rápido, privado e sem expor sua estratégia comercial.',
    },
    {
      icon: Sparkles,
      title: 'Compatível com as principais plataformas',
      desc: 'Editais e propostas gerados por sistemas como Compras.gov.br, BLL, BNC e Licitanet funcionam perfeitamente.',
    },
  ]
  return (
    <section id="funcionalidades" className="relative py-24 border-t border-gold/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3 font-bold">
            Diferenciais reais
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Feito para quem <span className="text-gold-gradient font-bold">disputa pregões de verdade</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <div
              key={it.title}
              className="group glass rounded-2xl p-6 transition-all hover:border-gold/40 hover:shadow-gold hover:-translate-y-1"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 mb-4 group-hover:bg-gold-gradient transition-all">
                <it.icon className="h-5 w-5 text-gold group-hover:text-navy-deep" strokeWidth={2.2} />
              </div>
              <h3 className="font-bold mb-2 text-white">{it.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Pricing ---------- */
function Pricing() {
  const { data: sessao } = useSession()

  const plans = [
    {
      name: 'Grátis',
      tag: 'Teste sem cartão',
      price: 'R$ 0',
      period: '/ avaliação de 2 dias',
      features: [
        '1 análise completa de edital + proposta',
        'Relatório de não conformidades',
        'Mensagem pronta para o pregoeiro',
        'Sem cartão de crédito',
      ],
      cta: 'Começar grátis',
      highlight: false,
    },
    {
      name: 'Pro',
      tag: 'Mais popular',
      price: 'R$ 197',
      period: '/ mês',
      features: [
        'Cota mensal recorrente de análises',
        'Peça recursal completa em .docx',
        'Fundamentação com artigos e acórdãos',
        'Histórico de análises salvas',
        'Suporte prioritário por e-mail',
      ],
      cta: 'Assinar o Pro',
      highlight: true,
    },
    {
      name: 'Corporativo',
      tag: 'Para equipes e escritórios',
      price: 'Sob consulta',
      period: '',
      features: [
        'Volume de análises personalizado',
        'Múltiplos usuários por conta',
        'Faturamento e nota para CNPJ',
        'Onboarding assistido da equipe',
      ],
      cta: 'Falar com vendas',
      highlight: false,
    },
  ]
  return (
    <section id="planos" className="relative py-24 border-t border-gold/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3 font-bold">Planos</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Comece grátis. <span className="text-gold-gradient font-bold">Escale quando vencer.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl p-7 transition-all hover:-translate-y-1 ${
                p.highlight
                  ? 'bg-panel gold-border-glow shadow-elegant scale-[1.02]'
                  : 'glass hover:border-gold/40'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-navy-deep shadow-gold">
                  {p.tag}
                </div>
              )}
              {!p.highlight && (
                <div className="text-[11px] uppercase tracking-wider text-gold-soft mb-2 font-bold">
                  {p.tag}
                </div>
              )}
              <h3 className="text-2xl font-bold mb-1 text-white">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold text-white ${p.highlight ? 'text-gold-gradient' : ''}`}>
                  {p.price}
                </span>
                <span className="text-sm text-slate-400 font-medium">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                    <span className="text-slate-300 font-medium">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={sessao ? '/planos' : '/login'}
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                  p.highlight
                    ? 'bg-gold-gradient text-navy-deep shadow-gold hover:scale-[1.03]'
                    : 'border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold'
                }`}
              >
                {p.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- FAQ ---------- */
function FAQ() {
  const { data: sessao } = useSession()

  const faqs = [
    {
      q: 'Meus documentos ficam armazenados nos servidores de vocês?',
      a: 'Não. A extração de texto dos PDFs acontece diretamente no seu navegador, na sua máquina. Apenas o texto necessário para a análise é enviado, de forma criptografada, ao motor de IA — e nada é usado para treinar modelos.',
    },
    {
      q: 'Qual o nível de assertividade da IA?',
      a: 'A análise é baseada na Lei 14.133/2021, na jurisprudência consolidada do TCU e nos requisitos objetivos do próprio edital (prazos de certidões, índices contábeis, exigências de atestados). Cada achado vem com a referência exata para você conferir. A ferramenta acelera e fundamenta o seu trabalho, mas a decisão de recorrer é sempre sua ou do seu advogado.',
    },
    {
      q: 'Quais formatos de arquivo são aceitos?',
      a: 'PDFs nativos (com texto selecionável) e PDFs digitalizados com boa qualidade. Editais e propostas gerados por sistemas como Compras.gov.br, BLL, BNC e Licitanet funcionam perfeitamente.',
    },
    {
      q: 'A mensagem para o pregoeiro serve para qualquer plataforma?',
      a: 'Sim. O texto gerado é objetivo e dentro do padrão aceito nos chats de sessão das principais plataformas de pregão eletrônico. Você copia, cola e registra sua intenção de recurso dentro do prazo.',
    },
    {
      q: 'Posso cancelar a assinatura quando quiser?',
      a: 'Pode. Os planos são mensais, sem fidelidade. Ao cancelar, você mantém o acesso até o fim do ciclo já pago e conserva o histórico das análises realizadas.',
    },
  ]
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <section id="faq" className="relative py-24 border-t border-gold/10">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-14">
          <div className="text-xs uppercase tracking-[0.2em] text-gold mb-3 font-bold">
            Perguntas frequentes
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Dúvidas comuns, <span className="text-gold-gradient font-bold">respostas diretas</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const open = openIdx === i
            return (
              <div
                key={f.q}
                className={`glass rounded-xl overflow-hidden transition-all ${
                  open ? 'border-gold/40' : ''
                }`}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-medium"
                >
                  <span className="font-semibold text-slate-100">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gold shrink-0 transition-transform duration-300 ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed font-medium">
                      {f.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Final CTA */}
        <div className="mt-16 relative overflow-hidden rounded-2xl bg-panel gold-border-glow p-8 md:p-10 text-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(400px circle at 50% 0%, oklch(0.82 0.13 85 / 0.25), transparent 70%)',
            }}
          />
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3 text-white">
              O prazo de recurso <span className="text-gold-gradient font-bold">não espera</span>.
            </h3>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto text-sm font-medium">
              Faça sua primeira análise agora e chegue à próxima sessão com a intenção de
              recurso pronta antes do concorrente perceber.
            </p>
            {sessao ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-navy-deep shadow-gold transition-transform hover:scale-[1.03]"
              >
                Ir para o Painel
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient px-6 py-3.5 font-semibold text-navy-deep shadow-gold transition-transform hover:scale-[1.03]"
              >
                Analisar Agora Grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-gold/10 mt-12">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-gradient shadow-gold">
                <Scale className="h-5 w-5 text-navy-deep" strokeWidth={2.5} />
              </span>
              <span className="text-lg font-semibold text-white">
                LicitPro <span className="text-gold font-bold">Analyzer</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm font-medium leading-relaxed">
              Inteligência recursal em licitações públicas. Esta ferramenta apoia a elaboração de
              recursos administrativos e não substitui aconselhamento jurídico.
            </p>
          </div>
          <FooterCol
            title="Produto"
            links={['Funcionalidades', 'Planos', 'Segurança', 'Novidades']}
          />
          <FooterCol
            title="Legal"
            links={['Termos de uso', 'Privacidade', 'LGPD', 'Contato']}
          />
        </div>
        <div className="mt-12 pt-6 border-t border-gold/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} LicitPro Analyzer. Todos os direitos reservados.</p>
          <p>Feito com precisão jurídica e engenharia de dados.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-gold mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="text-sm text-slate-400 hover:text-gold transition-colors font-medium">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
