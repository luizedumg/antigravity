'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { getContracts, getDistinctSurgeryTypes } from '@/actions/historico';
import { deleteContractById, getContractCriticalInfo } from '@/actions/contracts';
import { checkZapsignDocumentStatus, getDoctorSignUrl } from '@/actions/zapsign';

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

// ══════ SMART SEARCH HELPERS ══════
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a: string, b: string): number {
  const tmp = [];
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  for (let i = 0; i <= alen; i++) tmp[i] = [i];
  for (let j = 0; j <= blen; j++) tmp[0][j] = j;
  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[alen][blen];
}

function fuzzyMatch(name: string, query: string): boolean {
  const normName = normalizeString(name);
  const normQuery = normalizeString(query);
  
  const queryWords = normQuery.split(/\s+/).filter(Boolean);
  const nameWords = normName.split(/\s+/).filter(Boolean);
  
  if (queryWords.length === 0) return true;
  
  return queryWords.every(qw => {
    if (normName.includes(qw)) return true;
    
    return nameWords.some(nw => {
      if (qw.length <= 3) {
        return nw.startsWith(qw) || levenshtein(qw, nw) <= 1;
      }
      const maxDistance = Math.min(2, Math.floor(nw.length / 3));
      return levenshtein(qw, nw) <= maxDistance;
    });
  });
}

function HistoricoContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'TODOS';

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [surgeryTypes, setSurgeryTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterSurgery, setFilterSurgery] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // States for Critical Info Modal
  const [modalData, setModalData] = useState<any[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingInfoId, setLoadingInfoId] = useState<string | null>(null);

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
  // + Polling ativo na ZapSign para contratos presos (fallback do webhook)
  useEffect(() => {
    const hasActive = contracts.some(c =>
      ['PENDENTE', 'ENVIADO', 'VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO'].includes(c.status)
    );
    const interval = setInterval(async () => {
      // Verificar status na ZapSign para contratos que podem estar travados
      const stuckContracts = contracts.filter(c =>
        c.zapsignToken && ['VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO'].includes(c.status)
      );
      
      for (const c of stuckContracts) {
        try {
          await checkZapsignDocumentStatus(c.id);
        } catch (e) {
          // Erro silencioso — o polling não deve quebrar
        }
      }
      
      await loadContracts();
    }, hasActive ? 15000 : 60000);

    return () => clearInterval(interval);
  }, [contracts, loadContracts]);

  // Load surgery types for filter
  useEffect(() => {
    getDistinctSurgeryTypes().then(setSurgeryTypes);
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('⚠️ Atenção!\n\nVocê está prestes a excluir este contrato permanentemente.\nEssa ação não pode ser desfeita.\n\nDeseja continuar?');
    if (!confirmed) return;
    
    const pin = window.prompt('Digite o PIN de segurança para confirmar:');
    if (pin) {
      setDeletingId(id);
      try {
        const res = await deleteContractById(id, pin);
        if (res && res.error) {
          alert(res.error);
        } else {
          await loadContracts();
        }
      } catch (e: any) {
        alert(e.message || 'Erro inesperado. A exclusão foi cancelada.');
      }
      setDeletingId(null);
    }
  };

  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const handleOpenCriticalInfo = async (contractId: string) => {
    setLoadingInfoId(contractId);
    try {
      const info = await getContractCriticalInfo(contractId);
      setModalData(info);
      setIsModalOpen(true);
    } catch (e) {
      alert("Erro ao carregar dados críticos");
    }
    setLoadingInfoId(null);
  };

  const handleCheckStatus = async (contractId: string) => {
    setCheckingId(contractId);
    try {
      const res = await checkZapsignDocumentStatus(contractId);
      console.log('[Manual Check]', res);
      await loadContracts();
    } catch (e) {
      console.error('Erro ao verificar:', e);
    }
    setCheckingId(null);
  };

  const handleDownloadPdf = async (contractId: string) => {
    const res = await checkZapsignDocumentStatus(contractId);
    if (res && res.signedFileUrl) {
      window.open(res.signedFileUrl, '_blank');
    } else {
      alert('PDF assinado ainda não está disponível. O status foi verificado.');
      await loadContracts();
    }
  };

  const handleDoctorSign = async (contractId: string) => {
    setSigningId(contractId);
    try {
      const res = await getDoctorSignUrl(contractId);
      if (res.success && res.signUrl) {
        window.open(res.signUrl, '_blank');
      } else if (res.doctorStatus === 'signed') {
        alert('✅ O médico já assinou este contrato.');
        await loadContracts();
      } else {
        alert(res.error || 'Não foi possível obter o link de assinatura.');
      }
    } catch (e) {
      console.error('Erro ao buscar URL de assinatura:', e);
      alert('Erro ao conectar com ZapSign.');
    }
    setSigningId(null);
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

  // Real-time smart filtering
  const filteredContracts = contracts.filter(contract => {
    if (!searchQuery) return true;

    // 1. Match by patient name (fuzzy/approximate)
    if (fuzzyMatch(contract.patientName, searchQuery)) return true;

    // 2. Match by WhatsApp number (clean digits)
    const queryDigits = searchQuery.replace(/\D/g, '');
    if (queryDigits.length > 0) {
      const phoneDigits = (contract.patientWhatsApp || '').replace(/\D/g, '');
      if (phoneDigits.includes(queryDigits)) return true;
    }

    // 3. Match by formatted date
    const contractDateStr = formatDate(contract.createdAt).toLowerCase();
    if (contractDateStr.includes(searchQuery.toLowerCase())) return true;

    return false;
  });

  return (
    <main className="container">
      {/* BOTÃO HOME */}
      <div style={{ marginTop: '1rem' }}>
        <Link href="/" style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          opacity: 0.5, fontSize: '0.85rem', color: 'inherit', textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}>
          <Home size={16} />
          Início
        </Link>
      </div>

      <div className="glass-panel animate-fade-in" style={{ marginTop: '1rem' }}>
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

        {/* ══════ BARRA DE PESQUISA INTELIGENTE ══════ */}
        <div style={{ position: 'relative', marginBottom: '1.25rem', width: '100%' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nome do paciente (aproximação), WhatsApp ou data (DD/MM/AAAA)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: '2.5rem',
              paddingRight: searchQuery ? '2.5rem' : '1rem',
              fontSize: '1rem',
              borderRadius: '10px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(10px)',
              width: '100%',
              transition: 'all 0.2s ease',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--foreground)',
                opacity: 0.5,
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
            >
              ✕
            </button>
          )}
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
            {searchQuery 
              ? `${filteredContracts.length} de ${contracts.length} contrato(s)` 
              : `${contracts.length} contrato(s)`}
          </div>
        </div>

        {/* ══════ LISTA DE CONTRATOS ══════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading && (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }} className="animate-pulse">Carregando contratos...</p>
          )}

          {!loading && filteredContracts.length === 0 && (
            <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }}>
              {searchQuery 
                ? 'Nenhum contrato corresponde à sua busca.' 
                : 'Nenhum contrato encontrado com os filtros selecionados.'}
            </p>
          )}

          {!loading && filteredContracts.map((contract, i) => (
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

                {/* Baixar PDF — sempre visível se tem zapsignToken */}
                {contract.zapsignToken && (
                  <button
                    onClick={() => handleDownloadPdf(contract.id)}
                    className="btn-success"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px' }}
                  >
                    📥 Baixar PDF
                  </button>
                )}

                {/* Verificar Status Manual — para contratos em andamento */}
                {contract.zapsignToken && !['DRIVE_OK', 'RECUSADO'].includes(contract.status) && (
                  <button
                    onClick={() => handleCheckStatus(contract.id)}
                    disabled={checkingId === contract.id}
                    style={{
                      padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px',
                      borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(148, 163, 184, 0.08)', color: 'var(--text)',
                      cursor: 'pointer', fontWeight: 500, fontFamily: 'var(--font-base)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {checkingId === contract.id ? '⏳ Verificando...' : '🔄 Verificar'}
                  </button>
                )}

                {/* Botão de Dados Críticos — para contratos com formulário preenchido */}
                {['VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO', 'DRIVE_OK'].includes(contract.status) && (
                  <button
                    onClick={() => handleOpenCriticalInfo(contract.id)}
                    disabled={loadingInfoId === contract.id}
                    title="Ver dados importantes (Alergias, Imagem, etc)"
                    style={{
                      padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px',
                      borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.4)',
                      background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04',
                      cursor: loadingInfoId === contract.id ? 'wait' : 'pointer',
                      fontWeight: 600, fontFamily: 'var(--font-base)',
                      transition: 'all 0.2s ease', display: 'inline-flex',
                      alignItems: 'center', gap: '0.4rem'
                    }}
                    onMouseEnter={e => { if (loadingInfoId !== contract.id) { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)'; e.currentTarget.style.transform = ''; }}
                  >
                    {loadingInfoId === contract.id ? '⏳' : '⚠️ Dados Críticos'}
                  </button>
                )}

                {/* Assinatura do Médico — para contratos com ZapSign que ainda não foram totalmente assinados */}
                {contract.zapsignToken && !['ASSINADO', 'DRIVE_OK', 'RECUSADO'].includes(contract.status) && (
                  <button
                    onClick={() => handleDoctorSign(contract.id)}
                    disabled={signingId === contract.id}
                    title="Abrir link para o médico assinar"
                    style={{
                      padding: '0.5rem 1rem', fontSize: '0.85rem', minHeight: '40px',
                      borderRadius: '8px',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#8b5cf6',
                      cursor: signingId === contract.id ? 'wait' : 'pointer',
                      fontWeight: 600,
                      fontFamily: 'var(--font-base)',
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    onMouseEnter={e => { if (signingId !== contract.id) { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.transform = ''; }}
                  >
                    {signingId === contract.id ? '⏳ Abrindo...' : '✍️ Assinar (Médico)'}
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

                {/* Excluir — ícone discreto para todos os contratos */}
                <button
                  onClick={() => handleDelete(contract.id)}
                  disabled={deletingId === contract.id}
                  title="Excluir contrato"
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    background: 'rgba(239, 68, 68, 0.06)',
                    color: '#ef4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.95rem', transition: 'all 0.2s ease',
                    opacity: deletingId === contract.id ? 0.5 : 0.6,
                    flexShrink: 0
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.opacity = '1'; (e.currentTarget).style.background = 'rgba(239, 68, 68, 0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.opacity = '0.6'; (e.currentTarget).style.background = 'rgba(239, 68, 68, 0.06)'; }}
                >
                  {deletingId === contract.id ? '⏳' : '🗑️'}
                </button>
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

      {/* ══════ MODAL DE DADOS CRÍTICOS ══════ */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={() => setIsModalOpen(false)}>
          <div 
            className="glass-panel"
            style={{ width: '90%', maxWidth: '500px', padding: '2rem', borderRadius: '16px', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.6 }}
            >×</button>
            <h2 style={{ margin: '0 0 1.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Dados Importantes
            </h2>
            
            {!modalData || modalData.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Nenhum dado crítico (alergias, doenças, uso de imagem, etc) foi encontrado neste contrato.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {modalData.map((item, idx) => (
                  <div key={idx} style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    background: item.isHighlighted ? 'rgba(239, 68, 68, 0.05)' : 'rgba(148, 163, 184, 0.05)',
                    border: `1px solid ${item.isHighlighted ? (item.category === 'Uso de Imagem' && item.value === 'Sim' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)') : 'rgba(148, 163, 184, 0.2)'}`
                  }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      {item.category}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {item.label}
                    </div>
                    <div style={{ 
                      fontSize: '1rem', 
                      color: item.isHighlighted ? (item.category === 'Uso de Imagem' && item.value === 'Sim' ? '#10b981' : '#ef4444') : 'inherit',
                      fontWeight: item.isHighlighted ? 700 : 400
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button className="btn-primary" onClick={() => setIsModalOpen(false)} style={{ width: '100%', marginTop: '2rem' }}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense fallback={
      <main className="container">
        <div className="glass-panel animate-fade-in" style={{ marginTop: '5vh', textAlign: 'center', padding: '3rem' }}>
          <p className="animate-pulse" style={{ opacity: 0.7 }}>Carregando histórico...</p>
        </div>
      </main>
    }>
      <HistoricoContent />
    </Suspense>
  );
}
