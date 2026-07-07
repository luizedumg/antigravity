import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifySession } from '@/lib/auth';

// Next 16: a convenção `middleware` foi renomeada para `proxy`.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas PÚBLICAS — não proteger
  if (
    pathname.startsWith('/paciente') ||
    pathname.startsWith('/orcamento') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/ai') ||
    pathname.startsWith('/api/integration') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  // Verificar cookie de sessão ASSINADO (não mais uma string fixa forjável)
  const authCookie = request.cookies.get(AUTH_COOKIE);

  if (!(await verifySession(authCookie?.value))) {
    // Redirecionar para login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
