// PIN de confirmação para ações destrutivas do admin. Centralizado aqui para
// não repetir o literal em vários arquivos. A proteção real é o requireAuth()
// (sessão assinada); este PIN é apenas uma confirmação extra "tem certeza?".
// Mantém o valor atual (config-free); pode ser sobrescrito via env ADMIN_PIN.
export const ADMIN_PIN = process.env.ADMIN_PIN || '1986';

export function checkPin(pin: string | undefined | null): boolean {
  return (pin ?? '').trim() === ADMIN_PIN;
}
