"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBudgets() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: budgets };
  } catch (error: any) {
    console.error("Error fetching budgets:", error);
    return { success: false, error: "Falha ao buscar orçamentos." };
  }
}

export async function getBudgetById(id: string) {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id },
    });
    if (!budget) throw new Error("Orçamento não encontrado.");
    return { success: true, data: budget };
  } catch (error: any) {
    console.error("Error fetching budget:", error);
    return { success: false, error: "Falha ao buscar o orçamento." };
  }
}

export async function getBudgetByMagicLink(magicLinkId: string) {
  try {
    const budget = await prisma.budget.findUnique({
      where: { magicLinkId },
    });
    if (!budget) throw new Error("Orçamento não encontrado.");
    return { success: true, data: budget };
  } catch (error: any) {
    console.error("Error fetching budget by magic link:", error);
    return { success: false, error: "Falha ao acessar o orçamento." };
  }
}

export async function createBudget(data: {
  patientName: string;
  patientCpf?: string;
  patientWhatsApp?: string;
  patientEmail?: string;
  surgeryType: string;
  basePrice: number;
  discount?: number;
  totalPrice: number;
  variablesSelectedJson: string;
}) {
  try {
    const budget = await prisma.budget.create({
      data: {
        patientName: data.patientName,
        patientCpf: data.patientCpf || null,
        patientWhatsApp: data.patientWhatsApp || null,
        patientEmail: data.patientEmail || null,
        surgeryType: data.surgeryType,
        basePrice: data.basePrice,
        discount: data.discount || 0,
        totalPrice: data.totalPrice,
        variablesSelectedJson: data.variablesSelectedJson,
        status: "GERADO",
      },
    });

    revalidatePath("/admin/orcamentos");
    return { success: true, data: budget };
  } catch (error: any) {
    console.error("Error creating budget:", error);
    return { success: false, error: "Falha ao criar o orçamento." };
  }
}

export async function updateBudgetStatus(id: string, status: string, shouldRevalidate = true) {
  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: { status },
    });
    
    if (shouldRevalidate) {
      revalidatePath("/admin/orcamentos");
      revalidatePath(`/orcamento/${budget.magicLinkId}`);
    }
    
    return { success: true, data: budget };
  } catch (error: any) {
    console.error("Error updating budget status:", error);
    return { success: false, error: "Falha ao atualizar status." };
  }
}

export async function deleteBudget(id: string, pin: string) {
  try {
    if (pin !== "1986") {
      return { success: false, error: "PIN incorreto. Ação não autorizada." };
    }

    await prisma.budget.delete({
      where: { id },
    });
    revalidatePath("/admin/orcamentos");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting budget:", error);
    return { success: false, error: "Falha ao excluir o orçamento." };
  }
}

export async function sendBudgetToN8N(budgetId: string, n8nWebhookUrl: string) {
  try {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget || (!budget.patientWhatsApp && !budget.patientEmail)) {
      return { success: false, error: "Orçamento sem WhatsApp ou E-mail associado." };
    }

    const payload = {
      patientName: budget.patientName,
      whatsapp: budget.patientWhatsApp || "",
      email: budget.patientEmail || "",
      surgeryType: budget.surgeryType,
      totalPrice: budget.totalPrice,
      discount: budget.discount || 0,
      magicLinkUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/orcamento/${budget.magicLinkId}`
    };

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook responded with status: ${response.status}`);
    }

    await prisma.budget.update({
      where: { id: budgetId },
      data: { status: "ENVIADO" }
    });

    revalidatePath("/admin/orcamentos");
    return { success: true };
  } catch (error: any) {
    console.error("Error sending budget to n8n:", error);
    return { success: false, error: "Falha ao enviar para o n8n." };
  }
}
