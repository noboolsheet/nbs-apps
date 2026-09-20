import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Protección de rutas de PÁGINA (chequeo optimista de cookie de sesión, edge-safe: sin DB).
 * La verificación completa ocurre en server components / route handlers. Las rutas /api NO
 * pasan por aquí: se protegen a sí mismas vía `withContext` (401 JSON), no redirigen a /login.
 */
export function middleware(req: NextRequest): NextResponse {
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Excluye login, API, estáticos de Next y los assets públicos (favicon/logo) para que carguen sin sesión.
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|control-tower-icono.png).*)'],
};
