'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Busca os dados do template com base no tipo de cirurgia
export async function getTemplateByName(name: string) {
  return await prisma.surgeryTemplate.findUnique({
    where: { name }
  });
}

// Quando o admin (cirurgião) criar um link
export async function createContractDraft(data: { patientName: string, patientWhatsApp: string, surgeryType: string }) {
  const linkId = crypto.randomUUID();
  const contract = await prisma.contract.create({
    data: {
      patientName: data.patientName,
      patientCpf: "",  // Campo legado mantido para compatibilidade com contratos antigos
      patientWhatsApp: data.patientWhatsApp,
      surgeryType: data.surgeryType,
      patientAddress: "", // Preenchido depois pelo paciente
      linkId,
      status: 'PENDENTE'
    }
  });
  
  revalidatePath('/admin/historico');
  return contract;
}

// Quando o paciente preencher o formulário final
export async function updateContractData(linkId: string, address: string, dynamicFormData: any) {
  const contract = await prisma.contract.update({
    where: { linkId },
    data: {
      patientAddress: address,
      formData: JSON.stringify(dynamicFormData),
      status: 'VISUALIZADO'
    }
  });

  // AQUI: No próximo passo vamos injetar a chamada para a API que usa o docxtemplater e envia pro ZapSign!
  
  return contract;
}

// Puxa um contrato via URL única
export async function getContractByLink(linkId: string) {
  return await prisma.contract.findUnique({
    where: { linkId }
  });
}
export async function deleteContractById(id: string) {
  await prisma.contract.delete({ where: { id } });
  revalidatePath('/admin/historico');
}
