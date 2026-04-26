"use client";

import { useState } from "react";
import { createBudgetTemplate, deleteBudgetTemplate } from "@/actions/budgetTemplates";
import { createBudgetVariable, deleteBudgetVariable } from "@/actions/budgetVariables";
import { Trash2, Plus, Loader2, Stethoscope, Building2, UserPlus } from "lucide-react";

export default function TemplateForm({ templates, globalVariables }: { templates: any[], globalVariables: any[] }) {
  // Estado do Template Base
  const [tplName, setTplName] = useState("");
  const [tplBasePrice, setTplBasePrice] = useState("");
  const [loadingTpl, setLoadingTpl] = useState(false);

  // Estado da Variável Global
  const [varCategory, setVarCategory] = useState("Hospitais");
  const [varName, setVarName] = useState("");
  const [varPrice, setVarPrice] = useState("");
  const [varIsDefault, setVarIsDefault] = useState(false);
  const [loadingVar, setLoadingVar] = useState(false);

  const [error, setError] = useState("");

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingTpl(true);
    setError("");

    if (!tplName.trim()) { setError("O nome do procedimento é obrigatório."); setLoadingTpl(false); return; }

    const res = await createBudgetTemplate({ name: tplName, basePrice: parseFloat(tplBasePrice) || 0, variablesJson: "[]" });

    if (!res.success) setError(res.error || "Erro ao criar modelo.");
    else { setTplName(""); setTplBasePrice(""); }
    
    setLoadingTpl(false);
  };

  const handleCreateVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingVar(true);
    setError("");

    if (!varName.trim()) { setError("O nome do adicional é obrigatório."); setLoadingVar(false); return; }

    const res = await createBudgetVariable({ category: varCategory, name: varName, price: parseFloat(varPrice) || 0, isDefault: varIsDefault });

    if (!res.success) setError(res.error || "Erro ao criar variável.");
    else { setVarName(""); setVarPrice(""); setVarIsDefault(false); }

    setLoadingVar(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este modelo?")) await deleteBudgetTemplate(id);
  };

  const handleDeleteVariable = async (id: string) => {
    if (confirm("Excluir este adicional global?")) await deleteBudgetVariable(id);
  };

  // Agrupar variáveis por categoria
  const groupedVars = globalVariables.reduce((acc: any, v: any) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const categories = ["Hospitais", "Anestesista", "Cirurgias Complementares", "Exames", "Outros"];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
      
      {/* COLUNA 1: MODELOS BASE (Cirurgias) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--primary)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope size={24} color="var(--primary)" /> Novo Procedimento Base
          </h2>
          <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Nome (ex: Rinoplastia)</label>
              <input type="text" value={tplName} onChange={(e) => setTplName(e.target.value)} className="input-field" placeholder="Nome da Cirurgia" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Honorário Base (R$)</label>
              <input type="number" value={tplBasePrice} onChange={(e) => setTplBasePrice(e.target.value)} className="input-field" placeholder="Ex: 15000" />
            </div>
            <button type="submit" disabled={loadingTpl} className="btn-primary" style={{ marginTop: '0.5rem' }}>
              {loadingTpl ? <Loader2 className="animate-spin" size={20} /> : "Salvar Procedimento"}
            </button>
          </form>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', opacity: 0.8 }}>Procedimentos Cadastrados</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {templates.length === 0 && <p style={{ opacity: 0.5 }}>Nenhum procedimento cadastrado ainda.</p>}
            {templates.map((tpl) => (
              <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '12px', background: 'rgba(255,255,255,0.2)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{tpl.name}</h3>
                  <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Honorário: R$ {tpl.basePrice.toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => handleDeleteTemplate(tpl.id)} className="btn-danger" style={{ padding: '0.5rem', minHeight: 'auto' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COLUNA 2: ADICIONAIS GLOBAIS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="glass-panel" style={{ borderTop: '4px solid var(--success)' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} color="var(--success)" /> Novo Adicional Global
          </h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>Itens aqui ficam disponíveis para checklist em qualquer orçamento.</p>
          <form onSubmit={handleCreateVariable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Categoria</label>
              <select value={varCategory} onChange={(e) => setVarCategory(e.target.value)} className="input-field">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Nome (ex: Hospital Albert Einstein)</label>
              <input type="text" value={varName} onChange={(e) => setVarName(e.target.value)} className="input-field" placeholder="Nome do item" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label">Valor (R$)</label>
              <input type="number" value={varPrice} onChange={(e) => setVarPrice(e.target.value)} className="input-field" placeholder="Ex: 5000" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="checkbox" id="isDefault" checked={varIsDefault} onChange={(e) => setVarIsDefault(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="isDefault" style={{ fontSize: '0.9rem', cursor: 'pointer', opacity: 0.8 }}>Marcar por padrão (já virá selecionado)</label>
            </div>
            <button type="submit" disabled={loadingVar} className="btn-success" style={{ marginTop: '0.5rem' }}>
              {loadingVar ? <Loader2 className="animate-spin" size={20} /> : "Salvar Adicional"}
            </button>
          </form>
        </div>

        <div className="glass-panel">
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', opacity: 0.8 }}>Banco de Adicionais</h2>
          {Object.keys(groupedVars).length === 0 && <p style={{ opacity: 0.5 }}>Nenhum adicional cadastrado ainda.</p>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {categories.map(category => {
              if (!groupedVars[category]) return null;
              return (
                <div key={category}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)', marginBottom: '0.8rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.3rem' }}>
                    {category}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {groupedVars[category].map((v: any) => (
                      <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(255,255,255,0.4)' }}>
                        <div>
                          <p style={{ fontWeight: 500, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {v.name}
                            {v.isDefault && <span title="Padrão" style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>★</span>}
                          </p>
                          <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>R$ {v.price.toLocaleString('pt-BR')}</p>
                        </div>
                        <button onClick={() => handleDeleteVariable(v.id)} className="btn-danger" style={{ padding: '0.4rem', minHeight: 'auto', background: 'transparent', color: 'var(--danger)', border: 'none', boxShadow: 'none' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
