// app/api/empresa/perfil-financeiro/route.ts
// Ferramenta 4, Viabilidade Financeira — dados financeiros da empresa que
// alimentam (como padrão, ajustável por participação) todo cálculo de
// viabilidade. Alíquota é sempre informada pelo contador — o PATCH sempre
// grava quem informou e quando, nunca calcula o percentual sozinho.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { perfilFinanceiroEmpresa } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

export async function GET() {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const [perfil] = await db.select().from(perfilFinanceiroEmpresa).where(eq(perfilFinanceiroEmpresa.empresaId, empresaAtual.id)).limit(1)

  return NextResponse.json({ perfil: perfil ?? null })
}

interface CorpoPatch {
  aliquotaEfetivaPercentual?: string | null
  custoFixoMensal?: string | null
  faturamentoMedioMensal?: string | null
  custoDinheiroMensalPercentual?: string | null
  contingenciaPadraoPercentual?: string | null
  perdaEsperadaPadraoPercentual?: string | null
  margemMinimaPercentual?: string | null
  capitalDisponivelPadrao?: string | null
  retornoDesejadoPadraoPercentual?: string | null
  prazoMaximoSemCaixaDias?: number | null
  caixaLivre?: string | null
  creditoDisponivel?: string | null
  estoqueAtualValor?: string | null
  capacidadeEntregaMensal?: string | null
}

export async function PATCH(request: NextRequest) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const [existente] = await db.select().from(perfilFinanceiroEmpresa).where(eq(perfilFinanceiroEmpresa.empresaId, empresaAtual.id)).limit(1)

  const aliquotaMudou = body.aliquotaEfetivaPercentual !== undefined && body.aliquotaEfetivaPercentual !== existente?.aliquotaEfetivaPercentual

  const valores = {
    aliquotaEfetivaPercentual: body.aliquotaEfetivaPercentual ?? existente?.aliquotaEfetivaPercentual ?? null,
    ...(aliquotaMudou ? { aliquotaInformadaPorUserId: session.user.id, aliquotaInformadaEm: new Date() } : {}),
    custoFixoMensal: body.custoFixoMensal ?? existente?.custoFixoMensal ?? null,
    faturamentoMedioMensal: body.faturamentoMedioMensal ?? existente?.faturamentoMedioMensal ?? null,
    custoDinheiroMensalPercentual: body.custoDinheiroMensalPercentual ?? existente?.custoDinheiroMensalPercentual ?? null,
    contingenciaPadraoPercentual: body.contingenciaPadraoPercentual ?? existente?.contingenciaPadraoPercentual ?? '3',
    perdaEsperadaPadraoPercentual: body.perdaEsperadaPadraoPercentual ?? existente?.perdaEsperadaPadraoPercentual ?? null,
    margemMinimaPercentual: body.margemMinimaPercentual ?? existente?.margemMinimaPercentual ?? null,
    capitalDisponivelPadrao: body.capitalDisponivelPadrao ?? existente?.capitalDisponivelPadrao ?? null,
    retornoDesejadoPadraoPercentual: body.retornoDesejadoPadraoPercentual ?? existente?.retornoDesejadoPadraoPercentual ?? null,
    prazoMaximoSemCaixaDias: body.prazoMaximoSemCaixaDias ?? existente?.prazoMaximoSemCaixaDias ?? null,
    caixaLivre: body.caixaLivre ?? existente?.caixaLivre ?? null,
    creditoDisponivel: body.creditoDisponivel ?? existente?.creditoDisponivel ?? null,
    estoqueAtualValor: body.estoqueAtualValor ?? existente?.estoqueAtualValor ?? null,
    capacidadeEntregaMensal: body.capacidadeEntregaMensal ?? existente?.capacidadeEntregaMensal ?? null,
    updatedAt: new Date(),
  }

  const [atualizado] = await db
    .insert(perfilFinanceiroEmpresa)
    .values({ empresaId: empresaAtual.id, ...valores })
    .onConflictDoUpdate({ target: perfilFinanceiroEmpresa.empresaId, set: valores })
    .returning()

  return NextResponse.json({ perfil: atualizado })
}
