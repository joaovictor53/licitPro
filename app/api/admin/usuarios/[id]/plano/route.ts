// app/api/admin/usuarios/[id]/plano/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { exigirAdminApi } from '@/lib/sessao';
import { db } from '@/app/src';
import { user } from '@/app/src/db/schema';
import { ehPlanoValido, PLANOS } from '@/lib/planos';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { erro } = await exigirAdminApi();
    if (erro) return erro;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const plano = body?.plano;

    if (!ehPlanoValido(plano)) {
        return NextResponse.json(
            { erro: `Plano inválido. Use: ${Object.keys(PLANOS).join(', ')}.` },
            { status: 400 }
        );
    }

    const [atualizado] = await db
        .update(user)
        .set({ plano, updatedAt: new Date() })
        .where(eq(user.id, id))
        .returning({ id: user.id, plano: user.plano });

    if (!atualizado) {
        return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(atualizado);
}
