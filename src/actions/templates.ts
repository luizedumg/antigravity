'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createTemplate(data: { name: string, questionsJson: string, baseFilename: string }) {
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

export async function deleteTemplate(id: string) {
  await prisma.surgeryTemplate.delete({ where: { id } });
  revalidatePath('/admin/templates');
}
