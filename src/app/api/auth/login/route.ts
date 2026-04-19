import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'rino2645';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Criar cookie seguro com validade de 30 dias
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_auth', 'authenticated', {
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
