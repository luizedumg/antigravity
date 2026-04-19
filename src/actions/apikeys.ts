'use server';

import { prisma } from '@/lib/prisma';

/**
 * Salva ou atualiza uma chave API para um provedor.
 */
export async function saveApiKey(provider: string, key: string): Promise<{ success: boolean }> {
  await prisma.apiKey.upsert({
    where: { provider },
    create: { provider, key },
    update: { key }
  });
  return { success: true };
}

/**
 * Retorna se uma chave existe para cada provedor (mascarada).
 * Nunca retorna a chave real.
 */
export async function getApiKeyStatus(): Promise<Record<string, { exists: boolean; masked: string }>> {
  const keys = await prisma.apiKey.findMany();
  const result: Record<string, { exists: boolean; masked: string }> = {
    gemini: { exists: false, masked: '' },
    openai: { exists: false, masked: '' },
    claude: { exists: false, masked: '' }
  };

  for (const k of keys) {
    const firstChars = k.key.substring(0, 4);
    const masked = `${firstChars}${'•'.repeat(20)}`;
    result[k.provider] = { exists: true, masked };
  }

  return result;
}

/**
 * Deleta a chave de um provedor.
 */
export async function deleteApiKey(provider: string): Promise<{ success: boolean }> {
  await prisma.apiKey.deleteMany({ where: { provider } });
  return { success: true };
}

/**
 * Busca a chave real de um provedor (uso interno no servidor apenas).
 */
export async function getApiKeyForProvider(provider: string): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider } });
  return record?.key || null;
}
