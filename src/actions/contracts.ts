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
export async function deleteContractById(id: string, pin?: string) {
  if (pin !== "1986") {
    throw new Error("PIN incorreto. Ação não autorizada.");
  }
  await prisma.contract.delete({ where: { id } });
  revalidatePath('/admin/historico');
}

// Atualiza o status do contrato (usado pelo webhook, envio WhatsApp, etc.)
export async function updateContractStatus(contractId: string, newStatus: string) {
  await prisma.contract.update({
    where: { id: contractId },
    data: { status: newStatus }
  });
  revalidatePath('/admin/historico');
}

// Atualiza status pelo linkId (quando não temos o id interno)
export async function updateContractStatusByLink(linkId: string, newStatus: string) {
  await prisma.contract.update({
    where: { linkId },
    data: { status: newStatus }
  });
  revalidatePath('/admin/historico');
}

/**
 * Retorna as URLs de assinatura persistidas no banco.
 * Respeita expiração de 30 dias: se passaram mais de 30 dias, retorna null.
 */
export async function getSignUrls(contractId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return null;

  // Verificar expiração de 30 dias
  if (contract.signUrlsCreatedAt) {
    const createdAt = new Date(contract.signUrlsCreatedAt);
    const now = new Date();
    const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      return { expired: true, patientSignUrl: null, responsavelSignUrl: null, nomeResponsavel: null };
    }
  }

  return {
    expired: false,
    patientSignUrl: contract.patientSignUrl || null,
    responsavelSignUrl: contract.responsavelSignUrl || null,
    nomeResponsavel: contract.nomeResponsavel || null,
  };
}
