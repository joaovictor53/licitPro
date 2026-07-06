import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_ROUTES = ['/login', '/signup'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = getSessionCookie(request);
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!sessionCookie && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (sessionCookie && isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
