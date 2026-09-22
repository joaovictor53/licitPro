// app/api/participacoes/[id]/upload/route.ts
// Ferramenta 11, Preparação do Arquivo para Upload — computa tudo ao vivo
// (sem persistir "pacote pronto"): não há renomeação/compressão real de
// arquivo, só o cálculo do que precisaria mudar. ?plataformaId= seleciona
// contra qual cadastro conferir; sem o parâmetro, só mostra os arquivos.

import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { plataformaCompra, versaoPlanilhaPrecos, versaoProposta } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { ArquivoParaPreparar, prepararArquivo } from '@/lib/preparo-upload'

export async function GET(
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

  const plataformaId = request.nextUrl.searchParams.get('plataformaId')

  const [ultimaPlanilha] = await db
    .select()
    .from(versaoPlanilhaPrecos)
    .where(eq(versaoPlanilhaPrecos.participacaoId, id))
    .orderBy(desc(versaoPlanilhaPrecos.versao))
    .limit(1)
  const [ultimaProposta] = await db
    .select()
    .from(versaoProposta)
    .where(eq(versaoProposta.participacaoId, id))
    .orderBy(desc(versaoProposta.versao))
    .limit(1)

  const arquivos: ArquivoParaPreparar[] = []
  if (ultimaProposta) {
    arquivos.push({
      peca: 'Proposta comercial',
      nomeOriginal: ultimaProposta.arquivoNome,
      tamanhoBytes: Buffer.byteLength(ultimaProposta.arquivoBase64, 'base64'),
      formato: 'PDF',
    })
  }
  if (ultimaPlanilha) {
    arquivos.push({
      peca: 'Planilha de preços',
      nomeOriginal: ultimaPlanilha.arquivoNome,
      tamanhoBytes: Buffer.byteLength(ultimaPlanilha.arquivoBase64, 'base64'),
      formato: 'XLSX',
    })
  }

  let plataforma = null
  if (plataformaId) {
    const [encontrada] = await db.select().from(plataformaCompra).where(eq(plataformaCompra.id, plataformaId)).limit(1)
    plataforma = encontrada ?? null
  }

  const arquivosPreparados = arquivos.map((arquivo) =>
    prepararArquivo(arquivo, plataforma ? { nome: plataforma.nome, tamanhoMaximoMb: plataforma.tamanhoMaximoMb, formatosAceitos: plataforma.formatosAceitos } : null)
  )

  const verificacaoFinal = {
    ok: arquivos.length > 0 && arquivosPreparados.every((a) => a.situacao === 'pronto' || a.situacao === 'renomeado'),
    pendencias: arquivos.length === 0
      ? ['Nenhum arquivo gerado ainda — gere a planilha de preços e a proposta antes de preparar o upload.']
      : arquivosPreparados.filter((a) => a.situacao === 'excede_fracionar' || a.situacao === 'formato_nao_aceito').map((a) => `${a.peca}: ${a.avisos.join(' ')}`),
  }

  return NextResponse.json({ arquivos: arquivosPreparados, plataforma, verificacaoFinal })
}
