// app/api/participacoes/[id]/declaracoes/route.ts
// Ferramenta 13 / 9 — declarações da habilitação e procuração geradas em PDF para o sócio ou
// administrador assinar. O sistema nunca assina: gera o texto, marca "confira antes de assinar"
// e não gera nada com campo em branco. Os PDFs não ficam guardados; saem direto para download.

import { NextRequest, NextResponse } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { empresa, exigenciaEdital } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { avaliarSignatario } from '@/lib/poderes-signatario'
import {
  ehDeclaracao, MODELOS, montarDeclaracaoPadrao, montarDeclaracaoPeloTrecho, montarProcuracao, tipoDeDeclaracaoPorNome,
  type DadosEmpresaDeclaracao, type ResultadoMontagem, type TipoDeclaracao,
} from '@/lib/declaracoes'
import { gerarPdfDeTexto } from '@/lib/pdf-texto'

const carregarEmpresa = async (empresaId: string): Promise<DadosEmpresaDeclaracao & { representanteCompleto: import('@/types/empresa-tipos').RepresentanteLegal | null }> => {
  const [dados] = await db.select().from(empresa).where(eq(empresa.id, empresaId)).limit(1)
  return {
    razaoSocial: dados?.razaoSocial ?? null,
    cnpj: dados?.cnpj ?? null,
    endereco: dados?.endereco ?? null,
    porte: dados?.porte ?? null,
    representante: dados?.representanteLegal ? { nome: dados.representanteLegal.nome, cpf: dados.representanteLegal.cpf } : null,
    representanteCompleto: dados?.representanteLegal ?? null,
  }
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

  const dados = await carregarEmpresa(participacaoAtual.empresaId)
  const exigencias = await db
    .select({ id: exigenciaEdital.id, titulo: exigenciaEdital.titulo, pagina: exigenciaEdital.pagina })
    .from(exigenciaEdital)
    .where(eq(exigenciaEdital.participacaoId, id))
    .orderBy(asc(exigenciaEdital.ordem))

  return NextResponse.json({
    signatario: avaliarSignatario(dados.representanteCompleto),
    tiposPadrao: (Object.keys(MODELOS) as TipoDeclaracao[]).map((tipo) => ({ tipo, titulo: MODELOS[tipo].titulo })),
    // Declarações que o edital pede, com o texto padrão que as cobre (ou nenhum: então sai pelo trecho do edital).
    exigidasPeloEdital: exigencias
      .filter((e) => ehDeclaracao(e.titulo))
      .map((e) => ({ exigenciaId: e.id, titulo: e.titulo, pagina: e.pagina, tipoPadrao: tipoDeDeclaracaoPorNome(e.titulo) })),
  })
}

interface CorpoPost {
  tipo?: TipoDeclaracao
  exigenciaId?: string
  procuracao?: boolean
  cidade?: string
  validade?: string
  outorgante?: { nome?: string; cpf?: string; cargo?: string }
}

export async function POST(
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

  const body = (await request.json().catch(() => null)) as CorpoPost | null
  if (!body) return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })

  const dados = await carregarEmpresa(participacaoAtual.empresaId)
  const cidade = body.cidade?.trim() ?? ''
  const hoje = new Date()

  let resultado: ResultadoMontagem
  if (body.procuracao) {
    const signatario = avaliarSignatario(dados.representanteCompleto)
    if (signatario.situacao !== 'precisa_procuracao') {
      return NextResponse.json({ erro: `Procuração não se aplica: ${signatario.mensagem}` }, { status: 409 })
    }
    const rep = dados.representanteCompleto!
    resultado = montarProcuracao(
      {
        empresa: dados,
        objeto: participacaoAtual.objeto,
        validade: body.validade,
        outorgante: { nome: body.outorgante?.nome?.trim() ?? '', cpf: body.outorgante?.cpf?.trim() ?? '', cargo: body.outorgante?.cargo?.trim() ?? '' },
        outorgado: { nome: rep.nome, cpf: rep.cpf ?? '', cargo: rep.poderes ?? '' },
      },
      cidade,
      hoje
    )
  } else if (body.exigenciaId) {
    const [exigencia] = await db
      .select()
      .from(exigenciaEdital)
      .where(and(eq(exigenciaEdital.id, body.exigenciaId), eq(exigenciaEdital.participacaoId, id)))
      .limit(1)
    if (!exigencia) return NextResponse.json({ erro: 'Exigência não encontrada.' }, { status: 404 })
    const tipoPadrao = tipoDeDeclaracaoPorNome(exigencia.titulo)
    resultado = tipoPadrao
      ? montarDeclaracaoPadrao(tipoPadrao, dados, cidade, hoje)
      : montarDeclaracaoPeloTrecho({ titulo: exigencia.titulo, trecho: exigencia.trecho, pagina: exigencia.pagina, clausula: exigencia.clausula }, dados, cidade, hoje)
  } else if (body.tipo && body.tipo in MODELOS) {
    resultado = montarDeclaracaoPadrao(body.tipo, dados, cidade, hoje)
  } else {
    return NextResponse.json({ erro: 'Informe o tipo da declaração, a exigência do edital ou procuracao.' }, { status: 400 })
  }

  if (!resultado.ok) return NextResponse.json({ erro: resultado.erro }, { status: 400 })

  const pdf = await gerarPdfDeTexto(resultado.declaracao.texto, { rodape: resultado.declaracao.rodape })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${resultado.declaracao.nomeArquivo}"`,
    },
  })
}
