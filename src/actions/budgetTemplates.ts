"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getBudgetTemplates() {
  try {
    const templates = await prisma.budgetTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: templates };
  } catch (error: any) {
    console.error("Error fetching budget templates:", error);
    return { success: false, error: "Falha ao buscar modelos de orçamento." };
  }
}

export async function getBudgetTemplateById(id: string) {
  try {
    const template = await prisma.budgetTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new Error("Template não encontrado.");
    return { success: true, data: template };
  } catch (error: any) {
    console.error("Error fetching budget template:", error);
    return { success: false, error: "Falha ao buscar o modelo de orçamento." };
  }
}

export async function createBudgetTemplate(data: {
  name: string;
  basePrice: number;
  variablesJson: string;
}) {
  try {
    const template = await prisma.budgetTemplate.create({
      data: {
        name: data.name,
        basePrice: data.basePrice,
        variablesJson: data.variablesJson,
      },
    });
    revalidatePath("/admin/orcamentos/templates");
    return { success: true, data: template };
  } catch (error: any) {
    console.error("Error creating budget template:", error);
    if (error.code === "P2002") {
      return { success: false, error: "Já existe um modelo com este nome." };
    }
    return { success: false, error: "Falha ao criar o modelo de orçamento." };
  }
}

export async function updateBudgetTemplate(
  id: string,
  data: { name: string; basePrice: number; variablesJson: string }
) {
  try {
    const template = await prisma.budgetTemplate.update({
      where: { id },
      data: {
        name: data.name,
        basePrice: data.basePrice,
        variablesJson: data.variablesJson,
      },
    });
    revalidatePath("/admin/orcamentos/templates");
    return { success: true, data: template };
  } catch (error: any) {
    console.error("Error updating budget template:", error);
    return { success: false, error: "Falha ao atualizar o modelo de orçamento." };
  }
}

export async function deleteBudgetTemplate(id: string) {
  try {
    await prisma.budgetTemplate.delete({
      where: { id },
    });
    revalidatePath("/admin/orcamentos/templates");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting budget template:", error);
    return { success: false, error: "Falha ao excluir o modelo de orçamento." };
  }
}
