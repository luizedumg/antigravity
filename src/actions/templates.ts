'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const ADMIN_PIN = '1986';

export async function createTemplate(data: { name: string, questionsJson: string, baseFilename: string, pin: string }) {
  if (data.pin !== ADMIN_PIN) {
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
  return await prisma.surgeryTemplate.findMany();
}

export async function deleteTemplate(id: string, pin: string) {
  if (pin !== ADMIN_PIN) {
    throw new Error('Senha incorreta. Operação não autorizada.');
  }

  await prisma.surgeryTemplate.delete({ where: { id } });
  revalidatePath('/admin/templates');
}
