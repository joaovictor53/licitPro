// app/api/participacoes/[id]/edital/route.ts
// Ferramenta 3, Leitura do Edital: recebe o PDF do edital (enviado pelo
// operador — o download automático a partir do link do PNCP fica para uma
// fase seguinte, quando o Radar passar a mapear o endpoint de documentos do
// PNCP), extrai o texto e monta a matriz de conformidade.

import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { acessoriaParticipacao, checklistParticipacao, documentoEmpresa, edital, exigenciaEdital, fichaRecurso } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { processarPdfServidor } from '@/lib/processar-pdf-servidor'
import { lerEdital } from '@/lib/leitura-edital'
import { extrairDotacaoOrcamentaria } from '@/lib/extrair-dotacao'
import { sugerirDocumentoParaExigencia } from '@/lib/checklist-documental'
import { MARCADOR_PAGINA } from '@/lib/texto-blocos'

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

  if (participacaoAtual.estado === 'identificada' || participacaoAtual.estado === 'em_triagem' || participacaoAtual.estado === 'descartada') {
    return NextResponse.json(
      { erro: 'Clique em "Analisar a fundo" no Radar antes de enviar o edital.' },
      { status: 409 }
    )
  }

  const formData = await request.formData().catch(() => null)
  const arquivo = formData?.get('edital')

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'Envie o PDF do edital.' }, { status: 400 })
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer())
  const hash = createHash('sha256').update(buffer).digest('hex')

  let pdf
  try {
    pdf = await processarPdfServidor(buffer)
  } catch (erroExtracao) {
    console.error('Erro ao processar PDF do edital:', erroExtracao)
    return NextResponse.json(
      { erro: 'Não foi possível ler o PDF. Verifique se o arquivo não está corrompido.' },
      { status: 422 }
    )
  }

  if (pdf.text.replace(MARCADOR_PAGINA, '').trim().length < 100) {
    return NextResponse.json(
      { erro: 'Não foi possível extrair conteúdo legível do edital, mesmo com OCR.' },
      { status: 422 }
    )
  }

  let leitura
  try {
    leitura = await lerEdital(pdf.text)
  } catch (erroLeitura) {
    console.error('Erro ao ler o edital com a IA:', erroLeitura)
    return NextResponse.json({ erro: 'Erro ao processar o edital com a IA. Tente novamente.' }, { status: 500 })
  }

  // Ferramenta 2 (Ficha do Recurso), "o que o sistema já traz preenchido":
  // procura a dotação orçamentária no mesmo momento em que o edital é lido.
  // Falha aqui não derruba a leitura do edital — o operador ainda pode
  // preencher a ficha manualmente se a extração automática não funcionar.
  let dotacaoOrcamentaria = null
  try {
    dotacaoOrcamentaria = await extrairDotacaoOrcamentaria(pdf.text)
  } catch (erroDotacao) {
    console.error('Erro ao extrair dotação orçamentária do edital:', erroDotacao)
  }

  // Reenvio do mesmo edital substitui a matriz anterior — não guardamos
  // histórico de versões nesta primeira fase.
  await db.delete(exigenciaEdital).where(eq(exigenciaEdital.participacaoId, id))
  await db.delete(edital).where(eq(edital.participacaoId, id))

  if (dotacaoOrcamentaria) {
    await db
      .insert(fichaRecurso)
      .values({ participacaoId: id, dotacaoOrcamentaria })
      .onConflictDoUpdate({ target: fichaRecurso.participacaoId, set: { dotacaoOrcamentaria, updatedAt: new Date() } })
  }

  await db.insert(edital).values({
    participacaoId: id,
    enviadoPorUserId: session.user.id,
    nomeArquivo: arquivo.name || 'edital.pdf',
    hash,
    numPaginas: pdf.numpages,
    textoExtraido: pdf.text,
  })

  if (leitura.exigencias.length > 0) {
    await db.insert(exigenciaEdital).values(
      leitura.exigencias.map((ex, indice) => ({
        participacaoId: id,
        ordem: indice,
        titulo: ex.titulo,
        tipo: ex.tipo,
        obrigatorio: ex.obrigatorio,
        oQueExige: ex.o_que_exige,
        criterioAceitacao: ex.criterio_aceitacao || null,
        trecho: ex.trecho,
        pagina: ex.pagina,
        clausula: ex.clausula,
        risco: ex.risco,
        confianca: ex.confianca,
        requerVerificacaoManual: ex.requerVerificacaoManual,
      }))
    )
  }

  const exigenciasSalvas = await db
    .select()
    .from(exigenciaEdital)
    .where(eq(exigenciaEdital.participacaoId, id))
    .orderBy(exigenciaEdital.ordem)

  // Ferramenta 6 (Preparação Documental): "o checklist vem da matriz, não é
  // digitado de novo" — uma linha por exigência de habilitação, mais o bloco
  // separado das exigências acessórias (garantia, amostra, POC, visita
  // técnica). O vínculo a um documento do dossiê é só sugestão por
  // palavra-chave; nasce sempre 'a_verificar' até confirmação humana.
  const exigenciasHabilitacao = exigenciasSalvas.filter((ex) => ex.tipo === 'habilitacao')
  const exigenciasAcessorias = exigenciasSalvas.filter((ex) => ex.tipo === 'acessoria')

  if (exigenciasHabilitacao.length > 0) {
    const documentosAtivos = await db
      .select({ id: documentoEmpresa.id, tipo: documentoEmpresa.tipo, nome: documentoEmpresa.nome })
      .from(documentoEmpresa)
      .where(and(eq(documentoEmpresa.empresaId, participacaoAtual.empresaId), eq(documentoEmpresa.ativo, true)))

    await db.insert(checklistParticipacao).values(
      exigenciasHabilitacao.map((ex) => {
        const sugestao = sugerirDocumentoParaExigencia(`${ex.titulo} ${ex.oQueExige}`, documentosAtivos)
        return {
          participacaoId: id,
          exigenciaEditalId: ex.id,
          documentoEmpresaId: sugestao?.id ?? null,
          vinculadoAutomaticamente: sugestao != null,
          marcoValidadoContra: participacaoAtual.dataSessaoEm ? 'Data da sessão' : null,
          marcoDataEm: participacaoAtual.dataSessaoEm,
        }
      })
    )
  }

  if (exigenciasAcessorias.length > 0) {
    await db.insert(acessoriaParticipacao).values(
      exigenciasAcessorias.map((ex) => ({ participacaoId: id, exigenciaEditalId: ex.id }))
    )
  }

  return NextResponse.json({
    edital: { nomeArquivo: arquivo.name || 'edital.pdf', numPaginas: pdf.numpages },
    exigencias: exigenciasSalvas,
    aviso:
      leitura.exigencias.length === 0
        ? 'Nenhuma seção esperada (habilitação, desclassificação, objeto, prazos) foi localizada no texto extraído — confira se o PDF não está incompleto ou mal digitalizado.'
        : null,
  })
}
