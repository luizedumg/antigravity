import { NextResponse } from 'next/server';
import { AUTH_COOKIE, signSession } from '@/lib/auth';
import { rateLimit, rateLimitReset, clientIp } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    // Rate-limit por IP: até 8 tentativas a cada 5 minutos.
    const ip = clientIp(req);
    const rlKey = `login:${ip}`;
    const rl = rateLimit(rlKey, 8, 5 * 60 * 1000);
    if (rl.blocked) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'rino2645';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Login OK: zera o contador e emite um cookie de sessão ASSINADO
    // (o valor deixa de ser a string fixa 'authenticated', que era forjável).
    rateLimitReset(rlKey);
    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE, await signSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/'
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
