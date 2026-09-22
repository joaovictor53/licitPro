// app/api/participacoes/[id]/contrato/route.ts
// Ferramenta 15 — contrato ou ata de registro de preços. Documentos são
// revalidados na data da ASSINATURA (mesma função pura da Habilitação, com
// outro marco). A assinatura do contrato em si segue o caminho da
// Ferramenta 9 (registro manual do arquivo assinado, sem API do gov.br).

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { checklistParticipacao, contratoParticipacao, documentoEmpresa, exigenciaEdital } from '@/app/src/db/schema'
import { obterParticipacaoDaEmpresa } from '@/lib/empresa-server'
import { calcularSituacaoChecklist } from '@/lib/checklist-documental'
import { TIPOS_CONTRATO, TipoContrato } from '@/types/resultado-tipos'

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

  const [contrato] = await db.select().from(contratoParticipacao).where(eq(contratoParticipacao.participacaoId, id)).limit(1)

  let revalidacao: { titulo: string; situacaoNaAssinatura: string }[] = []
  if (contrato?.dataAssinaturaEm) {
    const dataAssinaturaEm = new Date(contrato.dataAssinaturaEm)
    const itens = await db
      .select({
        titulo: exigenciaEdital.titulo,
        tipoDocumento: documentoEmpresa.tipo,
        validadeEm: documentoEmpresa.validadeEm,
        dadosBalanco: documentoEmpresa.dadosBalanco,
      })
      .from(checklistParticipacao)
      .innerJoin(exigenciaEdital, eq(exigenciaEdital.id, checklistParticipacao.exigenciaEditalId))
      .leftJoin(documentoEmpresa, eq(documentoEmpresa.id, checklistParticipacao.documentoEmpresaId))
      .where(eq(checklistParticipacao.participacaoId, id))

    revalidacao = itens.map((item) => ({
      titulo: item.titulo,
      situacaoNaAssinatura: calcularSituacaoChecklist(
        item.tipoDocumento ? { tipo: item.tipoDocumento, validadeEm: item.validadeEm, dadosBalanco: item.dadosBalanco } : null,
        dataAssinaturaEm
      ),
    }))
  }

  return NextResponse.json({ contrato: contrato ?? null, revalidacao })
}

interface CorpoPatch {
  tipo?: TipoContrato
  numero?: string
  dataAssinaturaEm?: string
  vigenciaInicioEm?: string
  vigenciaFimEm?: string
  valorContratado?: string
  objetoContratado?: string
  gestorFiscalNome?: string
  arquivoAssinadoNome?: string
  arquivoAssinadoBase64?: string
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
  if (!body?.tipo || !TIPOS_CONTRATO.includes(body.tipo) || !body.numero?.trim()) {
    return NextResponse.json({ erro: 'Informe o tipo (contrato/ata_registro_precos) e o número.' }, { status: 400 })
  }

  const valores = {
    tipo: body.tipo,
    numero: body.numero.trim(),
    dataAssinaturaEm: body.dataAssinaturaEm ? new Date(body.dataAssinaturaEm) : null,
    vigenciaInicioEm: body.vigenciaInicioEm ? new Date(body.vigenciaInicioEm) : null,
    vigenciaFimEm: body.vigenciaFimEm ? new Date(body.vigenciaFimEm) : null,
    valorContratado: body.valorContratado ?? null,
    objetoContratado: body.objetoContratado?.trim() || null,
    gestorFiscalNome: body.gestorFiscalNome?.trim() || null,
    arquivoAssinadoNome: body.arquivoAssinadoNome ?? null,
    arquivoAssinadoBase64: body.arquivoAssinadoBase64 ?? null,
    updatedAt: new Date(),
  }

  const [salvo] = await db
    .insert(contratoParticipacao)
    .values({ participacaoId: id, ...valores })
    .onConflictDoUpdate({ target: contratoParticipacao.participacaoId, set: valores })
    .returning()

  return NextResponse.json({ contrato: salvo })
}
