'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getContracts, getDistinctSurgeryTypes } from '@/actions/historico';
import { deleteContractById } from '@/actions/contracts';
import { checkZapsignDocumentStatus } from '@/actions/zapsign';

type Contract = {
  id: string;
  patientName: string;
  patientCpf: string;
  patientWhatsApp: string | null;
  surgeryType: string;
  status: string;
  linkId: string | null;
  zapsignToken: string | null;
  googleDriveFileId: string | null;
  createdAt: Date;
};

function formatWhatsApp(num: string): string {
  if (!num || num.length < 10) return num || '';
  if (num.startsWith('55') && num.length >= 12) {
    const ddd = num.slice(2, 4);
    const phone = num.slice(4);
    const formatted = phone.length === 9
      ? `${phone.slice(0, 5)}-${phone.slice(5)}`
      : `${phone.slice(0, 4)}-${phone.slice(4)}`;
    return `+55 (${ddd}) ${formatted}`;
  }
  return `+${num}`;
}

// ══════ STATUS CONFIGURATION ══════
const STATUS_CONFIG: Record<string, { className: string; label: string; icon: string; borderColor: string }> = {
  PENDENTE:           { className: 'status-badge status-badge--pendente',    label: 'Aguardando Preenchimento', icon: '⏳', borderColor: 'var(--primary)' },
  ENVIADO:            { className: 'status-badge status-badge--enviado',     label: 'Enviado via WhatsApp',     icon: '📨', borderColor: '#0891b2' },
  VISUALIZADO:        { className: 'status-badge status-badge--visualizado', label: 'Contrato Visualizado',     icon: '👁️', borderColor: 'var(--warning)' },
  ASSINATURA_PARCIAL: { className: 'status-badge status-badge--parcial',     label: 'Assinatura Parcial',       icon: '✍️', borderColor: '#d97706' },
  ASSINADO:           { className: 'status-badge status-badge--assinado',    label: 'Totalmente Assinado',      icon: '✅', borderColor: 'var(--success)' },
  DRIVE_OK:           { className: 'status-badge status-badge--drive',       label: 'Concluído (Drive ✓)',      icon: '☁️', borderColor: '#4285F4' },
  RECUSADO:           { className: 'status-badge status-badge--recusado',    label: 'Recusado',                 icon: '❌', borderColor: '#ef4444' },
};

export default function HistoricoPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [surgeryTypes, setSurgeryTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterSurgery, setFilterSurgery] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadContracts = useCallback(async () => {
    const data = await getContracts({
      status: filterStatus,
      surgeryType: filterSurgery
    });
    setContracts(data as Contract[]);
    setLoading(false);
    setLastUpdate(new Date());
  }, [filterStatus, filterSurgery]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Auto-polling: 10s para contratos ativos, 30s quando tudo finalizado
  useEffect(() => {
    const hasActive = contracts.some(c =>
      ['PENDENTE', 'ENVIADO', 'VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO'].includes(c.status)
    );
    const interval = setInterval(() => {
      loadContracts();
    }, hasActive ? 10000 : 30000);

    return () => clearInterval(interval);
  }, [contracts, loadContracts]);

  // Load surgery types for filter
  useEffect(() => {
    getDistinctSurgeryTypes().then(setSurgeryTypes);
  }, []);

  const handleDelete = async (id: string) => {
    const pin = window.prompt("Para excluir este contrato, digite a senha de segurança (0405):");
    if (pin === '0405') {
      setDeletingId(id);
      await deleteContractById(id);
      await loadContracts();
      setDeletingId(null);
    } else if (pin !== null) {
      alert("Senha incorreta. A exclusão foi cancelada.");
    }
  };

  const handleDownloadPdf = async (contractId: string) => {
    const res = await checkZapsignDocumentStatus(contractId);
    if (res && res.signedFileUrl) {
      window.open(res.signedFileUrl, '_blank');
    } else {
      alert('PDF assinado ainda não está disponível.');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDENTE;
    return (
      <span className={config.className}>
        <span className="dot" />
        {config.label}
      </span>
    );
  };

  const getBorderColor = (status: string) => {
    return STATUS_CONFIG[status]?.borderColor || 'var(--primary)';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Status progress indicator
  const getProgressSteps = (status: string) => {
    const steps = ['PENDENTE', 'ENVIADO', 'VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO', 'DRIVE_OK'];
    const icons = ['📄', '📨', '👁️', '✍️', '✅', '☁️'];

    if (status === 'RECUSADO') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>❌ Documento recusado por um signatário</span>
        </div>
      );
    }

    const currentIdx = steps.indexOf(status);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginTop: '0.75rem' }}>
        {steps.map((step, i) => {
          const isCompleted = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                title={STATUS_CONFIG[step]?.label}
                style={{
                  width: isCurrent ? '28px' : '22px',
                  height: isCurrent ? '28px' : '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isCurrent ? '0.8rem' : '0.65rem',
                  background: isCompleted
                    ? `${getBorderColor(step)}20`
                    : 'rgba(148, 163, 184, 0.1)',
                  border: isCurrent
                    ? `2px solid ${getBorderColor(step)}`
                    : isCompleted
                    ? `1px solid ${getBorderColor(step)}50`
                    : '1px solid rgba(148, 163, 184, 0.2)',
                  opacity: isCompleted ? 1 : 0.35,
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}
              >
                {icons[i]}
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  width: '12px',
                  height: '2px',
                  background: i < currentIdx
                    ? getBorderColor(steps[i + 1])
                    : 'rgba(148, 163, 184, 0.2)',
                  transition: 'all 0.3s ease'
                }} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="container">
      <div className="glass-panel animate-fade-in" style={{ marginTop: '5vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ color: 'var(--primary)', margin: 0 }}>Histórico de Contratos</h1>
            <p style={{ fontSize: '0.8rem', opacity: 0.5, margin: '0.25rem 0 0 0' }}>
              🔄 Atualização automática • Última: {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <Link href="/admin/novo" className="btn-primary">
            + Novo Contrato
          </Link>
        </div>

        {/* ══════ FILTROS ══════ */}
        <div className="filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Status:</span>
            <select value={filterStatus} onChange={e => { setLoading(true); setFilterStatus(e.target.value); }}>
              <option value="TODOS">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ENVIADO">Enviado</option>
              <option value="VISUALIZADO">Visualizado</option>
              <option value="ASSINATURA_PARCIAL">Assinatura Parcial</option>
              <option value="ASSINADO">Assinado</option>
              <option value="DRIVE_OK">Concluído (Drive)</option>
              <option value="RECUSADO">Recusado</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>Cirurgia:</span>
            <select value={filterSurgery} onChange={e => { setLoading(true); setFilterSurgery(e.target.value); }}>
              <option value="TODOS">Todas</option>
              {surgeryTypes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.85rem', opacity: 0.6 }}>
            {contracts.length} contrato(s)
          </div>
        </div>

        {/* ══════ LISTA DE CONTRATOS ══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }} className="animate-pulse">Carregando contratos...</p>
          )}

          {!loading && contracts.length === 0 && (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>Nenhum contrato encontrado com os filtros selecionados.</p>
          )}

          {!loading && contracts.map((contract, i) => (
            <div
              key={contract.id}
              className="glass-panel contract-card"
              style={{
                borderLeft: `6px solid ${getBorderColor(contract.status)}`,
                animationDelay: `${i * 0.05}s`
              }}
            >
              {/* ── Cabeçalho: Nome + Badge ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{contract.patientName}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                    {contract.patientWhatsApp 
                      ? <>📱 {formatWhatsApp(contract.patientWhatsApp)}</>
                      : contract.patientCpf ? <>CPF: {contract.patientCpf}</> : null
                    }
                    &nbsp;|&nbsp; {contract.surgeryType} &nbsp;|&nbsp; {formatDate(contract.createdAt)}
                  </p>
                </div>
                {getStatusBadge(contract.status)}
              </div>

              {/* ── Barra de Progresso Visual ── */}
              {getProgressSteps(contract.status)}

              {/* ── Ações ── */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  readOnly
                  value={`${baseUrl}/paciente/${contract.linkId}`}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'transparent',
                    color: 'inherit',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-base)'
                  }}
                  onClick={e => { (e.target as HTMLInputElement).select(); }}
                />

                {/* Baixar PDF — só mostra quando assinado ou no Drive */}
                {['ASSINADO', 'DRIVE_OK'].includes(contract.status) && contract.zapsignToken && (
                  <button
                    onClick={() => handleDownloadPdf(contract.id)}
                    className="btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px' }}
                  >
                    📥 Baixar PDF
                  </button>
                )}

                {/* Drive indicator */}
                {contract.googleDriveFileId && (
                  <span
                    title={`Salvo no Google Drive (ID: ${contract.googleDriveFileId})`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      background: 'rgba(66, 133, 244, 0.1)',
                      color: '#4285F4',
                      border: '1px solid rgba(66, 133, 244, 0.25)'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA"/><path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L3.45 44.5c-.8 1.4-1.2 2.95-1.2 4.5h27.5L43.65 25z" fill="#00AC47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L84.3 60.2c.8-1.4 1.2-2.95 1.2-4.5H57.8l6.85 12.5 8.9 8.6z" fill="#EA4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.9 0h-18.5c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/><path d="M57.8 49H85.5c0-1.55-.4-3.1-1.2-4.5L73.55 27.7c-.8-1.4-1.95-2.5-3.3-3.3L57.8 49z" fill="#2684FC"/><path d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/></svg>
                    Drive ✓
                  </span>
                )}

                {/* Excluir — só para contratos que não estão finalizados */}
                {!['ASSINADO', 'DRIVE_OK'].includes(contract.status) && (
                  <button
                    onClick={() => handleDelete(contract.id)}
                    disabled={deletingId === contract.id}
                    className="btn-danger"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px' }}
                  >
                    {deletingId === contract.id ? 'Excluindo...' : '✖ Excluir'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" className="btn-secondary">
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
