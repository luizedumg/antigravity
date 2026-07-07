// Comparação de strings em tempo constante (evita timing attacks ao validar
// tokens/segredos de API). Funciona no Edge e no Node.
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Valida um header `Authorization: Bearer <token>` contra o token esperado. */
export function bearerMatches(authHeader: string | null, expected: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  return safeEqual(authHeader.slice(7), expected);
}
