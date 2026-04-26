import { getBudgetTemplates } from "@/actions/budgetTemplates";
import { getBudgetVariables } from "@/actions/budgetVariables";
import { prisma } from "@/lib/prisma";
import BudgetGenerator from "./BudgetGenerator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function NovoOrcamentoPage({ searchParams }: { searchParams: Promise<{ cloneId?: string }> }) {
  const templatesRes = await getBudgetTemplates();
  const templates: any[] = (templatesRes.success && templatesRes.data) ? templatesRes.data : [];

  const variablesRes = await getBudgetVariables();
  const globalVariables: any[] = (variablesRes.success && variablesRes.data) ? variablesRes.data : [];

  const params = await searchParams;
  let cloneBudget = null;
  if (params.cloneId) {
    cloneBudget = await prisma.budget.findUnique({ where: { id: params.cloneId } });
  }

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/admin/orcamentos" className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', minHeight: 'auto' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(45deg, var(--primary), #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>Gerar Orçamento</h1>
          <p style={{ opacity: 0.8 }}>Configure os detalhes para gerar a proposta do paciente.</p>
        </div>
      </div>

      <BudgetGenerator templates={templates} globalVariables={globalVariables} cloneBudget={cloneBudget} />
    </main>
  );
}
