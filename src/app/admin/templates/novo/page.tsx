'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadTemplateDocx } from '@/actions/upload';
import Link from 'next/link';

export default function NovoTemplate() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();

  const modelsByProvider = {
    gemini: ['gemini-3.1-pro', 'gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'],
    openai: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    claude: ['claude-4.6-opus', 'claude-4.6-sonnet', 'claude-4.5-haiku', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
  };

  const handleProviderChange = (e: any) => {
    const prov = e.target.value;
    setAiProvider(prov);
    setAiModel(modelsByProvider[prov as keyof typeof modelsByProvider][0]);
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
        formData.append('apiKey', apiKey);
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

  return (
    <main className="container">
      <div className="glass-panel" style={{ marginTop: '5vh', position: 'relative' }}>

        {/* Botão de Ajuda no canto */}
        <button
          onClick={() => setShowHelp(true)}
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '2px solid var(--primary)',
            background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--primary)',
            fontSize: '1.4rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 5
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
            border: '2px dashed var(--primary)', 
            padding: '2rem', 
            borderRadius: '12px', 
            textAlign: 'center', 
            background: 'rgba(37, 99, 235, 0.05)',
            marginTop: '2rem',
            marginBottom: '2rem'
          }}>
          <label className="label" style={{ marginBottom: '1rem', display: 'block', fontSize: '1.2rem' }}>
            Arquivo Word Base (.docx)
          </label>
          <input 
            type="file" 
            accept=".docx" 
            onChange={e => setFile(e.target.files?.[0] || null)} 
            style={{ width: '100%', maxWidth: '300px', cursor: 'pointer' }}
          />
          {file && <p style={{ marginTop: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>Arquivo anexado: {file.name}</p>}
        </div>

        <div className="form-group glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.4)' }}>
          <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ✨ Integração com Inteligência Artificial (Opcional)
          </label>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1.5rem' }}>
            Se você preencher esta chave, as tags brutas do seu DOCX virarão perguntas inteligentes para o paciente.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Provedor de IA (Categoria)</label>
              <select className="input-field" value={aiProvider} onChange={handleProviderChange}>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="claude">Anthropic (Claude)</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.85rem' }}>Modelo Específico</label>
              <select className="input-field" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                {modelsByProvider[aiProvider as keyof typeof modelsByProvider].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="label" style={{ fontSize: '0.85rem' }}>Chave API (API Key)</label>
          <input 
            className="input-field" 
            type="password"
            value={apiKey} 
            onChange={e => setApiKey(e.target.value)} 
            placeholder={`Cole aqui a chave API da ${aiProvider === 'gemini' ? 'Google' : aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}`} 
          />
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
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              borderRadius: '16px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2.5rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem' }}>📋 Guia de Configuração do Template .docx</h2>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.8rem', cursor: 'pointer', padding: '0.25rem' }}
              >✕</button>
            </div>

            {/* Seção 1 */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>1️⃣ Campos Dinâmicos (Dados do Paciente)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Insira palavras-chave entre <strong>chaves duplas</strong> em qualquer lugar do corpo do contrato. Elas serão transformadas em perguntas no formulário do paciente.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#8b5cf6' }}>{"{{nome_completo}}"}</span> — Nome completo do paciente<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{cpf}}"}</span> — CPF do paciente<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{data_nascimento}}"}</span> — Data de nascimento<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{endereco}}"}</span> — Endereço completo<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{alergias}}"}</span> — Campo de texto livre<br/>
                <span style={{ color: '#8b5cf6' }}>{"{{uso_imagem}}"}</span> — Campos com &quot;imagem&quot; viram Sim/Não
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                💡 <strong>Dica:</strong> Use nomes descritivos em snake_case. A IA transforma nomes como <code>cirurgias_nasais_anteriores</code> em perguntas elegantes automaticamente.
              </p>
            </div>

            {/* Seção 2 */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>2️⃣ Campos de Assinatura (Corpo do Documento)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Insira os marcadores de assinatura com <strong>chaves triplas</strong> no local exato onde as assinaturas devem aparecer. Eles ficam <strong>invisíveis</strong> no contrato final e a ZapSign posiciona automaticamente a assinatura por cima.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#10b981' }}>{"{{{assinatura_paciente}}}"}</span> — Assinatura do paciente (contratante)<br/>
                <span style={{ color: '#10b981' }}>{"{{{assinatura_dr}}}"}</span> — Assinatura do médico (contratado)<br/>
                <span style={{ color: '#f59e0b' }}>{"{{{assinatura_responsavel}}}"}</span> — Assinatura do responsável legal <em>(somente para menores)</em>
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠️ <strong>Importante:</strong> Coloque esses marcadores nas páginas finais do contrato, antes dos campos de identificação do signatário (nome completo, CPF, etc).
              </p>
            </div>

            {/* Seção 3 */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>3️⃣ Rubricas no Rodapé (Todas as Páginas)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7, marginBottom: '0.75rem' }}>
                Para que <strong>todas as páginas</strong> recebam rubricas automáticas, insira os marcadores de rubrica no <strong>Rodapé (Footer)</strong> do Word. Como o rodapé se repete em todas as páginas, a ZapSign posiciona a rubrica automaticamente em cada uma.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <span style={{ color: '#10b981' }}>{"{{{rubrica_paciente}}}"}</span> — Rubrica do paciente<br/>
                <span style={{ color: '#10b981' }}>{"{{{rubrica_dr}}}"}</span> — Rubrica do médico<br/>
                <span style={{ color: '#f59e0b' }}>{"{{{rubrica_responsavel}}}"}</span> — Rubrica do responsável <em>(se aplicável)</em>
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                📌 <strong>Como fazer no Word:</strong> Vá em <em>Inserir → Rodapé</em> e digite os marcadores de rubrica lado a lado.
              </p>
            </div>

            {/* Seção 4 */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>4️⃣ Contratos com Menor de Idade (3 Signatários)</h3>
              <p style={{ opacity: 0.85, lineHeight: 1.7 }}>
                Se o contrato for para paciente menor de idade, basta incluir os campos <code style={{ background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{"{{{assinatura_responsavel}}}"}</code> e <code style={{ background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>{"{{{rubrica_responsavel}}}"}</code>. O sistema <strong>detecta automaticamente</strong> a presença desses marcadores e adiciona um terceiro signatário na ZapSign.
              </p>
            </div>

            {/* Seção 5 */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>5️⃣ Fluxo Completo do Sistema</h3>
              <div style={{ opacity: 0.85, lineHeight: 1.9, paddingLeft: '0.5rem' }}>
                <p>① Você faz o upload do <strong>.docx</strong> com os campos configurados</p>
                <p>② O sistema lê as chaves duplas e gera as <strong>perguntas automáticas</strong></p>
                <p>③ Você cria um contrato e envia o <strong>link ao paciente</strong></p>
                <p>④ O paciente preenche o formulário e <strong>visualiza o contrato</strong></p>
                <p>⑤ Ao confirmar, o sistema integra com a <strong>ZapSign</strong> para assinatura digital</p>
                <p>⑥ O paciente assina, e o <strong>médico recebe por e-mail</strong> o link para assinar</p>
                <p>⑦ O contrato finalizado fica disponível para <strong>download em PDF</strong> no histórico</p>
              </div>
            </div>

            {/* Resumo visual */}
            <div style={{ background: 'rgba(37,99,235,0.08)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(37,99,235,0.2)' }}>
              <h3 style={{ color: 'var(--primary)', marginTop: 0, marginBottom: '1rem' }}>📐 Resumo Rápido</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '0.5rem' }}>Tipo</th>
                    <th style={{ padding: '0.5rem' }}>Formato</th>
                    <th style={{ padding: '0.5rem' }}>Onde Colocar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Dado dinâmico</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#8b5cf6' }}>{"{{campo}}"}</td>
                    <td style={{ padding: '0.5rem' }}>Corpo do documento</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem' }}>Assinatura</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#10b981' }}>{"{{{assinatura_xxx}}}"}</td>
                    <td style={{ padding: '0.5rem' }}>Final do documento</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem' }}>Rubrica</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace', color: '#10b981' }}>{"{{{rubrica_xxx}}}"}</td>
                    <td style={{ padding: '0.5rem' }}>Rodapé (Footer) do Word</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="btn-primary"
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              Entendi, vou configurar meu template!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
