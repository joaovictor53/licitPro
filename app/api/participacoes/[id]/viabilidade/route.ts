// app/api/participacoes/[id]/viabilidade/route.ts
// Ferramenta 4, Viabilidade Financeira e Retorno — GET traz os insumos
// salvos (com os padrões do perfil financeiro da empresa e da Ficha do
// Recurso quando ainda não há nada digitado nesta participação); PATCH salva
// e recalcula tudo (composição, piso/alvo/teto, cenários, retorno, exposição
// de caixa) — cálculo puro, nunca decidido pela IA.

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { fichaRecurso, perfilFinanceiroEmpresa, viabilidadeParticipacao } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularViabilidade, InsumosViabilidade } from '@/lib/viabilidade'
import { FORMAS_GARANTIA, FormaGarantia } from '@/types/viabilidade-tipos'

const numero = (valor: unknown): number => {
  const n = typeof valor === 'string' ? parseFloat(valor) : typeof valor === 'number' ? valor : NaN
  return Number.isFinite(n) ? n : 0
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const [viabilidade] = await db.select().from(viabilidadeParticipacao).where(eq(viabilidadeParticipacao.participacaoId, id)).limit(1)
  const [perfil] = await db.select().from(perfilFinanceiroEmpresa).where(eq(perfilFinanceiroEmpresa.empresaId, participacaoAtual.empresaId)).limit(1)
  const [ficha] = await db.select().from(fichaRecurso).where(eq(fichaRecurso.participacaoId, id)).limit(1)

  return NextResponse.json({
    viabilidade: viabilidade ?? null,
    perfil: perfil ?? null,
    tetoSugerido: participacaoAtual.valorEstimado,
    prazoEstimadoPagamentoEm: ficha?.prazoEstimadoPagamentoEm ?? null,
  })
}

interface CorpoPatch {
  quantidadeTotal?: string
  unidade?: string | null
  cotacaoFornecedorId?: string | null
  custoAquisicaoUnitario?: string
  freteTotal?: string
  numeroEntregas?: number
  armazenagemTotal?: string | null
  maoObraTotal?: string | null
  prazoPagamentoFornecedorDias?: number
  prazoRecebimentoDias?: number
  formaGarantia?: string
  custoGarantia?: string | null
  valorGarantiaCaucao?: string | null
  tetoEdital?: string
  precoOfertadoUnitario?: string | null
  estoqueJaDisponivelValor?: string | null
  perdaEsperadaPercentual?: string
  contingenciaPercentual?: string
  margemMinimaPercentual?: string
  aliquotaEfetivaPercentual?: string
  capitalDisponivel?: string
  retornoDesejadoPercentual?: string
  cenarioConservadorFornecedorPercentual?: string
  cenarioConservadorPrazoPercentual?: string
  cenarioConservadorPerdaPontosPercentuais?: string
  precoVencedorUnitario?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const { id } = await params
  const { participacaoAtual } = await obterParticipacaoDaEmpresa(session.user.id, id)
  if (!participacaoAtual) {
    return NextResponse.json({ erro: 'Participação não encontrada.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as CorpoPatch | null
  if (!body) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  if (body.formaGarantia != null && !FORMAS_GARANTIA.includes(body.formaGarantia as FormaGarantia)) {
    return NextResponse.json({ erro: `Forma de garantia inválida. Use uma de: ${FORMAS_GARANTIA.join(', ')}.` }, { status: 400 })
  }

  const [perfil] = await db.select().from(perfilFinanceiroEmpresa).where(eq(perfilFinanceiroEmpresa.empresaId, participacaoAtual.empresaId)).limit(1)

  const insumos: InsumosViabilidade = {
    quantidadeTotal: numero(body.quantidadeTotal),
    custoAquisicaoUnitario: numero(body.custoAquisicaoUnitario),
    freteTotal: numero(body.freteTotal),
    numeroEntregas: body.numeroEntregas && body.numeroEntregas > 0 ? body.numeroEntregas : 1,
    armazenagemTotal: numero(body.armazenagemTotal),
    maoObraTotal: numero(body.maoObraTotal),
    prazoPagamentoFornecedorDias: body.prazoPagamentoFornecedorDias ?? 0,
    prazoRecebimentoDias: body.prazoRecebimentoDias ?? 0,
    formaGarantia: (body.formaGarantia as FormaGarantia) ?? 'nenhuma',
    custoGarantia: numero(body.custoGarantia),
    valorGarantiaCaucao: numero(body.valorGarantiaCaucao),
    tetoEdital: numero(body.tetoEdital) || numero(participacaoAtual.valorEstimado),
    precoOfertadoUnitario: body.precoOfertadoUnitario ? numero(body.precoOfertadoUnitario) : null,

    perdaEsperadaPercentual: numero(body.perdaEsperadaPercentual ?? perfil?.perdaEsperadaPadraoPercentual),
    custoFixoMensal: numero(perfil?.custoFixoMensal),
    faturamentoMedioMensal: numero(perfil?.faturamentoMedioMensal),
    custoDinheiroMensalPercentual: numero(perfil?.custoDinheiroMensalPercentual),
    contingenciaPercentual: numero(body.contingenciaPercentual ?? perfil?.contingenciaPadraoPercentual ?? '3'),
    margemMinimaPercentual: numero(body.margemMinimaPercentual ?? perfil?.margemMinimaPercentual),
    aliquotaEfetivaPercentual: numero(body.aliquotaEfetivaPercentual ?? perfil?.aliquotaEfetivaPercentual),

    capitalDisponivel: numero(body.capitalDisponivel ?? perfil?.capitalDisponivelPadrao),
    retornoDesejadoPercentual: numero(body.retornoDesejadoPercentual ?? perfil?.retornoDesejadoPadraoPercentual),
    estoqueJaDisponivelValor: numero(body.estoqueJaDisponivelValor),
    caixaLivre: numero(perfil?.caixaLivre),
    creditoDisponivel: numero(perfil?.creditoDisponivel),
    capacidadeEntregaMensal: numero(perfil?.capacidadeEntregaMensal),

    cenarioConservadorFornecedorPercentual: numero(body.cenarioConservadorFornecedorPercentual ?? '10'),
    cenarioConservadorPrazoPercentual: numero(body.cenarioConservadorPrazoPercentual ?? '50'),
    cenarioConservadorPerdaPontosPercentuais: numero(body.cenarioConservadorPerdaPontosPercentuais ?? '2'),
  }

  const resultado = calcularViabilidade(insumos)

  const valores = {
    quantidadeTotal: body.quantidadeTotal ?? null,
    unidade: body.unidade?.trim() || null,
    cotacaoFornecedorId: body.cotacaoFornecedorId ?? null,
    custoAquisicaoUnitario: body.custoAquisicaoUnitario ?? null,
    freteTotal: body.freteTotal ?? null,
    numeroEntregas: insumos.numeroEntregas,
    armazenagemTotal: body.armazenagemTotal ?? null,
    maoObraTotal: body.maoObraTotal ?? null,
    prazoPagamentoFornecedorDias: insumos.prazoPagamentoFornecedorDias,
    prazoRecebimentoDias: insumos.prazoRecebimentoDias,
    formaGarantia: insumos.formaGarantia,
    custoGarantia: body.custoGarantia ?? null,
    valorGarantiaCaucao: body.valorGarantiaCaucao ?? null,
    tetoEdital: String(insumos.tetoEdital),
    precoOfertadoUnitario: body.precoOfertadoUnitario ?? null,
    estoqueJaDisponivelValor: body.estoqueJaDisponivelValor ?? null,
    perdaEsperadaPercentual: String(insumos.perdaEsperadaPercentual),
    contingenciaPercentual: String(insumos.contingenciaPercentual),
    margemMinimaPercentual: String(insumos.margemMinimaPercentual),
    aliquotaEfetivaPercentual: String(insumos.aliquotaEfetivaPercentual),
    capitalDisponivel: String(insumos.capitalDisponivel),
    retornoDesejadoPercentual: String(insumos.retornoDesejadoPercentual),
    cenarioConservadorFornecedorPercentual: String(insumos.cenarioConservadorFornecedorPercentual),
    cenarioConservadorPrazoPercentual: String(insumos.cenarioConservadorPrazoPercentual),
    cenarioConservadorPerdaPontosPercentuais: String(insumos.cenarioConservadorPerdaPontosPercentuais),
    precoVencedorUnitario: body.precoVencedorUnitario ?? null,
    resultado,
    // Qualquer recálculo invalida a ciência anterior — o estouro de caixa
    // pode ter mudado, e ciência velha não vale para números novos.
    cienciaEstouroConfirmada: false,
    cienciaEstouroPorUserId: null,
    cienciaEstouroEm: null,
    atualizadoPorUserId: session.user.id,
    updatedAt: new Date(),
  }

  const [atualizado] = await db
    .insert(viabilidadeParticipacao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: viabilidadeParticipacao.participacaoId, set: valores })
    .returning()

  return NextResponse.json({ viabilidade: atualizado })
}
