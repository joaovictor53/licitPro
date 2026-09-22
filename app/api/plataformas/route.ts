// app/api/plataformas/route.ts
// Ferramenta 11 — cadastro de plataformas (mantido pela Arumã), só leitura.

import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { exigirUsuarioApi } from '@/lib/sessao'
import { db } from '@/app/src'
import { plataformaCompra } from '@/app/src/db/schema'

export async function GET() {
  const { erro } = await exigirUsuarioApi()
  if (erro) return erro

  const plataformas = await db.select().from(plataformaCompra).orderBy(asc(plataformaCompra.nome))
  return NextResponse.json({ plataformas })
}
