// app/api/plano/route.ts

import { NextResponse } from 'next/server';
import { exigirUsuarioApi } from '@/lib/sessao';
import { obterStatusPlano } from '@/lib/planos-server';

export async function GET() {
    const { session, erro } = await exigirUsuarioApi();
    if (erro) return erro;

    const status = await obterStatusPlano(
        session.user.id,
        session.user.plano,
        session.user.trialExpiresAt,
        session.user.role
    );

    return NextResponse.json(status);
}
