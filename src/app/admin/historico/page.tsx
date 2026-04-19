'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getContracts, getDistinctSurgeryTypes } from '@/actions/historico';
import { deleteContractById } from '@/actions/contracts';
import { checkZapsignDocumentStatus } from '@/actions/zapsign';
import { uploadSignedPdfToDrive } from '@/actions/googledrive';

type Contract = {
  id: string;
  patientName: string;
  patientCpf: string | null;
  patientWhatsapp: string | null;
  surgeryType: string;
  status: string;
  linkId: string | null;
  zapsignToken: string | null;
  googleDriveFileId: string | null;
  createdAt: Date;
};

// Formata E.164 (+5511912345678) para exibição amigável: +55 (11) 91234-5678
function formatWhatsapp(raw: string | null | undefined): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return raw;
  // Assume últimos 8 ou 9 dígitos = telefone, 2 dígitos antes = DDD, restante = país
  const phoneLen = digits.length >= 12 ? 9 : 8;
  const phone = digits.slice(-phoneLen);
  const ddd = digits.slice(-phoneLen - 2, -phoneLen);
  const country = digits.slice(0, digits.length - phoneLen - 2);
  const phoneFmt = phoneLen === 9
    ? `${phone.slice(0, 5)}-${phone.slice(5)}`
    : `${phone.slice(0, 4)}-${phone.slice(4)}`;
  return country ? `+${country} (${ddd}) ${phoneFmt}` : `(${ddd}) ${phoneFmt}`;
}

export default function HistoricoPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [surgeryTypes, setSurgeryTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterSurgery, setFilterSurgery] = useState('TODOS');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    const data = await getContracts({
      status: filterStatus,
      surgeryType: filterSurgery
    });
    setContracts(data as Contract[]);
    setLoading(false);
  }, [filterStatus, filterSurgery]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Auto-polling: refresh every 30s if there are pending/visualizado contracts
  useEffect(() => {
    const hasPending = contracts.some(c => c.status === 'PENDENTE' || c.status === 'VISUALIZADO');
    if (!hasPending) return;

    const interval = setInterval(() => {
      loadContracts();
    }, 30000);

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

  const handleCheckStatus = async (contractId: string) => {
    setCheckingId(contractId);
    const res = await checkZapsignDocumentStatus(contractId);
    if (res && res.signedFileUrl) {
      window.open(res.signedFileUrl, '_blank');
      await loadContracts();
    } else {
      alert('O documento ainda não foi totalmente assinado pelas partes.');
    }
    setCheckingId(null);
  };

  const handleUploadToDrive = async (contractId: string) => {
    setUploadingId(contractId);
    try {
      const result = await uploadSignedPdfToDrive(contractId);
      if (result.success) {
        alert('✅ PDF salvo no Google Drive com sucesso!');
        await loadContracts();
      } else {
        alert('❌ Erro ao salvar no Drive: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      alert('❌ Erro: ' + (err.message || 'Falha na conexão'));
    }
    setUploadingId(null);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      PENDENTE:    { className: 'status-badge status-badge--pendente',    label: 'Aguardando Preenchimento' },
      VISUALIZADO: { className: 'status-badge status-badge--visualizado', label: 'Aguardando Assinatura' },
      ASSINADO:    { className: 'status-badge status-badge--assinado',    label: 'Assinado e Finalizado' },
    };
    const info = map[status] || map.PENDENTE;
    return (
      <span className={info.className}>
        <span className="dot" />
        {info.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <main className="container">
      <div className="glass-panel animate-fade-in" style={{ marginTop: '5vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ color: 'var(--primary)', margin: 0 }}>Histórico de Contratos</h1>
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
              <option value="VISUALIZADO">Aguardando Assinatura</option>
              <option value="ASSINADO">Assinado</option>
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
                borderLeft: `6px solid ${
                  contract.status === 'ASSINADO' ? 'var(--success)' :
                  contract.status === 'VISUALIZADO' ? 'var(--warning)' :
                  'var(--primary)'
                }`,
                animationDelay: `${i * 0.05}s`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{contract.patientName}</h3>
                  <p style={{ margin: '0.25rem 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                    {contract.patientWhatsapp
                      ? <>WhatsApp: {formatWhatsapp(contract.patientWhatsapp)}</>
                      : contract.patientCpf
                        ? <>CPF: {contract.patientCpf}</>
                        : <>—</>
                    } &nbsp;|&nbsp; {contract.surgeryType} &nbsp;|&nbsp; {formatDate(contract.createdAt)}
                  </p>
                </div>
                {getStatusBadge(contract.status)}
              </div>

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

                {contract.status !== 'PENDENTE' && contract.zapsignToken && (
                  <button
                    onClick={() => handleCheckStatus(contract.id)}
                    disabled={checkingId === contract.id}
                    className={contract.status === 'ASSINADO' ? 'btn-success' : 'btn-primary'}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px' }}
                  >
                    {checkingId === contract.id ? 'Buscando...' :
                     contract.status === 'ASSINADO' ? '📥 Baixar PDF' : '🔄 Verificar / Baixar'}
                  </button>
                )}

                {/* Google Drive indicator */}
                {contract.status === 'ASSINADO' && contract.googleDriveFileId && (
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

                {/* Manual upload button if signed but not yet on Drive */}
                {contract.status === 'ASSINADO' && !contract.googleDriveFileId && (
                  <button
                    onClick={() => handleUploadToDrive(contract.id)}
                    disabled={uploadingId === contract.id}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.82rem',
                      minHeight: '36px',
                      borderRadius: '8px',
                      border: '1px solid rgba(66, 133, 244, 0.4)',
                      background: 'rgba(66, 133, 244, 0.1)',
                      color: '#4285F4',
                      cursor: 'pointer',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {uploadingId === contract.id ? '⏳ Enviando...' : '☁️ Salvar no Drive'}
                  </button>
                )}

                {contract.status !== 'ASSINADO' && (
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
