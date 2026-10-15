// app/api/participacoes/route.ts
// Lista as participações da empresa do usuário (mais recentes primeiro), para o painel e para a
// página de participações. Só os campos de resumo; o detalhe continua em /api/participacoes/[id].

import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { participacao } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'

export async function GET() {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  const participacoes = await db
    .select({
      id: participacao.id,
      orgao: participacao.orgao,
      objeto: participacao.objeto,
      estado: participacao.estado,
      municipio: participacao.municipio,
      uf: participacao.uf,
      modalidade: participacao.modalidade,
      valorEstimado: participacao.valorEstimado,
      dataSessaoEm: participacao.dataSessaoEm,
      updatedAt: participacao.updatedAt,
    })
    .from(participacao)
    .where(eq(participacao.empresaId, empresaAtual.id))
    .orderBy(desc(participacao.updatedAt))

  return NextResponse.json({ participacoes })
}
