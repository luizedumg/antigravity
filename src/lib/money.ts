// Utilitários de dinheiro. Os valores são armazenados como Float (reais);
// arredondamos de forma consistente para 2 casas para evitar acúmulo de erro
// de ponto flutuante ao somar variáveis/desconto.

/** Arredonda um valor monetário para 2 casas decimais. */
export function roundMoney(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formata um valor em reais no padrão BRL: R$ 1.500,50. */
export function formatBRL(value: number): string {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
