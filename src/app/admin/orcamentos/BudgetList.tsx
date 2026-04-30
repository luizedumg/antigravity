"use client";

import { useState } from "react";
import { deleteBudget } from "@/actions/budgets";
import { Trash2, Eye, Link2, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function BudgetList({ budgets }: { budgets: any[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyLink = (magicLinkId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${magicLinkId}`);
    setCopiedId(magicLinkId);
    setTimeout(() => setCopiedId(null), 2000);
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
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

      {budgets.length === 0 ? (
        <p style={{ textAlign: 'center', opacity: 0.5, padding: '3rem 0' }}>
          Nenhum orçamento gerado ainda.
        </p>
      ) : (
        <>
          {/* ══════ GRID DESKTOP ══════ */}
          <div className="budget-table-desktop">
            {/* Header Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '90px 1fr 1.5fr 100px 130px 150px',
              gap: '1.5rem',
              padding: '0.75rem 1.25rem',
              borderBottom: '2px solid var(--glass-border)',
              fontSize: '0.8rem',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              opacity: 0.6,
              fontWeight: 600,
            }}>
              <span>Data</span>
              <span>Paciente</span>
              <span>Procedimento</span>
              <span>Valor</span>
              <span>Status</span>
              <span style={{ textAlign: 'right' }}>Ações</span>
            </div>

            {/* Data Rows */}
            {budgets.map(budget => (
              <div
                key={budget.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 1.5fr 100px 130px 150px',
                  gap: '1.5rem',
                  padding: '1.1rem 1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  transition: 'background 0.15s ease',
                  cursor: 'default',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Data */}
                <span style={{ opacity: 0.6, fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                  {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                </span>

                {/* Paciente */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem' }} title={budget.patientName}>
                    {budget.patientName}
                  </div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.45, marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={budget.patientWhatsApp || budget.patientEmail || "-"}>
                    {budget.patientWhatsApp || budget.patientEmail || "-"}
                  </div>
                </div>

                {/* Procedimento */}
                <div style={{ fontSize: '0.88rem', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={budget.surgeryType}>
                  {budget.surgeryType}
                </div>

                {/* Valor */}
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.92rem' }}>
                  R$ {budget.totalPrice.toLocaleString('pt-BR')}
                </span>

                {/* Status */}
                <div>
                  {getStatusBadge(budget.status)}
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                  <Link href={`/admin/orcamentos/novo?cloneId=${budget.id}`} className="btn-secondary" style={{ padding: '0.4rem', minHeight: 'auto' }} title="Duplicar">
                    <span style={{ fontSize: '0.95rem' }}>📄</span>
                  </Link>
                  <Link href={`/orcamento/${budget.magicLinkId}`} target="_blank" className="btn-secondary" style={{ padding: '0.4rem', minHeight: 'auto' }} title="Visualizar">
                    <Eye size={15} />
                  </Link>
                  <button onClick={() => handleCopyLink(budget.magicLinkId)} className="btn-secondary" style={{ padding: '0.4rem', minHeight: 'auto' }} title="Copiar Link">
                    {copiedId === budget.magicLinkId ? <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>✓</span> : <Link2 size={15} />}
                  </button>
                  <button onClick={() => setDeleteId(budget.id)} className="btn-danger" style={{ padding: '0.4rem', minHeight: 'auto' }} title="Excluir">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ══════ CARDS MOBILE ══════ */}
          <div className="budget-cards-mobile">
            {budgets.map(budget => (
              <div key={budget.id} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                {/* Header: Nome + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {budget.patientName}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {getStatusBadge(budget.status)}
                </div>

                {/* Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                  <span style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {budget.surgeryType}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    R$ {budget.totalPrice.toLocaleString('pt-BR')}
                  </span>
                </div>

                {/* Contato */}
                {(budget.patientWhatsApp || budget.patientEmail) && (
                  <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.75rem' }}>
                    📱 {budget.patientWhatsApp || budget.patientEmail}
                  </div>
                )}

                {/* Ações */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link href={`/admin/orcamentos/novo?cloneId=${budget.id}`} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', minHeight: 'auto', fontSize: '0.8rem', flex: 1, textAlign: 'center' }}>
                    📄 Duplicar
                  </Link>
                  <Link href={`/orcamento/${budget.magicLinkId}`} target="_blank" className="btn-secondary" style={{ padding: '0.5rem 0.75rem', minHeight: 'auto', fontSize: '0.8rem', flex: 1, textAlign: 'center' }}>
                    👁️ Ver
                  </Link>
                  <button onClick={() => handleCopyLink(budget.magicLinkId)} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', minHeight: 'auto', fontSize: '0.8rem', flex: 1 }}>
                    {copiedId === budget.magicLinkId ? "✓ Copiado!" : "🔗 Copiar"}
                  </button>
                  <button onClick={() => setDeleteId(budget.id)} className="btn-danger" style={{ padding: '0.5rem', minHeight: 'auto' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
