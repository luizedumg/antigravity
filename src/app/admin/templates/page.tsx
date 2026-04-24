'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
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

  // PIN modal state
  const [pinModalTarget, setPinModalTarget] = useState<string | null>(null); // template id to delete
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data as Template[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Focus PIN input when modal opens
  useEffect(() => {
    if (pinModalTarget && pinInputRef.current) {
      pinInputRef.current.focus();
    }
  }, [pinModalTarget]);

  const openPinModal = (id: string) => {
    setPinModalTarget(id);
    setPinInput('');
    setPinError(false);
  };

  const closePinModal = () => {
    setPinModalTarget(null);
    setPinInput('');
    setPinError(false);
    setPinLoading(false);
  };

  const handlePinSubmit = async () => {
    if (!pinModalTarget || !pinInput) return;

    setPinLoading(true);
    setPinError(false);

    try {
      setDeletingId(pinModalTarget);
      await deleteTemplate(pinModalTarget, pinInput);
      closePinModal();
      await loadTemplates();
    } catch {
      setPinError(true);
      setPinLoading(false);
      setDeletingId(null);
      setPinInput('');
      // Re-focus input after error
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit();
    } else if (e.key === 'Escape') {
      closePinModal();
    }
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
                        onClick={() => openPinModal(t.id)}
                        disabled={deletingId === t.id}
                        className="btn-danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', minHeight: 'auto' }}
                      >
                        {deletingId === t.id ? '...' : '🔒 Excluir'}
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

      {/* ═══════ MODAL DE SENHA PARA EXCLUSÃO ═══════ */}
      {pinModalTarget && (
        <div
          onClick={closePinModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-fade-in"
            style={{
              background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
              borderRadius: '16px', maxWidth: '420px', width: '100%',
              padding: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--glass-border)', color: 'var(--foreground)',
              textAlign: 'center'
            }}
          >
            {/* Lock icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)', border: '2px solid rgba(239, 68, 68, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem', fontSize: '1.8rem'
            }}>
              🔒
            </div>

            <h2 style={{ color: 'var(--danger)', margin: '0 0 0.5rem', fontSize: '1.3rem' }}>
              Exclusão Protegida
            </h2>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Para excluir o modelo <strong>&quot;{templates.find(t => t.id === pinModalTarget)?.name}&quot;</strong>, 
              digite a senha de administrador.
            </p>

            <div style={{ position: 'relative' }}>
              <input
                ref={pinInputRef}
                type="password"
                className="input-field"
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(false); }}
                onKeyDown={handlePinKeyDown}
                placeholder="Digite a senha..."
                maxLength={10}
                style={{
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  letterSpacing: '0.3em',
                  fontWeight: 600,
                  borderColor: pinError ? 'var(--danger)' : undefined,
                  animation: pinError ? 'shake 0.4s ease' : undefined,
                }}
              />
            </div>

            {pinError && (
              <p style={{
                color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.75rem',
                fontWeight: 500, animation: 'fadeIn 0.3s ease'
              }}>
                ❌ Senha incorreta. Tente novamente.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={closePinModal}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={!pinInput || pinLoading}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {pinLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
