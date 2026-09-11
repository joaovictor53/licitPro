// app/api/radar/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { radarConfig } from '@/app/src/db/schema'
import { obterOuCriarEmpresa } from '@/lib/empresa-server'
import { executarRadar, listarParticipacoesDoRadar } from '@/lib/radar-server'
import type { RadarConfig } from '@/types/radar-tipos'

const CONFIG_PADRAO: RadarConfig = {
  modoBusca: 'cnae',
  esfera: null,
  estados: [],
  orgaosIncluir: [],
  orgaosExcluir: [],
  textoLivre: null,
  faixaValorMin: null,
  faixaValorMax: null,
  ativo: false,
}

export async function GET() {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  const [config] = await db
    .select()
    .from(radarConfig)
    .where(eq(radarConfig.empresaId, empresaAtual!.id))
    .limit(1)

  const participacoes = await listarParticipacoesDoRadar(empresaAtual!.id)

  return NextResponse.json({
    config: config
      ? {
          modoBusca: config.modoBusca,
          esfera: config.esfera,
          estados: config.estados,
          orgaosIncluir: config.orgaosIncluir,
          orgaosExcluir: config.orgaosExcluir,
          textoLivre: config.textoLivre,
          faixaValorMin: config.faixaValorMin != null ? Number(config.faixaValorMin) : null,
          faixaValorMax: config.faixaValorMax != null ? Number(config.faixaValorMax) : null,
          ativo: config.ativo,
        }
      : CONFIG_PADRAO,
    participacoes,
  })
}

export async function POST(request: NextRequest) {
  const { session, erro } = await exigirUsuarioApi()
  if (erro) return erro

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 })
  }

  const config: RadarConfig = {
    modoBusca: body.modoBusca === 'livre' ? 'livre' : 'cnae',
    esfera: ['federal', 'estadual', 'municipal', 'privado'].includes(body.esfera) ? body.esfera : null,
    estados: Array.isArray(body.estados) ? body.estados.filter((e: unknown) => typeof e === 'string') : [],
    orgaosIncluir: Array.isArray(body.orgaosIncluir) ? body.orgaosIncluir.filter((o: unknown) => typeof o === 'string') : [],
    orgaosExcluir: Array.isArray(body.orgaosExcluir) ? body.orgaosExcluir.filter((o: unknown) => typeof o === 'string') : [],
    textoLivre: typeof body.textoLivre === 'string' ? body.textoLivre : null,
    faixaValorMin: typeof body.faixaValorMin === 'number' ? body.faixaValorMin : null,
    faixaValorMax: typeof body.faixaValorMax === 'number' ? body.faixaValorMax : null,
    ativo: true,
  }

  const empresaAtual = await obterOuCriarEmpresa(session.user.id)
  if (!empresaAtual) {
    return NextResponse.json({ erro: 'Não foi possível localizar o cadastro da empresa.' }, { status: 500 })
  }

  await db
    .insert(radarConfig)
    .values({
      empresaId: empresaAtual.id,
      modoBusca: config.modoBusca,
      esfera: config.esfera ?? undefined,
      estados: config.estados,
      orgaosIncluir: config.orgaosIncluir,
      orgaosExcluir: config.orgaosExcluir,
      textoLivre: config.textoLivre,
      faixaValorMin: config.faixaValorMin != null ? String(config.faixaValorMin) : null,
      faixaValorMax: config.faixaValorMax != null ? String(config.faixaValorMax) : null,
      ativo: true,
    })
    .onConflictDoUpdate({
      target: radarConfig.empresaId,
      set: {
        modoBusca: config.modoBusca,
        esfera: config.esfera ?? null,
        estados: config.estados,
        orgaosIncluir: config.orgaosIncluir,
        orgaosExcluir: config.orgaosExcluir,
        textoLivre: config.textoLivre,
        faixaValorMin: config.faixaValorMin != null ? String(config.faixaValorMin) : null,
        faixaValorMax: config.faixaValorMax != null ? String(config.faixaValorMax) : null,
        ativo: true,
        updatedAt: new Date(),
      },
    })

  try {
    const resultado = await executarRadar(empresaAtual.id, session.user.id, config)
    const participacoes = await listarParticipacoesDoRadar(empresaAtual.id)
    return NextResponse.json({ ...resultado, participacoes })
  } catch (erroExecucao) {
    const mensagem = erroExecucao instanceof Error ? erroExecucao.message : 'Erro ao consultar o PNCP.'
    return NextResponse.json({ erro: mensagem }, { status: 422 })
  }
}
