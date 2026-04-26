"use client";

import { useState } from "react";
import { createBudget, sendBudgetToN8N } from "@/actions/budgets";
import { Loader2, Calculator, Send, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import WhatsAppInput from "./WhatsAppInput";

export default function BudgetGenerator({ templates, globalVariables, cloneBudget }: { templates: any[], globalVariables: any[], cloneBudget?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [patientName, setPatientName] = useState(cloneBudget?.patientName || "");
  const [patientWhatsApp, setPatientWhatsApp] = useState(cloneBudget?.patientWhatsApp || "");
  const [patientEmail, setPatientEmail] = useState(cloneBudget?.patientEmail || "");
  const [patientCpf, setPatientCpf] = useState(cloneBudget?.patientCpf || "");
  
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    if (cloneBudget) {
      const t = templates.find((t: any) => t.name === cloneBudget.surgeryType);
      if (t) return t.id;
    }
    return "";
  });

  const [selectedVariables, setSelectedVariables] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    if (cloneBudget) {
      try {
        const clonedVars = JSON.parse(cloneBudget.variablesSelectedJson || "[]");
        clonedVars.forEach((cv: any) => {
          const matched = globalVariables.find(gv => gv.name === cv.name);
          if (matched) defaults[matched.id] = true;
        });
        return defaults;
      } catch (e) {}
    }
    globalVariables.forEach(v => {
      if (v.isDefault) defaults[v.id] = true;
    });
    return defaults;
  });
  const [discountStr, setDiscountStr] = useState(cloneBudget?.discount?.toString() || "");

  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const discount = parseFloat(discountStr) || 0;

  // Categorias que só permitem uma única seleção (comportamento de radio button)
  const singleSelectCategories = ["Hospitais", "Anestesista"];

  const handleToggleVariable = (varId: string) => {
    const variable = globalVariables.find((v: any) => v.id === varId);
    
    if (variable && singleSelectCategories.includes(variable.category)) {
      // Categoria de seleção única: desmarcar todas da mesma categoria e marcar a nova
      const sameCategoryIds = globalVariables
        .filter((v: any) => v.category === variable.category)
        .map((v: any) => v.id);

      setSelectedVariables(prev => {
        const next = { ...prev };
        // Desmarcar todas da mesma categoria
        sameCategoryIds.forEach(id => { next[id] = false; });
        // Se a variável clicada já estava selecionada, apenas desmarca (toggle off)
        // Se não estava, marca ela
        if (!prev[varId]) {
          next[varId] = true;
        }
        return next;
      });
    } else {
      // Categorias multi-seleção: toggle normal
      setSelectedVariables(prev => ({ ...prev, [varId]: !prev[varId] }));
    }
  };

  const calculateTotal = () => {
    if (!activeTemplate) return 0;
    let total = activeTemplate.basePrice;
    globalVariables.forEach((v: any) => {
      if (selectedVariables[v.id]) total += v.price;
    });
    return Math.max(0, total - discount);
  };

  const handleGenerate = async () => {
    if (!patientName || !selectedTemplateId) {
      alert("Por favor, preencha o nome do paciente e selecione um modelo.");
      return;
    }

    setLoading(true);
    const selectedVarsList = globalVariables.filter((v: any) => selectedVariables[v.id]);

    const res = await createBudget({
      patientName,
      patientWhatsApp,
      patientEmail,
      patientCpf,
      surgeryType: activeTemplate.name,
      basePrice: activeTemplate.basePrice,
      discount,
      totalPrice: calculateTotal(),
      variablesSelectedJson: JSON.stringify(selectedVarsList),
    });

    if (res.success && res.data) {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (webhookUrl) {
         await sendBudgetToN8N(res.data.id, webhookUrl);
      }
      setSuccess(true);
      setTimeout(() => router.push("/admin/orcamentos"), 2000);
    } else {
      alert("Erro ao gerar orçamento: " + res.error);
      setLoading(false);
    }
  };

  // Agrupar variáveis por categoria para renderizar o checklist
  const groupedVars = globalVariables.reduce((acc: any, v: any) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const categories = ["Hospitais", "Anestesista", "Cirurgias Complementares", "Exames", "Outros"];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
      
      {/* Formulário Esquerdo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel">
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Dados do Paciente</h2>
          
          <div className="form-group">
            <label className="label">Nome Completo</label>
            <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} className="input-field" placeholder="Ex: Maria Silva" />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="label">WhatsApp</label>
              <WhatsAppInput value={patientWhatsApp} onChange={setPatientWhatsApp} />
            </div>
            <div className="form-group">
              <label className="label">E-mail (Opcional)</label>
              <input type="email" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} className="input-field" placeholder="maria@email.com" />
            </div>
          </div>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>Configuração da Cirurgia</h2>
          
          <div className="form-group">
            <label className="label">Procedimento Base</label>
            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="input-field">
              <option value="">Selecione um procedimento...</option>
              {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name} - R$ {t.basePrice.toLocaleString('pt-BR')}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="label">Desconto (Opcional - R$)</label>
            <input type="number" value={discountStr} onChange={e => setDiscountStr(e.target.value)} className="input-field" placeholder="0" />
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.3rem' }}>Valor a ser abatido no total do orçamento.</p>
          </div>

          {categories.map(category => {
            if (!groupedVars[category]) return null;
            return (
              <div key={category} style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
                  {category}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {groupedVars[category].map((v: any) => (
                    <label key={v.id} onClick={() => handleToggleVariable(v.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '8px', cursor: 'pointer', background: selectedVariables[v.id] ? 'rgba(37,99,235,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: selectedVariables[v.id] ? 'none' : '1px solid #ccc', background: selectedVariables[v.id] ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedVariables[v.id] && <Check size={14} color="white" />}
                        </div>
                        <span style={{ fontWeight: 500 }}>{v.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, opacity: 0.8 }}>+ R$ {v.price.toLocaleString('pt-BR')}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recibo Premium Direito */}
      <div>
        <div style={{ background: 'var(--foreground)', color: 'var(--background)', padding: '2.5rem', borderRadius: 'var(--border-radius)', position: 'sticky', top: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 500 }}>Resumo do Orçamento</h3>
            <Calculator opacity={0.5} />
          </div>

          {!activeTemplate ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px' }}>
              Selecione um procedimento para ver o resumo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.3rem' }}>Honorário Cirúrgico (Base)</p>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 500 }}>{activeTemplate.name}</h4>
                </div>
                <span style={{ fontSize: '1.2rem' }}>R$ {activeTemplate.basePrice.toLocaleString('pt-BR')}</span>
              </div>

              {globalVariables.some((v: any) => selectedVariables[v.id]) && (
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.8rem' }}>Adicionais Inclusos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {categories.map(category => {
                      if (!groupedVars[category]) return null;
                      const activeInCategory = groupedVars[category].filter((v: any) => selectedVariables[v.id]);
                      if (activeInCategory.length === 0) return null;
                      
                      return (
                        <div key={category} style={{ marginBottom: '0.5rem' }}>
                          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{category}</p>
                          {activeInCategory.map((v: any) => (
                            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, fontSize: '0.95rem' }}>
                              <span>{v.name}</span>
                              <span>R$ {v.price.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', color: '#10b981' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>Desconto Aplicado</span>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>- R$ {discount.toLocaleString('pt-BR')}</span>
                </div>
              )}

              <div style={{ paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.5rem' }}>Valor Total Estimado</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 300, background: 'linear-gradient(45deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  R$ {calculateTotal().toLocaleString('pt-BR')}
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || success}
                style={{
                  width: '100%', marginTop: '2rem', padding: '1.25rem', borderRadius: '8px', border: 'none', 
                  background: success ? 'var(--success)' : 'var(--primary)', color: 'white', 
                  fontSize: '1.1rem', fontWeight: 500, cursor: (loading || success) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.3s'
                }}
              >
                {loading ? <Loader2 className="animate-spin" /> : success ? <>Orçamento Gerado! <Check /></> : <>Gerar e Enviar <Send size={20} /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
