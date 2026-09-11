// app/api/cnaes/route.ts
// Lista os CNAEs cadastrados na tabela `cnae_por_objeto` (mantida pela
// Arumã) — usado para popular o seletor de CNAE no cadastro da empresa, em
// vez do operador digitar um código que pode não existir ou estar mal
// formatado.

import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { cnaePorObjeto } from '@/app/src/db/schema'

export async function GET() {
  const { erro } = await exigirUsuarioApi()
  if (erro) return erro

  const linhas = await db
    .select({ cnae: cnaePorObjeto.cnae, descricao: cnaePorObjeto.descricao })
    .from(cnaePorObjeto)
    .orderBy(asc(cnaePorObjeto.cnae))

  return NextResponse.json(linhas)
}
