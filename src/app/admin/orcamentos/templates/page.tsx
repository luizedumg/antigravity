import { getBudgetTemplates } from "@/actions/budgetTemplates";
import { getBudgetVariables } from "@/actions/budgetVariables";
import TemplateForm from "./TemplateForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function BudgetTemplatesPage() {
  const templatesRes = await getBudgetTemplates();
  const templates = templatesRes.success ? templatesRes.data : [];

  const variablesRes = await getBudgetVariables();
  const globalVariables = variablesRes.success ? variablesRes.data : [];

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/admin/orcamentos" className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', minHeight: 'auto' }}>
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(45deg, var(--primary), #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.2rem' }}>Modelos de Orçamento</h1>
          <p style={{ opacity: 0.8 }}>Configure os tipos de cirurgias e suas variáveis de custo.</p>
        </div>
      </div>

      <TemplateForm templates={templates || []} globalVariables={globalVariables || []} />
    </main>
  );
}
