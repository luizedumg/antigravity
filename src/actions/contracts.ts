'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { checkPin } from '@/lib/adminPin';

// Busca os dados do template com base no tipo de cirurgia
// (público — usado na página do paciente).
export async function getTemplateByName(name: string) {
  return await prisma.surgeryTemplate.findUnique({
    where: { name }
  });
}

// Quando o admin (cirurgião) criar um link
export async function createContractDraft(data: { patientName: string, patientWhatsApp: string, surgeryType: string }) {
  await requireAuth();
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
  try {
    await requireAuth();
    if (!checkPin(pin)) {
      return { success: false, error: "PIN incorreto. Ação não autorizada." };
    }
    await prisma.contract.delete({ where: { id } });
    revalidatePath('/admin/historico');
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao deletar contrato:", error);
    return { success: false, error: error.message || "Erro interno ao excluir contrato." };
  }
}

// Atualiza o status do contrato (chamado do painel admin)
export async function updateContractStatus(contractId: string, newStatus: string) {
  await requireAuth();
  await prisma.contract.update({
    where: { id: contractId },
    data: { status: newStatus }
  });
  revalidatePath('/admin/historico');
}

// Atualiza status pelo linkId (quando não temos o id interno)
export async function updateContractStatusByLink(linkId: string, newStatus: string) {
  await requireAuth();
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
  await requireAuth();
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

export async function getContractCriticalInfo(contractId: string) {
  await requireAuth();
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract || !contract.formData) return [];

  const template = await prisma.surgeryTemplate.findUnique({
    where: { name: contract.surgeryType }
  });

  if (!template || !template.questionsJson) return [];

  const CRITICAL_PATTERNS: Record<string, string[]> = {
    'Uso de Imagem': ['imagem', 'foto', 'image', 'fotografia', 'video', 'filmagem'],
    'Alergias': ['alergia', 'alergico', 'alérgico', 'alergias'],
    'Uso de Drogas/Substâncias': ['droga', 'tabagismo', 'alcool', 'álcool', 'fumo', 'fumante', 'substancia', 'substância', 'cocaina', 'maconha', 'cigarro', 'etilismo', 'tabaco'],
    'Doenças Pré-existentes': ['doenca', 'doença', 'comorbidade', 'patologia', 'diabetes', 'hipertensao', 'hipertensão', 'cardiaco', 'cardíaco', 'renal', 'hepatica', 'hepática', 'hiv', 'hepatite', 'asma', 'epilepsia']
  };

  let answers: Record<string, string> = {};
  try {
    answers = JSON.parse(contract.formData);
  } catch (e) {
    return [];
  }

  let questions: Array<{ key: string; label: string; type: string }> = [];
  try {
    questions = JSON.parse(template.questionsJson);
  } catch (e) {
    return [];
  }

  const labelMap: Record<string, string> = {};
  for (const q of questions) {
    labelMap[q.key] = q.label;
  }

  const findings: Array<{ category: string; label: string; value: string; isHighlighted: boolean }> = [];

  for (const [category, patterns] of Object.entries(CRITICAL_PATTERNS)) {
    for (const [key, value] of Object.entries(answers)) {
      if (!value || !value.trim()) continue;

      const keyLower = key.toLowerCase();
      const labelLower = (labelMap[key] || key).toLowerCase();
      const combined = keyLower + ' ' + labelLower;

      const matched = patterns.some(p => combined.includes(p));
      if (matched) {
        const displayLabel = labelMap[key] || key.replace(/_/g, ' ');
        const displayValue = value.toLowerCase() === 'sim' ? 'Sim' 
          : value.toLowerCase() === 'não' || value.toLowerCase() === 'nao' ? 'Não' 
          : value;
        
        let isHighlighted = false;
        
        // Regras de destaque
        if (category === 'Uso de Imagem') {
          // Uso de imagem sempre merece destaque visual, mas verde/vermelho dependo da UI. Aqui marcamos como true para UI cuidar.
          isHighlighted = true;
        } else if (displayValue === 'Sim') {
          // Alergias, Doenças ou Drogas com 'Sim' é um red flag.
          isHighlighted = true;
        } else if (displayValue !== 'Sim' && displayValue !== 'Não') {
            // Se for um texto livre preenchido na categoria de alergias, destacamos
            isHighlighted = true;
        }

        findings.push({ category, label: displayLabel, value: displayValue, isHighlighted });
        break; // Evitar múltiplas perguntas pegando a mesma categoria (já que é um sumário rápido)
      }
    }
  }

  return findings;
}
