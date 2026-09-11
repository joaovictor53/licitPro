// app/api/empresa/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { exigirUsuarioApi } from '@/lib/sessao';
import { db } from '@/app/src';
import { empresa } from '@/app/src/db/schema';
import { obterOuCriarEmpresa } from '@/lib/empresa-server';

export async function GET() {
    const { session, erro } = await exigirUsuarioApi();
    if (erro) return erro;

    const dados = await obterOuCriarEmpresa(session.user.id);

    return NextResponse.json({
        razaoSocial: dados?.razaoSocial ?? '',
        cnpj: dados?.cnpj ?? '',
        endereco: dados?.endereco ?? '',
        cnaePrincipal: dados?.cnaePrincipal ?? '',
        cnaesSecundarios: dados?.cnaesSecundarios ?? [],
    });
}

export async function PATCH(request: NextRequest) {
    const { session, erro } = await exigirUsuarioApi();
    if (erro) return erro;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 });
    }

    const { razaoSocial, cnpj, endereco, cnaePrincipal, cnaesSecundarios } = body as Record<string, unknown>;

    // Garante que a linha exista (com backfill, se for a primeira vez) antes do update.
    await obterOuCriarEmpresa(session.user.id);

    await db
        .update(empresa)
        .set({
            ...(typeof razaoSocial === 'string' ? { razaoSocial: razaoSocial.trim() } : {}),
            ...(typeof cnpj === 'string' ? { cnpj: cnpj.trim() } : {}),
            ...(typeof endereco === 'string' ? { endereco: endereco.trim() } : {}),
            ...(typeof cnaePrincipal === 'string'
                ? { cnaePrincipal: cnaePrincipal.trim() || null }
                : cnaePrincipal === null
                    ? { cnaePrincipal: null }
                    : {}),
            ...(Array.isArray(cnaesSecundarios)
                ? { cnaesSecundarios: cnaesSecundarios.filter((c): c is string => typeof c === 'string') }
                : {}),
            updatedAt: new Date(),
        })
        .where(eq(empresa.donoUserId, session.user.id));

    return NextResponse.json({ ok: true });
}
