"use client";

import { useState } from "react";
import { Download, CheckCircle2, Calendar, ArrowLeft } from "lucide-react";
import { formatBRL } from "@/lib/money";
import { updateBudgetStatus } from "@/actions/budgets";

// WhatsApp comercial do consultório (para o paciente falar com a equipe).
const CLINIC_WHATSAPP = "5534997346139";

function parseVariables(raw: string): any[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default function BudgetClientView({ budget }: { budget: any }) {
  const variables = parseVariables(budget.variablesSelectedJson);
  const [status, setStatus] = useState<string>(budget.status);
  const [saving, setSaving] = useState(false);

  const waLink = (msg: string) =>
    `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(msg)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleAccept = async () => {
    setSaving(true);
    try {
      await updateBudgetStatus(budget.id, "APROVADO");
      setStatus("APROVADO");
    } catch {
      // Mesmo que a gravação falhe, encaminhamos o paciente ao WhatsApp.
    } finally {
      setSaving(false);
      window.open(
        waLink(`Olá! Quero prosseguir com a proposta de ${budget.surgeryType} (${budget.patientName}).`),
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const handleCloseOrBack = () => {
    // Tenta fechar a aba (caso aberta com target="_blank"); senão, volta no
    // histórico. Nunca redireciona para "/" (que levaria o paciente ao login).
    window.close();
    setTimeout(() => {
      if (window.history.length > 1) window.history.back();
    }, 150);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* ══════════════════════════════════════════════════
           PRINT — Pixel-Perfect Replica of Web View
           ══════════════════════════════════════════════════ */
        @page {
          size: A4 portrait;
          margin: 0; 
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm;
            height: 297mm;
            background: #e2e8f0 !important; /* Subtle grey background for the A4 page */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * { visibility: hidden; }
          .budget-print-container, .budget-print-container * { visibility: visible; }

          /* Hide print-specific elements, keep web elements */
          .show-on-print { display: none !important; }
          .hide-on-print { display: flex !important; }
          
          /* Hide the download button specifically */
          .budget-header-bar button { display: none !important; }

          /* Use zoom instead of transform to physically scale the layout footprint 
             and avoid phantom bounding boxes that cause page breaks. */
          .budget-print-container {
            width: 1100px !important;
            height: 1400px !important; /* Slightly shorter to guarantee fit */
            zoom: 0.65 !important; /* Scales everything down layout-wise */
            margin: 10mm auto !important; /* Center on page */
            
            /* Restore beautiful web styling */
            background: #0a0a0a !important;
            border-radius: 40px !important;
            box-shadow: 0 40px 80px rgba(0,0,0,0.3) !important;
            flex-wrap: nowrap !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: row !important;
            
            /* STRICTLY PREVENT PAGE BREAKS */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .budget-left-panel {
            flex: 0 0 380px !important; /* Fixed width */
            padding: 4rem 3rem !important;
            background: #0a0a0a !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
          }

          .budget-right-panel {
            flex: 1 !important;
            margin: 2rem !important;
            border-radius: 30px !important;
            padding: 4rem 4rem !important;
            background: white !important;
            border: 3px solid #111 !important;
            box-shadow: -20px 0 50px rgba(0,0,0,0.5) !important;
            display: flex !important;
            flex-direction: column !important;
          }

          /* Ensure payment box doesn't break and pushes nicely */
          .budget-payment-box {
            margin-top: auto !important;
          }

          /* Fix widths inside scaled container */
          .budget-header-bar {
            margin-bottom: 3.5rem !important;
            justify-content: flex-start !important; /* Date on left */
          }
          
          /* Force logo to be white despite browser ink-saving overrides */
          .budget-logo-img {
            filter: brightness(0) invert(1) !important;
            -webkit-filter: brightness(0) invert(1) !important;
            opacity: 1 !important;
          }
        }

        .show-on-print { display: none; }

        /* ══════════════════════════════════════════════════
           WEB — Responsive Budget View
           ══════════════════════════════════════════════════ */
        .budget-print-container {
          background: #0a0a0a;
          border-radius: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          font-family: var(--font-base, 'Outfit', sans-serif);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .budget-left-panel {
          background: #0a0a0a;
          color: white;
          padding: 3rem;
          flex: 1 1 350px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .budget-right-panel {
          padding: 4rem;
          flex: 2 1 500px;
          background: white;
          position: relative;
          box-shadow: -20px 0 50px rgba(0,0,0,0.5);
          z-index: 20;
          border: 3px solid #111;
          border-radius: 2rem;
          margin: 1.5rem;
        }

        .budget-title {
          font-size: 2.5rem;
          font-weight: 300;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .budget-procedure-name {
          font-size: 1.8rem;
          font-weight: 300;
          color: rgba(255,255,255,0.9);
        }

        .budget-total-value {
          font-size: 2.5rem;
          font-weight: 400;
          letter-spacing: -0.02em;
          color: #334155;
        }

        .budget-team-row {
          background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
          border-left: 3px solid #0f172a;
          border-radius: 0 8px 8px 0;
          padding: 0.85rem 1rem !important;
          margin-bottom: 0.25rem;
        }

        .budget-team-row .budget-cost-name {
          color: #0f172a !important;
          font-weight: 600 !important;
          font-size: 1.02rem !important;
        }

        .budget-team-row .budget-cost-value {
          color: #0f172a !important;
          font-weight: 700 !important;
          font-size: 1.05rem !important;
        }

        .budget-header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 3rem;
          gap: 1rem;
        }

        .budget-cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          border-bottom: 1px solid #f4f4f5;
          gap: 0.75rem;
        }

        .budget-cost-name {
          font-size: 1rem;
          color: #555;
        }

        .budget-cost-value {
          font-size: 1rem;
          color: #555;
          white-space: nowrap;
          font-weight: 500;
        }

        .budget-logo-img {
          max-height: 60px;
          margin-bottom: 3rem;
          filter: brightness(0) invert(1);
        }

        /* ══════ MOBILE ══════ */
        @media (max-width: 768px) {
          .budget-print-container {
            border-radius: 1.25rem;
            margin: 0;
          }

          .budget-left-panel {
            padding: 2rem 1.5rem;
            flex: 1 1 100%;
          }

          .budget-right-panel {
            padding: 1.75rem 1.25rem;
            flex: 1 1 100%;
            margin: 0;
            border-radius: 1.5rem 1.5rem 1.25rem 1.25rem;
            border-width: 2px;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.3);
          }

          .budget-logo-img {
            max-height: 45px;
            margin-bottom: 2rem;
          }

          .budget-title {
            font-size: 1.75rem;
            margin-bottom: 1rem;
          }

          .budget-procedure-name {
            font-size: 1.25rem;
          }

          .budget-total-value {
            font-size: 1.85rem;
          }

          .budget-header-bar {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 2rem;
            gap: 0.75rem;
          }

          .budget-cost-name {
            font-size: 0.9rem;
          }

          .budget-cost-value {
            font-size: 0.9rem;
          }

          .budget-payment-box {
            padding: 1.25rem 1rem !important;
          }
          .budget-payment-items {
            gap: 0.6rem !important;
            font-size: 0.82rem !important;
          }
        }

        @media (max-width: 380px) {
          .budget-left-panel {
            padding: 1.5rem 1.25rem;
          }

          .budget-right-panel {
            padding: 1.5rem 1rem;
          }

          .budget-title {
            font-size: 1.5rem;
          }

          .budget-total-value {
            font-size: 1.6rem;
          }

          .budget-payment-box {
            padding: 1rem 0.75rem !important;
          }
          .budget-payment-items {
            font-size: 0.78rem !important;
          }
        }
      `}} />

      {/* Botão de Fechar / Voltar */}
      <div className="hide-on-print" style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        alignItems: 'center', 
        width: '100%', 
        marginBottom: '1rem',
        padding: '0 0.5rem'
      }}>
        <button 
          onClick={handleCloseOrBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0a0a0a',
            color: 'white',
            padding: '0.65rem 1.3rem',
            borderRadius: '50px',
            fontWeight: 500,
            fontSize: '0.9rem',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            outline: 'none',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#1a1a1a';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#0a0a0a';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>

      <div className="budget-print-container">
        
        {/* Esquerda: Mensagem de Boas vindas (Branding) */}
        <div className="budget-left-panel hide-on-print">
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(50px)', transform: 'translate(30%, -30%)' }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '400px', height: '400px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '50%', filter: 'blur(60px)', transform: 'translate(-30%, 30%)' }}></div>
          
          <div style={{ position: 'relative', zIndex: 10 }}>
            <img src="/logo.png" alt="Logo" className="budget-logo-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            
            <h1 className="budget-title">
              Proposta<br/>Cirúrgica
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 300, fontSize: '1.05rem', lineHeight: 1.6 }}>
              Olá, <span style={{ color: 'white', fontWeight: 500 }}>{budget.patientName}</span>.<br/>
              Este é o seu orçamento personalizado, elaborado com exclusividade e planejado conforme a análise do seu caso.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 10, marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 500 }}>Procedimento</p>
            <p className="budget-procedure-name">{budget.surgeryType}</p>
          </div>
        </div>

        {/* Direita: O Orçamento (que será impresso) */}
        <div className="budget-right-panel">
          
          {/* ═══ Header para impressão (Letterhead Premium) ═══ */}
          <div className="show-on-print print-header">
            <div className="print-header-left">
              <img src="/logo.png" alt="Logo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <h1>Proposta Cirúrgica</h1>
              <p className="print-header-subtitle">
                Elaborada com exclusividade para você
              </p>
            </div>
            
            <div className="print-meta">
              <div className="print-meta-item">
                <span className="print-meta-label">Paciente</span>
                <span className="print-meta-value">{budget.patientName}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-meta-label">Procedimento</span>
                <span className="print-meta-value">{budget.surgeryType}</span>
              </div>
              <div className="print-meta-item">
                <span className="print-meta-label">Data</span>
                <span className="print-meta-value">{new Date(budget.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
            </div>
          </div>

          {/* Barra superior: Data + PDF */}
          <div className="budget-header-bar hide-on-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#666', fontWeight: 500 }} suppressHydrationWarning>
              <Calendar size={18} />
              {new Date(budget.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <button 
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f4f4f5', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 500, fontSize: '0.9rem', border: 'none', cursor: 'pointer', transition: 'background 0.2s', whiteSpace: 'nowrap' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e4e4e7'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f4f4f5'}
            >
              <Download size={16} />
              Baixar PDF
            </button>
          </div>

          {/* Conteúdo principal */}
          <div className="print-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="print-costs-section">
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Detalhamento dos Custos</h3>
              
              {/* Equipe Médica (destaque) */}
              <div className="budget-cost-row budget-team-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', background: '#0f172a', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>Equipe Médica</span>
                  <span className="budget-cost-name">{budget.surgeryType}</span>
                </div>
                <span className="budget-cost-value">{formatBRL(budget.basePrice)}</span>
              </div>

              {/* Demais custos (hospital, anestesia, etc.) */}
              {variables.map((v: any, idx: number) => (
                <div key={idx} className="budget-cost-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    <span className="budget-cost-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  </div>
                  <span className="budget-cost-value">{formatBRL(v.price)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="print-total-box" style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '1rem', marginTop: '1rem' }}>
              <p className="print-total-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Valor Total Estimado</p>
              {budget.discount > 0 && (
                <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#10b981', marginBottom: '0.5rem' }}>
                  Desconto Especial: - {formatBRL(budget.discount)}
                </p>
              )}
              <p className="budget-total-value">
                {formatBRL(budget.totalPrice)}
              </p>
              <p className="print-validity" style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '1.25rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                Os valores referentes a custos hospitalares e anestésicos representam uma estimativa baseada nas tabelas vigentes na data desta proposta, podendo sofrer ajustes conforme atualização das instituições parceiras. Validade desta proposta: 30 dias.
              </p>
            </div>

            {/* Condições de Pagamento */}
            <div className="print-payment-box budget-payment-box" style={{ marginTop: '1.5rem', padding: '1.75rem', borderRadius: '1rem', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)' }}>
              <div className="print-payment-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>💳</div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Condições de Pagamento</h3>
              </div>
              
              <div className="print-payment-items budget-payment-items" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.88rem', color: '#475569', lineHeight: 1.65 }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span className="bullet-dot" style={{ color: '#10b981', fontWeight: 600, flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>●</span>
                  <p style={{ margin: 0 }}>O pagamento da equipe médica pode ser realizado em <strong style={{ color: '#0f172a' }}>dinheiro</strong>, <strong style={{ color: '#0f172a' }}>PIX</strong>, ou em cartões de <strong style={{ color: '#0f172a' }}>débito e crédito em até 18×</strong> <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(acrescido das taxas vigentes)</span>.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span className="bullet-dot" style={{ color: '#10b981', fontWeight: 600, flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>●</span>
                  <p style={{ margin: 0 }}>Podem ser utilizados <strong style={{ color: '#0f172a' }}>múltiplos cartões</strong> para compor o pagamento.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span className="bullet-dot" style={{ color: '#10b981', fontWeight: 600, flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>●</span>
                  <p style={{ margin: 0 }}>Existe a possibilidade de <strong style={{ color: '#0f172a' }}>pagamentos parcelados mensais</strong> antes da cirurgia <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(a combinar)</span>.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <span className="bullet-dot" style={{ color: '#10b981', fontWeight: 600, flexShrink: 0, marginTop: '2px', fontSize: '0.7rem' }}>●</span>
                  <p style={{ margin: 0 }}>Aceitamos alguns <strong style={{ color: '#0f172a' }}>consórcios</strong> <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(consultar disponibilidade)</span>.</p>
                </div>
              </div>

              <div className="print-payment-footer" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                  Quaisquer dúvidas ou personalizações de pagamento, não hesite em nos contatar.
                </p>
              </div>
            </div>
          </div>

          {/* ═══ Ação do paciente / contato (oculto na impressão) ═══ */}
          <div className="hide-on-print" style={{ marginTop: '1.75rem' }}>
            {status === 'APROVADO' ? (
              <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: '#059669', marginBottom: '0.35rem' }}>✅ Proposta aceita!</p>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>Nossa equipe entrará em contato para os próximos passos.</p>
                <a href={waLink(`Olá! Já aceitei a proposta de ${budget.surgeryType} e gostaria de dar continuidade.`)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#25D366', color: 'white', padding: '0.8rem 1.6rem', borderRadius: '50px', fontWeight: 600, textDecoration: 'none' }}>
                  💬 Falar com a equipe
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem', justifyContent: 'center' }}>
                <button onClick={handleAccept} disabled={saving} style={{ flex: '1 1 200px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: '1rem 1.5rem', borderRadius: '50px', fontWeight: 600, fontSize: '1rem', border: 'none', cursor: saving ? 'wait' : 'pointer' }}>
                  {saving ? 'Processando…' : '✅ Quero prosseguir'}
                </button>
                <a href={waLink(`Olá! Tenho dúvidas sobre a proposta de ${budget.surgeryType}.`)} target="_blank" rel="noopener noreferrer" style={{ flex: '1 1 200px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(37,211,102,0.12)', color: '#059669', padding: '1rem 1.5rem', borderRadius: '50px', fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(37,211,102,0.35)' }}>
                  💬 Falar com a equipe
                </a>
              </div>
            )}
          </div>

          {/* Rodapé impressão */}
          <div className="show-on-print print-doc-footer" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#999' }} suppressHydrationWarning>Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}.</p>
          </div>
        </div>
      </div>
    </>
  );
}
