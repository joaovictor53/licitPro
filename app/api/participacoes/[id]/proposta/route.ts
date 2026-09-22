// app/api/participacoes/[id]/proposta/route.ts
// Ferramenta 8, Montagem da Proposta — GET traz a lista de montagem e a
// checagem final (sem persistir nada); POST gera o documento, cria versão
// e SÓ gera se a checagem passar — aqui bloqueia de verdade.

import { NextRequest, NextResponse } from 'next/server'
import { asc, desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { empresa, itemPrecoParticipacao, versaoProposta } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { montarAgregadoProposta } from '@/lib/montagem-proposta'
import { gerarDocumentoProposta } from '@/lib/documento-proposta'
import { montarSnapshotItem } from '@/lib/composicao-preco'

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

  const agregado = await montarAgregadoProposta(id)

  const versoes = await db
    .select({
      id: versaoProposta.id,
      versao: versaoProposta.versao,
      arquivoNome: versaoProposta.arquivoNome,
      aprovada: versaoProposta.aprovada,
      createdAt: versaoProposta.createdAt,
    })
    .from(versaoProposta)
    .where(eq(versaoProposta.participacaoId, id))
    .orderBy(desc(versaoProposta.versao))

  return NextResponse.json({ agregado, versoes })
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

  const agregado = await montarAgregadoProposta(id)
  if (!agregado.checagem.podeGerar) {
    return NextResponse.json({ erro: 'A checagem final não passou — corrija as pendências antes de gerar.', pendencias: agregado.checagem.pendencias }, { status: 409 })
  }

  const [empresaAtual] = await db.select().from(empresa).where(eq(empresa.id, participacaoAtual.empresaId)).limit(1)

  const itensPreco = await db
    .select()
    .from(itemPrecoParticipacao)
    .where(eq(itemPrecoParticipacao.participacaoId, id))
    .orderBy(asc(itemPrecoParticipacao.ordem))

  const snapshotItens = itensPreco.map((item) =>
    montarSnapshotItem({
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
    })
  )
  const totalGeral = snapshotItens.reduce((soma, item) => soma + item.avaliacao.totalItem, 0)

  const buffer = await gerarDocumentoProposta({
    empresa: {
      razaoSocial: empresaAtual?.razaoSocial ?? null,
      cnpj: empresaAtual?.cnpj ?? null,
      endereco: empresaAtual?.endereco ?? null,
      identidadeVisual: empresaAtual?.identidadeVisual ?? null,
    },
    participacao: {
      orgao: participacaoAtual.orgao,
      objeto: participacaoAtual.objeto,
      numeroProcesso: participacaoAtual.numeroProcesso,
      modalidade: participacaoAtual.modalidade,
    },
    itens: snapshotItens,
    totalGeral,
  })

  const [{ ultimaVersao } = { ultimaVersao: 0 }] = await db
    .select({ ultimaVersao: versaoProposta.versao })
    .from(versaoProposta)
    .where(eq(versaoProposta.participacaoId, id))
    .orderBy(desc(versaoProposta.versao))
    .limit(1)

  const proximaVersao = (ultimaVersao ?? 0) + 1
  const arquivoNome = `proposta-v${proximaVersao}.pdf`

  const [criada] = await db
    .insert(versaoProposta)
    .values({
      participacaoId: id,
      versao: proximaVersao,
      arquivoNome,
      arquivoBase64: buffer.toString('base64'),
      pecas: agregado.pecas,
      checagem: agregado.checagem,
      geradoPorUserId: session.user.id,
    })
    .returning({
      id: versaoProposta.id,
      versao: versaoProposta.versao,
      arquivoNome: versaoProposta.arquivoNome,
      aprovada: versaoProposta.aprovada,
      createdAt: versaoProposta.createdAt,
    })

  return NextResponse.json({ versao: criada })
}
