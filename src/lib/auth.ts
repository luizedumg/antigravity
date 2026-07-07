// ══════════════════════════════════════════════════════════════
// Sessão de admin — cookie assinado por HMAC (config-free).
//
// Substitui a comparação de string fixa `admin_auth === 'authenticated'`,
// que era forjável por qualquer um. O valor do cookie passa a ser um token
// assinado; sem o segredo, ninguém consegue produzir um cookie válido.
//
// Usa Web Crypto (crypto.subtle) para funcionar tanto no Edge Runtime
// (middleware) quanto no Node (server actions / route handlers).
//
// O segredo tem um padrão embutido para não exigir configuração; pode ser
// sobrescrito com a env AUTH_SECRET.
// ══════════════════════════════════════════════════════════════

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  'lem-app-admin-session-a91f7c2e5b8d4306-do-not-share-this-default';

export const AUTH_COOKIE = 'admin_auth';
const PAYLOAD_PREFIX = 'adm1';

async function hmacHex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Comparação em tempo constante (evita timing attacks sobre a assinatura).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Gera o valor do cookie de sessão assinado. */
export async function signSession(): Promise<string> {
  const payload = `${PAYLOAD_PREFIX}.${Date.now()}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

/** Valida um valor de cookie de sessão. */
export async function verifySession(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const lastDot = value.lastIndexOf('.');
  if (lastDot <= 0) return false;
  const payload = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  if (!payload.startsWith(`${PAYLOAD_PREFIX}.`)) return false;
  const expected = await hmacHex(payload);
  return timingSafeEqual(sig, expected);
}

/**
 * Garante que a requisição atual vem de um admin autenticado.
 * Lança se o cookie estiver ausente/ inválido — use no início de server
 * actions sensíveis. Importa `next/headers` sob demanda para não quebrar
 * o bundle do middleware (Edge).
 */
export async function requireAuth(): Promise<void> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!(await verifySession(token))) {
    throw new Error('Não autorizado. Faça login novamente.');
  }
}
