'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function getContracts(filters?: { status?: string; surgeryType?: string }) {
  await requireAuth();
  const where: any = {};
  if (filters?.status && filters.status !== 'TODOS') {
    // "CONCLUIDOS" = documentos totalmente assinados (ASSINADO ou já arquivados
    // no Drive) — bate com a métrica "Assinados" do dashboard.
    if (filters.status === 'CONCLUIDOS') {
      where.status = { in: ['ASSINADO', 'DRIVE_OK'] };
    } else {
      where.status = filters.status;
    }
  }
  if (filters?.surgeryType && filters.surgeryType !== 'TODOS') {
    where.surgeryType = filters.surgeryType;
  }

  // Seleciona só os campos usados na listagem (evita trafegar formData, endereço
  // e URLs de assinatura) e limita o volume — a página não é paginada.
  return await prisma.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      patientName: true,
      patientCpf: true,
      patientWhatsApp: true,
      surgeryType: true,
      status: true,
      linkId: true,
      zapsignToken: true,
      googleDriveFileId: true,
      createdAt: true,
    },
  });
}

export async function getDashboardMetrics() {
  await requireAuth();
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
  await requireAuth();
  const templates = await prisma.surgeryTemplate.findMany({
    select: { name: true }
  });
  return templates.map(t => t.name);
}
