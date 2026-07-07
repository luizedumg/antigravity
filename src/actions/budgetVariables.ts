"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export async function getBudgetVariables() {
  try {
    await requireAuth();
    const variables = await prisma.budgetVariable.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    return { success: true, data: variables };
  } catch (error: any) {
    console.error("Error fetching variables:", error);
    return { success: false, error: "Falha ao carregar variáveis." };
  }
}

export async function createBudgetVariable(data: { category: string; name: string; price: number; isDefault?: boolean }) {
  try {
    await requireAuth();
    const variable = await prisma.budgetVariable.create({
      data: {
        category: data.category,
        name: data.name,
        price: data.price,
        isDefault: data.isDefault || false,
      },
    });
    revalidatePath("/admin/orcamentos/templates");
    revalidatePath("/admin/orcamentos/novo");
    return { success: true, data: variable };
  } catch (error: any) {
    console.error("Error creating variable:", error);
    return { success: false, error: "Falha ao criar variável." };
  }
}

export async function deleteBudgetVariable(id: string) {
  try {
    await requireAuth();
    await prisma.budgetVariable.delete({
      where: { id },
    });
    revalidatePath("/admin/orcamentos/templates");
    revalidatePath("/admin/orcamentos/novo");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting variable:", error);
    return { success: false, error: "Falha ao excluir variável." };
  }
}
