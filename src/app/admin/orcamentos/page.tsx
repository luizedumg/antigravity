import { getBudgets } from "@/actions/budgets";
import BudgetList from "./BudgetList";
import GlobalValueCard from "./GlobalValueCard";
import WebhookTestCard from "./WebhookTestCard";
import Link from "next/link";
import { Plus, Settings2, Home } from "lucide-react";

export default async function OrcamentosDashboard() {
  const res = await getBudgets();
  const budgets = res.success ? res.data : [];

  const totalValue = budgets?.reduce((acc, b) => acc + b.totalPrice, 0) || 0;
  const totalBudgets = budgets?.length || 0;

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Botão Home */}
      <Link href="/" style={{ 
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        opacity: 0.5, fontSize: '0.85rem', color: 'inherit', textDecoration: 'none',
        transition: 'opacity 0.2s', marginTop: '0.5rem',
      }}>
        <Home size={16} />
        Início
      </Link>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(45deg, var(--primary), #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            Gerador de Orçamentos
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.8 }}>
            Crie propostas de altíssimo padrão para seus pacientes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/admin/orcamentos/templates"
            className="btn-outline"
            style={{ display: 'inline-flex' }}
          >
            <Settings2 size={18} />
            Modelos e Variáveis
          </Link>
          <Link
            href="/admin/orcamentos/novo"
            className="btn-primary"
            style={{ display: 'inline-flex' }}
          >
            <Plus size={18} />
            Novo Orçamento
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>📄</div>
          <div className="metric-info">
            <span className="metric-value">{totalBudgets}</span>
            <span className="metric-label">Total Gerado</span>
          </div>
        </div>

        <GlobalValueCard totalValue={totalValue} />

        <WebhookTestCard webhookUrl={process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || ""} />
      </div>

      {/* List */}
      <div className="glass-panel">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Histórico Recente</h2>
        <BudgetList budgets={budgets || []} />
      </div>
    </main>
  );
}
