'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getTemplates, deleteTemplate } from '@/actions/templates';

type Template = {
  id: string;
  name: string;
  baseFilename: string | null;
  questionsJson: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data as Template[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmado = window.confirm('Tem certeza que deseja excluir este modelo? Contratos existentes que usam este modelo podem ser afetados.');
    if (!confirmado) return;
    setDeletingId(id);
    await deleteTemplate(id);
    await loadTemplates();
    setDeletingId(null);
  };

  const parseQuestions = (json: string) => {
    try {
      return JSON.parse(json) as Array<{ key: string; label: string; type: string }>;
    } catch {
      return [];
    }
  };

  return (
    <main className="container">
      <div className="glass-panel animate-fade-in" style={{ marginTop: '5vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ color: 'var(--primary)', margin: 0 }}>Modelos de Cirurgia</h1>
          <Link href="/admin/templates/novo" className="btn-primary">
            + Criar Novo Modelo
          </Link>
        </div>

        {loading && (
          <p style={{ opacity: 0.7, textAlign: 'center', padding: '2rem' }} className="animate-pulse">Carregando modelos...</p>
        )}

        {!loading && templates.length === 0 && (
          <p style={{ opacity: 0.7 }}>Nenhum template cadastrado ainda.</p>
        )}

        {!loading && templates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {templates.map(t => {
              const questions = parseQuestions(t.questionsJson);
              const isExpanded = expandedId === t.id;
              
              return (
                <div key={t.id} className="glass-panel template-card">
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{t.name}</strong>
                      <span className="question-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                        {questions.length} pergunta(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', minHeight: 'auto' }}
                      >
                        {isExpanded ? '▲ Fechar' : '▼ Ver Perguntas'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', minHeight: 'auto' }}
                      >
                        {deletingId === t.id ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </div>

                  {/* File info */}
                  <p style={{ fontSize: '0.82rem', opacity: 0.6, margin: 0 }}>
                    📎 Arquivo base: {t.baseFilename || 'Nenhum'}
                  </p>

                  {/* Expandable questions preview */}
                  <div className={`template-questions ${isExpanded ? 'expanded' : 'collapsed'}`}>
                    {isExpanded && (
                      <div style={{ marginTop: '0.75rem', padding: '1rem', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.1)', maxHeight: '400px', overflowY: 'auto' }}>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.75rem', fontWeight: 500 }}>
                          Campos dinâmicos extraídos do documento:
                        </p>
                        {questions.length === 0 ? (
                          <p style={{ opacity: 0.5, fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma pergunta dinâmica.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {questions.map((q, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                                <span className={`question-tag ${q.type === 'boolean' ? 'question-tag--boolean' : ''}`}>
                                  {q.type === 'boolean' ? 'Sim/Não' : 'Texto'}
                                </span>
                                <span>{q.label}</span>
                                <span style={{ opacity: 0.4, fontSize: '0.75rem', fontFamily: 'monospace' }}>({q.key})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          <Link href="/" className="btn-secondary">
            Voltar ao Início
          </Link>
        </div>
      </div>
    </main>
  );
}
