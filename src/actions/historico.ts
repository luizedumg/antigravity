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
  const [total, pendentes, enviados, visualizados, parciais, assinados, driveOk, recusados, templates] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: 'PENDENTE' } }),
    prisma.contract.count({ where: { status: 'ENVIADO' } }),
    prisma.contract.count({ where: { status: 'VISUALIZADO' } }),
    prisma.contract.count({ where: { status: 'ASSINATURA_PARCIAL' } }),
    prisma.contract.count({ where: { status: 'ASSINADO' } }),
    prisma.contract.count({ where: { status: 'DRIVE_OK' } }),
    prisma.contract.count({ where: { status: 'RECUSADO' } }),
    prisma.surgeryTemplate.count()
  ]);

  return { total, pendentes, enviados, visualizados, parciais, assinados: assinados + driveOk, recusados, templates };
}

export async function getDistinctSurgeryTypes(): Promise<string[]> {
  const templates = await prisma.surgeryTemplate.findMany({
    select: { name: true }
  });
  return templates.map(t => t.name);
}
