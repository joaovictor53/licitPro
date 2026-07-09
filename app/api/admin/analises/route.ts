// app/api/admin/analises/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { eq, desc, count, countDistinct, gte, sql } from 'drizzle-orm'
import { exigirAdminApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { analise, user } from '@/app/src/db/schema'

export async function GET(request: NextRequest) {
  const resultado = await exigirAdminApi()
  if (resultado.erro) return resultado.erro

  const agora = new Date()
  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Estatísticas gerais (queries sobre colunas planas, nunca jsonb)
  const [[totalGeral], [totalUsuarios], [ultimos7], [ultimos30]] =
    await Promise.all([
      db.select({ total: count() }).from(analise),
      db
        .select({ total: countDistinct(analise.userId) })
        .from(analise),
      db
        .select({ total: count() })
        .from(analise)
        .where(gte(analise.createdAt, seteDiasAtras)),
      db
        .select({ total: count() })
        .from(analise)
        .where(gte(analise.createdAt, trintaDiasAtras)),
    ])

  // Análises por usuário
  const porUsuario = await db
    .select({
      userId: user.id,
      nome: user.name,
      email: user.email,
      totalAnalises: count(analise.id),
      ultimaAnalise: sql<string>`max(${analise.createdAt})`.as(
        'ultima_analise'
      ),
    })
    .from(analise)
    .innerJoin(user, eq(analise.userId, user.id))
    .groupBy(user.id, user.name, user.email)
    .orderBy(sql`count(${analise.id}) desc`)

  // Paginação
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  // Listagem completa (colunas planas + dados do usuário)
  const lista = await db
    .select({
      id: analise.id,
      nomeEdital: analise.nomeEdital,
      nomeProposta: analise.nomeProposta,
      resumo: analise.resumo,
      totalIrregularidades: analise.totalIrregularidades,
      totalMaterial: analise.totalMaterial,
      totalSanavel: analise.totalSanavel,
      createdAt: analise.createdAt,
      userName: user.name,
      userEmail: user.email,
    })
    .from(analise)
    .innerJoin(user, eq(analise.userId, user.id))
    .orderBy(desc(analise.createdAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    stats: {
      totalGeral: totalGeral.total,
      totalUsuarios: totalUsuarios.total,
      ultimos7dias: ultimos7.total,
      ultimos30dias: ultimos30.total,
    },
    porUsuario,
    lista,
    paginacao: {
      page,
      limit,
      total: totalGeral.total,
      totalPages: Math.ceil(totalGeral.total / limit),
    },
  })
}
