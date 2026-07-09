import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Obtém a sessão do usuário autenticado.
 * Para uso em Server Components — redireciona para /login se não autenticado.
 */
export async function exigirUsuario() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        redirect('/login');
    }

    return session;
}

/**
 * Obtém a sessão de um usuário admin.
 * Para uso em Server Components — redireciona para / se não for admin.
 */
export async function exigirAdmin() {
    const session = await exigirUsuario();

    if (session.user.role !== 'admin') {
        redirect('/');
    }

    return session;
}

/**
 * Obtém a sessão do usuário autenticado.
 * Para uso em Route Handlers — retorna NextResponse 401 se não autenticado.
 */
export async function exigirUsuarioApi() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return {
            session: null,
            erro: NextResponse.json(
                { erro: 'Não autenticado.' },
                { status: 401 }
            ),
        } as const;
    }

    return { session, erro: null } as const;
}

/**
 * Obtém a sessão de um usuário admin.
 * Para uso em Route Handlers — retorna NextResponse 403 se não for admin.
 */
export async function exigirAdminApi() {
    const resultado = await exigirUsuarioApi();

    if (resultado.erro) {
        return resultado;
    }

    if (resultado.session.user.role !== 'admin') {
        return {
            session: null,
            erro: NextResponse.json(
                { erro: 'Acesso restrito a administradores.' },
                { status: 403 }
            ),
        } as const;
    }

    return resultado;
}
