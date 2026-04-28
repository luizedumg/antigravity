"use client";

import { Download, CheckCircle2, Calendar } from "lucide-react";

export default function BudgetClientView({ budget }: { budget: any }) {
  const variables = JSON.parse(budget.variablesSelectedJson || "[]");

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* ══════════════════════════════════════════════════
           PRINT — Premium A4 Layout (Single Page)
           ══════════════════════════════════════════════════ */
        @page {
          size: A4 portrait;
          margin: 0; /* Hides default browser headers/footers in many browsers */
        }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm;
            height: 297mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            font-size: 12px !important; /* Base font size for print */
          }

          body::before, body::after { display: none !important; }
          body * { visibility: hidden; }
          .budget-print-container, .budget-print-container * { visibility: visible; }

          .budget-print-container {
            position: absolute;
            left: 0; top: 0;
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .hide-on-print { display: none !important; }
          .show-on-print { display: block !important; }

          .budget-right-panel {
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box;
            margin: 0 !important;
            padding: 15mm 20mm !important; /* Internal margins acting as page margins */
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
          }

          /* ── Premium Letterhead ── */
          .print-header {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            padding-bottom: 1.5rem !important;
            margin-bottom: 2rem !important;
            border-bottom: 1px solid #cbd5e1 !important;
          }
          .print-header-left {
            display: flex !important;
            flex-direction: column !important;
          }
          .print-header img {
            max-height: 45px !important;
            margin-bottom: 0.5rem !important;
          }
          .print-header h1 {
            font-size: 1.2rem !important;
            font-weight: 400 !important;
            letter-spacing: 0.2em !important;
            text-transform: uppercase !important;
            color: #0f172a !important;
            margin: 0 !important;
          }
          .print-header-subtitle {
            font-size: 0.75rem !important;
            color: #64748b !important;
            letter-spacing: 0.05em !important;
            margin-top: 0.2rem !important;
          }
          .print-meta {
            text-align: right !important;
            font-size: 0.8rem !important;
            color: #475569 !important;
            line-height: 1.4 !important;
          }
          .print-meta-item {
            margin-bottom: 0.2rem !important;
          }
          .print-meta-label {
            font-weight: 600 !important;
            color: #0f172a !important;
            margin-right: 0.4rem !important;
          }

          /* ── Cost Details ── */
          .print-content {
            display: flex !important;
            flex-direction: column !important;
            flex: none !important; /* Don't stretch */
          }
          .print-costs-section {
            margin-bottom: 2rem !important;
          }
          .print-costs-section h3 {
            font-size: 0.75rem !important;
            margin-bottom: 0.8rem !important;
            color: #94a3b8 !important;
            letter-spacing: 0.1em !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 0.4rem !important;
          }
          .budget-cost-row {
            padding: 0.5rem 0 !important;
            border-bottom: 1px solid #f8fafc !important;
          }
          .budget-cost-name {
            font-size: 0.85rem !important;
            color: #334155 !important;
          }
          .budget-cost-value {
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            color: #0f172a !important;
          }

          /* ── Total Box (Elegant & Compact) ── */
          .print-total-box {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            padding: 1.2rem 1.5rem !important;
            border-radius: 8px !important;
            margin: 1rem 0 2rem 0 !important;
            background: #f8fafc !important;
            border-left: 4px solid #0f172a !important;
          }
          .print-total-box .print-total-label {
            font-size: 0.7rem !important;
            letter-spacing: 0.1em !important;
            color: #64748b !important;
            margin-bottom: 0.2rem !important;
          }
          .print-total-box .budget-total-value {
            font-size: 2.2rem !important;
            font-weight: 400 !important;
            color: #0f172a !important;
            margin: 0 !important;
          }
          .print-total-box .print-validity {
            font-size: 0.7rem !important;
            color: #94a3b8 !important;
            margin-top: 0.5rem !important;
            text-align: right !important;
          }

          /* ── Payment Section ── */
          .print-payment-box {
            padding: 1.2rem 1.5rem !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
            margin-top: 0 !important; /* Removed auto margin that caused page breaks */
          }
          .print-payment-header {
            margin-bottom: 0.8rem !important;
            gap: 0.5rem !important;
            display: flex !important;
            align-items: center !important;
          }
          .print-payment-header div:first-child {
            width: 22px !important; height: 22px !important;
            border-radius: 4px !important; font-size: 0.7rem !important;
          }
          .print-payment-header h3 {
            font-size: 0.75rem !important;
            letter-spacing: 0.1em !important;
            color: #475569 !important;
            margin: 0 !important;
          }
          .print-payment-items {
            gap: 0.4rem !important;
            font-size: 0.8rem !important;
            color: #334155 !important;
            line-height: 1.4 !important;
          }
          .print-payment-items .bullet-dot {
            font-size: 0.5rem !important;
          }
          .print-payment-footer {
            margin-top: 0.8rem !important;
            padding-top: 0.6rem !important;
            border-top: 1px solid #f1f5f9 !important;
          }
          .print-payment-footer p {
            font-size: 0.7rem !important;
            color: #94a3b8 !important;
            margin: 0 !important;
          }

          /* ── Footer ── */
          .print-doc-footer {
            margin-top: auto !important; /* Pushes footer to bottom of 297mm container */
            padding-top: 1rem !important;
            border-top: 1px solid #f1f5f9 !important;
            text-align: center !important;
          }
          .print-doc-footer p { 
            font-size: 0.65rem !important; 
            color: #cbd5e1 !important; 
            margin: 0 !important;
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
          font-size: 3.5rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          color: #0f172a;
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
            font-size: 2.25rem;
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
            font-size: 2rem;
          }

          .budget-payment-box {
            padding: 1rem 0.75rem !important;
          }
          .budget-payment-items {
            font-size: 0.78rem !important;
          }
        }
      `}} />

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
              
              {/* Cirurgia base */}
              <div className="budget-cost-row">
                <span className="budget-cost-name" style={{ fontWeight: 500, color: '#333' }}>{budget.surgeryType}</span>
                <span className="budget-cost-value">R$ {budget.basePrice.toLocaleString('pt-BR')}</span>
              </div>

              {/* Variáveis */}
              {variables.map((v: any, idx: number) => (
                <div key={idx} className="budget-cost-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    <span className="budget-cost-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  </div>
                  <span className="budget-cost-value">R$ {v.price.toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="print-total-box" style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '1rem', marginTop: '1rem' }}>
              <p className="print-total-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Valor Total Estimado</p>
              {budget.discount > 0 && (
                <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#10b981', marginBottom: '0.5rem' }}>
                  Desconto Especial: - R$ {budget.discount.toLocaleString('pt-BR')}
                </p>
              )}
              <p className="budget-total-value">
                R$ {budget.totalPrice.toLocaleString('pt-BR')}
              </p>
              <p className="print-validity" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1.25rem', lineHeight: 1.6 }}>
                * Valores sujeitos a alteração caso haja necessidade de avaliação hospitalar adicional. Validade desta proposta: 30 dias.
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

          {/* Rodapé impressão */}
          <div className="show-on-print print-doc-footer" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#999' }} suppressHydrationWarning>Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}.</p>
          </div>
        </div>
      </div>
    </>
  );
}
