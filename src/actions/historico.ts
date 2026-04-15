'use server';

import { prisma } from '@/lib/prisma';

export async function getContracts(filters?: { status?: string; surgeryType?: string }) {
  const where: any = {};
  if (filters?.status && filters.status !== 'TODOS') {
    where.status = filters.status;
  }
  if (filters?.surgeryType && filters.surgeryType !== 'TODOS') {
    where.surgeryType = filters.surgeryType;
  }

  return await prisma.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDashboardMetrics() {
  const [total, pendentes, visualizados, assinados, templates] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: 'PENDENTE' } }),
    prisma.contract.count({ where: { status: 'VISUALIZADO' } }),
    prisma.contract.count({ where: { status: 'ASSINADO' } }),
    prisma.surgeryTemplate.count()
  ]);

  return { total, pendentes, visualizados, assinados, templates };
}

export async function getDistinctSurgeryTypes(): Promise<string[]> {
  const templates = await prisma.surgeryTemplate.findMany({
    select: { name: true }
  });
  return templates.map(t => t.name);
}
