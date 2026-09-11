// app/api/cnaes-ibge/route.ts
// Catálogo oficial completo de CNAE (IBGE), gerado por
// scripts/atualizar-cnae-ibge.mjs em data/cnae-ibge.json — diferente da
// tabela `cnae_por_objeto`, que é só o subconjunto que o Radar de Editais
// sabe buscar. Usado para o cadastro da empresa oferecer qualquer CNAE
// existente, não só os já configurados pela Arumã.

import { NextResponse } from 'next/server'
import { exigirUsuarioApi } from '@/lib/sessao'
import catalogo from '@/data/cnae-ibge.json'

export async function GET() {
  const { erro } = await exigirUsuarioApi()
  if (erro) return erro

  return NextResponse.json(catalogo)
}
