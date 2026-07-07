// ══════════════════════════════════════════════════════════════
// Rate-limiting simples em memória (sem dependência externa).
//
// Usado para conter força-bruta no login e abuso das rotas que gastam
// créditos do Gemini. Estado por processo — suficiente para um deploy
// de instância única; reinicia junto com o servidor.
// ══════════════════════════════════════════════════════════════

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Registra uma tentativa para `key` e diz se ela deve ser bloqueada.
 * @param key       identificador (ex.: `login:<ip>`)
 * @param limit     máximo de tentativas dentro da janela
 * @param windowMs  duração da janela em ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { blocked: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { blocked: false, retryAfterMs: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { blocked: true, retryAfterMs: bucket.resetAt - now };
  }
  return { blocked: false, retryAfterMs: 0 };
}

/** Limpa o contador de uma chave (ex.: após login bem-sucedido). */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}

/** Extrai um IP aproximado dos headers da requisição. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
