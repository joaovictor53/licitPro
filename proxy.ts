import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Rotas acessíveis sem sessão. As de recuperação de senha precisam estar aqui
// porque, por definição, o usuário chega nelas deslogado.
const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/signup',
    '/esqueci-senha',
    '/redefinir-senha',
    '/termos',
];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!sessionCookie && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
