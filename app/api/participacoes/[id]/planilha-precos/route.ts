// app/api/participacoes/[id]/planilha-precos/route.ts
// Ferramenta 7, Composição de Preço — gerar planilha (cria nova versão) e
// listar versões já geradas. Sem detecção de planilha-modelo do edital (ver
// nota em lib/planilha-precos.ts) — sempre gera no formato padrão do sistema.

import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { itemPrecoParticipacao, versaoPlanilhaPrecos } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularTotaisPlanilha, montarSnapshotItem } from '@/lib/composicao-preco'
import { gerarPlanilhaPrecos } from '@/lib/planilha-precos'

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

  const versoes = await db
    .select({
      id: versaoPlanilhaPrecos.id,
      versao: versaoPlanilhaPrecos.versao,
      arquivoNome: versaoPlanilhaPrecos.arquivoNome,
      usouModeloEdital: versaoPlanilhaPrecos.usouModeloEdital,
      totais: versaoPlanilhaPrecos.totais,
      geradoPorUserId: versaoPlanilhaPrecos.geradoPorUserId,
      createdAt: versaoPlanilhaPrecos.createdAt,
    })
    .from(versaoPlanilhaPrecos)
    .where(eq(versaoPlanilhaPrecos.participacaoId, id))
    .orderBy(desc(versaoPlanilhaPrecos.versao))

  return NextResponse.json({ versoes })
}

export async function POST(
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

  const itens = await db
    .select()
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))
    .orderBy(asc(itemPrecoParticipacao.ordem))

  if (itens.length === 0) {
    return NextResponse.json({ erro: 'Cadastre ao menos um item antes de gerar a planilha.' }, { status: 400 })
  }

  const entradas = itens.map((item) => ({
    id: item.id,
    ordem: item.ordem,
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: Number(item.quantidade),
    marcaModelo: item.marcaModelo,
    custoUnitario: item.custoUnitario != null ? Number(item.custoUnitario) : null,
    pisoUnitario: item.pisoUnitario != null ? Number(item.pisoUnitario) : null,
    alvoUnitario: item.alvoUnitario != null ? Number(item.alvoUnitario) : null,
    tetoUnitario: item.tetoUnitario != null ? Number(item.tetoUnitario) : null,
    precoOfertado: item.precoOfertado != null ? Number(item.precoOfertado) : null,
  }))

  const acimaTeto = entradas.filter((e) => e.tetoUnitario != null && e.precoOfertado != null && e.precoOfertado > e.tetoUnitario)
  if (acimaTeto.length > 0) {
    return NextResponse.json(
      { erro: `${acimaTeto.length} item(ns) acima do teto do edital — corrija o preço antes de gerar.`, itensAcimaTeto: acimaTeto.map((e) => e.id) },
      { status: 409 }
    )
  }

  const snapshotItens = entradas.map(montarSnapshotItem)
  const totais = calcularTotaisPlanilha(entradas, participacaoAtual.valorEstimado != null ? Number(participacaoAtual.valorEstimado) : null)

  const buffer = await gerarPlanilhaPrecos({
    orgao: participacaoAtual.orgao,
    objeto: participacaoAtual.objeto,
    numeroProcesso: participacaoAtual.numeroProcesso,
    itens: snapshotItens,
    totais,
  })

  const [{ ultimaVersao } = { ultimaVersao: 0 }] = await db
    .select({ ultimaVersao: versaoPlanilhaPrecos.versao })
    .from(versaoPlanilhaPrecos)
    .where(eq(versaoPlanilhaPrecos.participacaoId, id))
    .orderBy(desc(versaoPlanilhaPrecos.versao))
    .limit(1)

  const proximaVersao = (ultimaVersao ?? 0) + 1
  const arquivoNome = `planilha-precos-v${proximaVersao}.xlsx`

  const [criada] = await db
    .insert(versaoPlanilhaPrecos)
    .values({
      participacaoId: id,
      versao: proximaVersao,
      arquivoNome,
      arquivoBase64: buffer.toString('base64'),
      usouModeloEdital: false,
      snapshotItens,
      totais,
      geradoPorUserId: session.user.id,
    })
    .returning({
      id: versaoPlanilhaPrecos.id,
      versao: versaoPlanilhaPrecos.versao,
      arquivoNome: versaoPlanilhaPrecos.arquivoNome,
      totais: versaoPlanilhaPrecos.totais,
      createdAt: versaoPlanilhaPrecos.createdAt,
    })

  return NextResponse.json({ versao: criada })
}
