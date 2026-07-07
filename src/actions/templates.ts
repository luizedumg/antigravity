'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { checkPin } from '@/lib/adminPin';

export async function createTemplate(data: { name: string, questionsJson: string, baseFilename: string, pin: string }) {
  await requireAuth();
  if (!checkPin(data.pin)) {
    throw new Error('Senha incorreta. Operação não autorizada.');
  }

  const result = await prisma.surgeryTemplate.create({
    data: {
      name: data.name,
      questionsJson: data.questionsJson,
      baseFilename: data.baseFilename,
    }
  });

  revalidatePath('/admin/templates');
  return result;
}

export async function getTemplates() {
  await requireAuth();
  return await prisma.surgeryTemplate.findMany();
}

export async function deleteTemplate(id: string, pin: string) {
  await requireAuth();
  if (!checkPin(pin)) {
    throw new Error('Senha incorreta. Operação não autorizada.');
  }

  // Guarda: não apagar um modelo que ainda está em uso por contratos em
  // andamento (referência é por NOME, não FK) — isso travaria o link do
  // paciente (getTemplateByName retornaria null e o formulário não abriria).
  const template = await prisma.surgeryTemplate.findUnique({ where: { id } });
  if (template) {
    const emAndamento = await prisma.contract.count({
      where: {
        surgeryType: template.name,
        status: { in: ['PENDENTE', 'ENVIADO', 'VISUALIZADO', 'ASSINATURA_PARCIAL'] },
      },
    });
    if (emAndamento > 0) {
      throw new Error(
        `Não é possível excluir: existem ${emAndamento} contrato(s) em andamento usando este modelo. Conclua ou exclua esses contratos primeiro.`
      );
    }
  }

  await prisma.surgeryTemplate.delete({ where: { id } });
  revalidatePath('/admin/templates');
}
