"use client";

import { Download, CheckCircle2, Calendar } from "lucide-react";

export default function BudgetClientView({ budget }: { budget: any }) {
  const variables = JSON.parse(budget.variablesSelectedJson || "[]");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="budget-print-container" style={{
      background: '#0a0a0a',
      borderRadius: '2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      fontFamily: 'var(--font-base, sans-serif)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      
      {/* Imprimir Estilos Específicos para esconder a lateral esquerda no PDF */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .budget-print-container, .budget-print-container * { visibility: visible; }
          .budget-print-container { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border-radius: 0; background: transparent !important; border: none !important; }
          .hide-on-print { display: none !important; }
          .show-on-print { display: block !important; }
          .print-full-width { width: auto !important; padding: 2.5rem 3rem !important; margin: 0.5rem 1rem !important; border: 2px solid #111 !important; border-radius: 1.5rem !important; }
        }
        .show-on-print { display: none; }
      `}} />

      {/* Esquerda: Mensagem de Boas vindas (Branding) */}
      <div className="hide-on-print" style={{
        background: '#0a0a0a',
        color: 'white',
        padding: '3rem',
        flex: '1 1 350px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(50px)', transform: 'translate(30%, -30%)' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '400px', height: '400px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '50%', filter: 'blur(60px)', transform: 'translate(-30%, 30%)' }}></div>
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ maxHeight: '60px', marginBottom: '3rem', filter: 'brightness(0) invert(1)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          
          <h1 style={{ fontSize: '2.5rem', fontWeight: 300, lineHeight: 1.2, marginBottom: '1.5rem' }}>
            Proposta<br/>Cirúrgica
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.6 }}>
            Olá, <span style={{ color: 'white', fontWeight: 500 }}>{budget.patientName}</span>.<br/>
            Este é o seu orçamento personalizado, elaborado com exclusividade e os mais altos padrões médicos.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 10, marginTop: '3rem', paddingTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', fontWeight: 500 }}>Procedimento</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 300, color: 'rgba(255,255,255,0.9)' }}>{budget.surgeryType}</p>
        </div>
      </div>

      {/* Direita: O Orçamento (que será impresso) */}
      <div className="print-full-width" style={{
        padding: '5rem',
        flex: '2 1 500px',
        background: 'white',
        position: 'relative',
        boxShadow: '-20px 0 50px rgba(0,0,0,0.5)',
        zIndex: 20,
        border: '3px solid #111',
        borderRadius: '2rem',
        margin: '1.5rem',
      }}>
        
        <div className="show-on-print" style={{ marginBottom: '2.5rem', borderBottom: '1px solid #eee', paddingBottom: '1.5rem', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <img src="/logo.png" alt="Logo" style={{ maxHeight: '50px', marginBottom: '1.5rem', filter: 'brightness(0)' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000' }}>Proposta Cirúrgica</h1>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: '#555' }}>
            <p><strong>Paciente:</strong> {budget.patientName}</p>
            <p><strong>Procedimento:</strong> {budget.surgeryType}</p>
            <p><strong>Data de Emissão:</strong> {new Date(budget.createdAt).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#666', fontWeight: 500 }} suppressHydrationWarning>
            <Calendar size={18} />
            {new Date(budget.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <button 
            onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f4f4f5', color: '#000', padding: '0.6rem 1.2rem', borderRadius: '50px', fontWeight: 500, fontSize: '0.9rem', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e4e4e7'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f4f4f5'}
          >
            <Download size={16} />
            Baixar PDF
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Detalhamento dos Custos</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f4f4f5' }}>
              <span style={{ fontSize: '1rem', fontWeight: 500, color: '#333', paddingRight: '1rem' }}>{budget.surgeryType}</span>
              <span style={{ fontSize: '1rem', color: '#555', whiteSpace: 'nowrap', fontWeight: 500 }}>R$ {budget.basePrice.toLocaleString('pt-BR')}</span>
            </div>

            {variables.map((v: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #f4f4f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingRight: '1rem' }}>
                  <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
                  <span style={{ color: '#555', fontSize: '1rem' }}>{v.name}</span>
                </div>
                <span style={{ color: '#555', fontSize: '1rem', whiteSpace: 'nowrap', fontWeight: 500 }}>R$ {v.price.toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '1rem', marginTop: '2rem' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Valor Total Estimado</p>
            {budget.discount > 0 && (
              <p style={{ fontSize: '1rem', fontWeight: 500, color: '#10b981', marginBottom: '0.5rem' }}>
                Desconto Especial: - R$ {budget.discount.toLocaleString('pt-BR')}
              </p>
            )}
            <p style={{ fontSize: '3.5rem', fontWeight: 300, letterSpacing: '-0.02em', color: '#0f172a' }}>
              R$ {budget.totalPrice.toLocaleString('pt-BR')}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1.5rem', lineHeight: 1.6 }}>
              * Valores sujeitos a alteração caso haja necessidade de avaliação hospitalar adicional. Validade desta proposta: 30 dias.
            </p>
          </div>
        </div>

        <div className="show-on-print" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#999' }} suppressHydrationWarning>Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}.</p>
        </div>
      </div>
    </div>
  );
}
