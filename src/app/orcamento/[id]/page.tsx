import { getBudgetByMagicLink, updateBudgetStatus } from "@/actions/budgets";
import { notFound } from "next/navigation";
import BudgetClientView from "./BudgetClientView";

export const dynamic = 'force-dynamic';

export default async function MagicLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const res = await getBudgetByMagicLink(id);
  
  if (!res.success || !res.data) {
    return notFound();
  }

  const budget = res.data;

  if (budget.status === "GERADO" || budget.status === "ENVIADO") {
    await updateBudgetStatus(budget.id, "VISUALIZADO", false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '1000px' }}>
        <BudgetClientView budget={budget} />
      </div>
    </div>
  );
}
