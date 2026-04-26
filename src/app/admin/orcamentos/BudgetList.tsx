"use client";

import { useState } from "react";
import { deleteBudget } from "@/actions/budgets";
import { Trash2, Eye, Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BudgetList({ budgets }: { budgets: any[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    setError("");

    const res = await deleteBudget(deleteId, pin);
    if (!res.success) {
      setError(res.error || "Erro ao excluir.");
      setLoading(false);
      return;
    }

    setDeleteId(null);
    setPin("");
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    let styleClass = "status-badge--pendente";
    if (status === 'ENVIADO') styleClass = "status-badge--enviado";
    if (status === 'VISUALIZADO') styleClass = "status-badge--visualizado";
    if (status === 'APROVADO') styleClass = "status-badge--assinado";
    if (status === 'RECUSADO') styleClass = "status-badge--recusado";
    
    return (
      <span className={`status-badge ${styleClass}`}>
        <span className="dot"></span>
        {status}
      </span>
    );
  };

  return (
    <div>
      {/* Delete Modal */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--background)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Autenticação Necessária</h3>
            <p style={{ opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.9rem' }}>Insira o PIN de administrador para excluir este orçamento.</p>
            {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
            <input
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', marginBottom: '1.5rem' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => { setDeleteId(null); setPin(""); setError(""); }}
                className="btn-secondary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading || !pin}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {loading ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.7 }}>
              <th style={{ padding: '1rem 0' }}>Data</th>
              <th style={{ padding: '1rem 0' }}>Paciente</th>
              <th style={{ padding: '1rem 0' }}>Procedimento</th>
              <th style={{ padding: '1rem 0' }}>Valor Total</th>
              <th style={{ padding: '1rem 0' }}>Status</th>
              <th style={{ padding: '1rem 0', textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {budgets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', opacity: 0.5 }}>
                  Nenhum orçamento gerado ainda.
                </td>
              </tr>
            ) : budgets.map(budget => (
              <tr key={budget.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '1.25rem 0', opacity: 0.8 }}>
                  {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '1.25rem 0' }}>
                  <div style={{ fontWeight: 600 }}>{budget.patientName}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{budget.patientWhatsApp || budget.patientEmail || "-"}</div>
                </td>
                <td style={{ padding: '1.25rem 0' }}>{budget.surgeryType}</td>
                <td style={{ padding: '1.25rem 0', fontWeight: 600 }}>
                  R$ {budget.totalPrice.toLocaleString('pt-BR')}
                </td>
                <td style={{ padding: '1.25rem 0' }}>
                  {getStatusBadge(budget.status)}
                </td>
                <td style={{ padding: '1.25rem 0', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <Link
                      href={`/admin/orcamentos/novo?cloneId=${budget.id}`}
                      className="btn-secondary"
                      style={{ padding: '0.5rem', minHeight: 'auto' }}
                      title="Duplicar Orçamento"
                    >
                      <span style={{ fontSize: '1rem' }}>📄</span>
                    </Link>
                    <Link
                      href={`/orcamento/${budget.magicLinkId}`}
                      target="_blank"
                      className="btn-secondary"
                      style={{ padding: '0.5rem', minHeight: 'auto' }}
                      title="Ver Página do Cliente (Link Mágico)"
                    >
                      <Eye size={18} />
                    </Link>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/orcamento/${budget.magicLinkId}`);
                        alert("Link mágico copiado!");
                      }}
                      className="btn-secondary"
                      style={{ padding: '0.5rem', minHeight: 'auto' }}
                      title="Copiar Link"
                    >
                      <Link2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(budget.id)}
                      className="btn-danger"
                      style={{ padding: '0.5rem', minHeight: 'auto' }}
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
