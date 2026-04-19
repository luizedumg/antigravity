'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uploadTemplateDocx } from '@/actions/upload';
import { getApiKeyStatus, saveApiKey, deleteApiKey } from '@/actions/apikeys';
import Link from 'next/link';

type KeyStatus = Record<string, { exists: boolean; masked: string }>;

export default function NovoTemplate() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-3.1-pro');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({});
  const [usingSavedKey, setUsingSavedKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const router = useRouter();

  // Modelos REAIS disponíveis em cada provedor (abril 2026)
  const modelsByProvider: Record<string, string[]> = {
    gemini: [
      'gemini-3.1-pro',           // Flagship — raciocínio avançado
      'gemini-3-flash',           // Alta velocidade
      'gemini-2.5-pro',           // Muito capaz
      'gemini-2.5-flash',         // Rápido e econômico
      'gemini-2.0-flash',         // Legado
      'gemini-1.5-pro',           // Estável
    ],
    openai: [
      'gpt-5.4',                  // Flagship
      'gpt-5.4-mini',             // Compacto e rápido
      'gpt-5.4-nano',             // Ultra-rápido, alto volume
      'o3-pro',                   // Raciocínio profundo
      'gpt-4o',                   // Legado (ainda ativo na API)
      'gpt-4-turbo',              // Legado
    ],
    claude: [
      'claude-opus-4-7',          // Mais capaz (agentic)
      'claude-sonnet-4-6',        // Equilíbrio velocidade/inteligência
      'claude-haiku-4-5-20251001',// Rápido e econômico
      'claude-sonnet-4-20250514', // Sonnet 4 original
      'claude-3-5-sonnet-20241022', // Legado (estável)
      'claude-3-haiku-20240307',  // Legado (mais barato)
    ]
  };

  // Carregar status das chaves salvas
  useEffect(() => {
    getApiKeyStatus().then(status => {
      setKeyStatus(status);
      // Se o provedor atual já tem chave salva, marcar como usando salva
      if (status[aiProvider]?.exists) {
        setUsingSavedKey(true);
      }
    });
  }, []);

  const handleProviderChange = (prov: string) => {
    setAiProvider(prov);
    setAiModel(modelsByProvider[prov][0]);
    setApiKey('');
    setUsingSavedKey(keyStatus[prov]?.exists || false);
  };

  const handleSaveKey = async () => {
    if (!apiKey) return;
    setSavingKey(true);
    await saveApiKey(aiProvider, apiKey);
    const newStatus = await getApiKeyStatus();
    setKeyStatus(newStatus);
    setApiKey('');
    setUsingSavedKey(true);
    setSavingKey(false);
  };

  const handleDeleteKey = async () => {
    if (!confirm(`Tem certeza que deseja excluir a chave ${aiProvider.toUpperCase()}? Será necessário inserir uma nova.`)) return;
    await deleteApiKey(aiProvider);
    const newStatus = await getApiKeyStatus();
    setKeyStatus(newStatus);
    setUsingSavedKey(false);
  };

  const handleCreate = async () => {
    if (!name || !file) {
      return alert("Preencha o nome da cirurgia e anexe o arquivo .docx");
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('file', file);
      
      if (apiKey) {
        // Usando chave digitada agora
        formData.append('apiKey', apiKey);
        formData.append('aiProvider', aiProvider);
        formData.append('aiModel', aiModel);
      } else if (usingSavedKey && keyStatus[aiProvider]?.exists) {
        // Usando chave salva — enviar flag para o servidor buscar do banco
        formData.append('useSavedKey', 'true');
        formData.append('aiProvider', aiProvider);
        formData.append('aiModel', aiModel);
      }

      const res = await uploadTemplateDocx(formData);
      
      alert(`Modelo cadastrado com sucesso! Encontramos ${res.customTagsFound} chaves dinâmicas no documento.`);
      router.push('/admin/templates');
    } catch (err: any) {
      alert("Erro ao enviar o documento: " + err.message);
      setLoading(false);
    }
  };

  const providerLabel: Record<string, string> = {
    gemini: 'Google', openai: 'OpenAI', claude: 'Anthropic'
  };

  return (
    <main className="container">
      <div className="glass-panel" style={{ marginTop: '5vh', position: 'relative' }}>

        {/* Botão de Ajuda */}
        <button
          onClick={() => setShowHelp(true)}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            width: '44px', height: '44px', borderRadius: '50%',
            border: '2px solid var(--primary)', background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--primary)', fontSize: '1.4rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease', zIndex: 5
          }}
          title="Como configurar o arquivo .docx"
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--primary)'; (e.target as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(37, 99, 235, 0.1)'; (e.target as HTMLElement).style.color = 'var(--primary)'; }}
        >
          ?
        </button>

        <h1 style={{ color: 'var(--primary)' }}>Novo Modelo de Cirurgia Inteligente</h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Faça o upload do seu contrato modelo em .docx. O sistema lerá as <b>{"{{chaves}}"}</b> inseridas nele e construirá as perguntas do paciente sozinho.</p>

        <div className="form-group">
          <label className="label">Nome do Modelo de Cirurgia (ex: Rinoplastia)</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Cirurgia" />
        </div>
        
        <div className="form-group" style={{ 
            border: '2px dashed var(--primary)', padding: '2rem', borderRadius: '12px', 
            textAlign: 'center', background: 'rgba(37, 99, 235, 0.05)',
            marginTop: '2rem', marginBottom: '2rem'
          }}>
          <label className="label" style={{ marginBottom: '1rem', display: 'block', fontSize: '1.2rem' }}>
            Arquivo Word Base (.docx)
          </label>
          <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} 
            style={{ width: '100%', maxWidth: '300px', cursor: 'pointer' }} />
          {file && <p style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>Arquivo anexado: {file.name}</p>}
        </div>

        {/* ══════ INTEGRAÇÃO COM IA ══════ */}
        <div className="form-group glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.4)' }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✨ Integração com Inteligência Artificial (Opcional)
          </label>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1.5rem' }}>
            Se você preencher ou usar uma chave salva, as tags brutas do seu DOCX virarão perguntas inteligentes para o paciente.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Provedor de IA</label>
              <select className="input-field" value={aiProvider} onChange={e => handleProviderChange(e.target.value)}>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="claude">Anthropic (Claude)</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Modelo Específico</label>
              <select className="input-field" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                {modelsByProvider[aiProvider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* API Key Management */}
          <label className="label" style={{ fontSize: '0.85rem' }}>Chave API (API Key)</label>
          
          {usingSavedKey && keyStatus[aiProvider]?.exists ? (
            // Chave salva — mostrar mascarada
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                className="input-field" 
                readOnly
                value={keyStatus[aiProvider].masked}
                style={{ flex: 1, opacity: 0.7, letterSpacing: '0.05em' }}
              />
              <button 
                onClick={handleDeleteKey}
                style={{
                  padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap'
                }}
              >
                🗑️ Excluir
              </button>
              <button 
                onClick={() => { setUsingSavedKey(false); setApiKey(''); }}
                style={{
                  padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.4)',
                  background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text)', cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap'
                }}
              >
                ✏️ Trocar
              </button>
            </div>
          ) : (
            // Inserir nova chave
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input 
                  className="input-field" 
                  type="password"
                  value={apiKey} 
                  onChange={e => setApiKey(e.target.value)} 
                  placeholder={`Cole aqui a chave API da ${providerLabel[aiProvider]}`}
                  style={{ flex: 1 }}
                />
                {apiKey && (
                  <button
                    onClick={handleSaveKey}
                    disabled={savingKey}
                    style={{
                      padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap'
                    }}
                  >
                    {savingKey ? '⏳' : '💾 Salvar'}
                  </button>
                )}
              </div>
              {keyStatus[aiProvider]?.exists && (
                <button
                  onClick={() => setUsingSavedKey(true)}
                  style={{
                    marginTop: '0.5rem', background: 'none', border: 'none',
                    color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem',
                    textDecoration: 'underline'
                  }}
                >
                  ← Usar chave salva
                </button>
              )}
            </div>
          )}
          
          {/* Indicadores de chaves salvas */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {['gemini', 'openai', 'claude'].map(prov => (
              <span key={prov} style={{
                padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500,
                background: keyStatus[prov]?.exists ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                color: keyStatus[prov]?.exists ? '#10b981' : 'rgba(148, 163, 184, 0.6)',
                border: `1px solid ${keyStatus[prov]?.exists ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`
              }}>
                {keyStatus[prov]?.exists ? '✓' : '○'} {prov.charAt(0).toUpperCase() + prov.slice(1)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
          <button onClick={handleCreate} disabled={loading} className="btn-primary" style={{ flex: 1 }}>
            {loading ? 'Lendo Arquivo e Usando IA...' : 'Analisar e Salvar Modelo'}
          </button>
          <Link href="/admin/templates" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </div>

      {/* ═══════ MODAL DE AJUDA ═══════ */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: '16px',
              maxWidth: '750px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
              padding: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>📋 Guia de Configuração do Template .docx</h2>
              <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.8rem', cursor: 'pointer', padding: '0.25rem' }}>✕</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>1️⃣ Campos Dinâmicos (Dados do Paciente)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Insira palavras-chave entre <strong>chaves duplas</strong> em qualquer lugar do corpo do contrato.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#8b5cf6' }}>{"{{nome_completo}}"}</span> — Nome completo do paciente<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{cpf}}"}</span> — CPF do paciente<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{data_nascimento}}"}</span> — Data de nascimento<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{alergias}}"}</span> — Campo de texto livre<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{uso_imagem}}"}</span> — Campos com &quot;imagem&quot; viram Sim/Não
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                💡 <strong>Dica:</strong> Use nomes descritivos em snake_case. A IA transforma nomes como <code>cirurgias_nasais_anteriores</code> em perguntas elegantes automaticamente.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>2️⃣ Campos de Assinatura (Corpo do Documento)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Insira os marcadores de assinatura com <strong>chaves triplas</strong> no local exato onde as assinaturas devem aparecer.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#10b981' }}>{"{{{assinatura_paciente}}}"}</span> — Assinatura do paciente<br/>
                <span style={{ color: '#10b981' }}>{"{{{assinatura_dr}}}"}</span> — Assinatura do médico<br/>
                <span style={{ color: '#f59e0b' }}>{"{{{assinatura_responsavel}}}"}</span> — Responsável legal <em>(menores)</em>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>3️⃣ Rubricas no Rodapé (Todas as Páginas)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Insira os marcadores de rubrica no <strong>Rodapé (Footer)</strong> do Word.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#10b981' }}>{"{{{rubrica_paciente}}}"}</span> — Rubrica do paciente<br/>
                <span style={{ color: '#10b981' }}>{"{{{rubrica_dr}}}"}</span> — Rubrica do médico<br/>
                <span style={{ color: '#f59e0b' }}>{"{{{rubrica_responsavel}}}"}</span> — Rubrica do responsável
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                📌 <strong>Como fazer no Word:</strong> Vá em <em>Inserir → Rodapé</em> e digite os marcadores de rubrica.
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>4️⃣ Contratos com Menor de Idade</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7 }}>
                Basta incluir os campos <code style={{ background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{"{{{assinatura_responsavel}}}"}</code> e <code style={{ background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{"{{{rubrica_responsavel}}}"}</code>. O sistema detecta automaticamente e adiciona o terceiro signatário.
              </p>
            </div>

            <button onClick={() => setShowHelp(false)} className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
              Entendi, vou configurar meu template!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
