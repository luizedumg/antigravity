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
        @media print {
          body * { visibility: hidden; }
          .budget-print-container, .budget-print-container * { visibility: visible; }
          .budget-print-container { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border-radius: 0; background: transparent !important; border: none !important; }
          .hide-on-print { display: none !important; }
          .show-on-print { display: block !important; }
          .budget-right-panel { width: auto !important; padding: 2.5rem 3rem !important; margin: 0.5rem 1rem !important; border: 2px solid #111 !important; border-radius: 1.5rem !important; flex: 1 1 100% !important; }
        }
        .show-on-print { display: none; }

        /* ══════ RESPONSIVE BUDGET VIEW ══════ */
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
              Este é o seu orçamento personalizado, elaborado com exclusividade e os mais altos padrões médicos.
            </p>
          </div>

          <div style={{ position: 'relative', zIndex: 10, marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 500 }}>Procedimento</p>
            <p className="budget-procedure-name">{budget.surgeryType}</p>
          </div>
        </div>

        {/* Direita: O Orçamento (que será impresso) */}
        <div className="budget-right-panel">
          
          {/* Header para impressão */}
          <div className="show-on-print" style={{ marginBottom: '2.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <img src="/logo.png" alt="Logo" style={{ maxHeight: '50px', marginBottom: '1.5rem', filter: 'brightness(0)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000' }}>Proposta Cirúrgica</h1>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#555' }}>
              <p><strong>Paciente:</strong> {budget.patientName}</p>
              <p><strong>Procedimento:</strong> {budget.surgeryType}</p>
              <p><strong>Data de Emissão:</strong> {new Date(budget.createdAt).toLocaleDateString('pt-BR')}</p>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
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
            <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '1rem', marginTop: '1rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Valor Total Estimado</p>
              {budget.discount > 0 && (
                <p style={{ fontSize: '0.95rem', fontWeight: 500, color: '#10b981', marginBottom: '0.5rem' }}>
                  Desconto Especial: - R$ {budget.discount.toLocaleString('pt-BR')}
                </p>
              )}
              <p className="budget-total-value">
                R$ {budget.totalPrice.toLocaleString('pt-BR')}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1.25rem', lineHeight: 1.6 }}>
                * Valores sujeitos a alteração caso haja necessidade de avaliação hospitalar adicional. Validade desta proposta: 30 dias.
              </p>
            </div>
          </div>

          {/* Rodapé impressão */}
          <div className="show-on-print" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
            <p style={{ fontSize: '0.8rem', color: '#999' }} suppressHydrationWarning>Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}.</p>
          </div>
        </div>
      </div>
    </>
  );
}
