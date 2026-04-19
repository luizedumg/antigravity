'use client';

import { useState, useEffect } from 'react';
import { getTemplates } from '@/actions/templates';
import Link from 'next/link';
import { createContractDraft as createContract } from '@/actions/contracts';
import { sendWhatsAppMessage } from '@/actions/whatsapp';

const COUNTRY_CODES = [
  { code: '55', label: '🇧🇷 +55 (Brasil)', flag: '🇧🇷' },
  { code: '1', label: '🇺🇸 +1 (EUA/Canadá)', flag: '🇺🇸' },
  { code: '351', label: '🇵🇹 +351 (Portugal)', flag: '🇵🇹' },
  { code: '54', label: '🇦🇷 +54 (Argentina)', flag: '🇦🇷' },
  { code: '598', label: '🇺🇾 +598 (Uruguai)', flag: '🇺🇾' },
  { code: '595', label: '🇵🇾 +595 (Paraguai)', flag: '🇵🇾' },
  { code: '56', label: '🇨🇱 +56 (Chile)', flag: '🇨🇱' },
  { code: '57', label: '🇨🇴 +57 (Colômbia)', flag: '🇨🇴' },
  { code: '34', label: '🇪🇸 +34 (Espanha)', flag: '🇪🇸' },
  { code: '39', label: '🇮🇹 +39 (Itália)', flag: '🇮🇹' },
  { code: '44', label: '🇬🇧 +44 (Reino Unido)', flag: '🇬🇧' },
  { code: '49', label: '🇩🇪 +49 (Alemanha)', flag: '🇩🇪' },
];

export default function NovoLinkPaciente() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [patientName, setPatientName] = useState('');
  const [countryCode, setCountryCode] = useState('55');
  const [ddd, setDdd] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    async function loadTemplates() {
      const data = await getTemplates();
      setTemplates(data);
      if (data.length > 0) {
        setSurgeryType(data[0].name);
      }
    }
    loadTemplates();
  }, []);

  const fullWhatsAppNumber = `${countryCode}${ddd}${phoneNumber}`;

  const handleGenerate = async () => {
    if (!patientName.trim()) {
      return alert("Preencha o nome do paciente.");
    }
    if (!ddd || ddd.length < 2) {
      return alert("Informe o DDD com 2 dígitos.");
    }
    if (!phoneNumber || phoneNumber.length < 8) {
      return alert("Informe o número do telefone com pelo menos 8 dígitos.");
    }
    if (!surgeryType) {
      return alert("Selecione um modelo de contrato.");
    }
    setLoading(true);
    
    try {
      const contract = await createContract({ 
        patientName, 
        patientWhatsApp: fullWhatsAppNumber,
        surgeryType 
      });
      const link = `${window.location.origin}/paciente/${contract.linkId}`;
      setGeneratedLink(link);
    } catch (e) {
      console.error(e);
      alert("Erro ao criar contrato");
    }
    
    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const sendToWhatsApp = async () => {
    setSendingWhatsApp(true);
    setWhatsappError('');
    try {
      const result = await sendWhatsAppMessage({
        patientWhatsApp: fullWhatsAppNumber,
        patientName,
        contractLink: generatedLink
      });
      if (result.success) {
        setWhatsappSent(true);
      } else {
        setWhatsappError(result.error || 'Erro desconhecido ao enviar mensagem.');
      }
    } catch (err: any) {
      setWhatsappError(err.message || 'Falha ao conectar com o servidor.');
    }
    setSendingWhatsApp(false);
  };

  const formatPhoneDisplay = () => {
    const country = COUNTRY_CODES.find(c => c.code === countryCode);
    const flag = country?.flag || '📱';
    if (countryCode === '55' && ddd.length === 2 && phoneNumber.length >= 8) {
      const formatted = phoneNumber.length === 9 
        ? `${phoneNumber.slice(0, 5)}-${phoneNumber.slice(5)}`
        : `${phoneNumber.slice(0, 4)}-${phoneNumber.slice(4)}`;
      return `${flag} +${countryCode} (${ddd}) ${formatted}`;
    }
    return `${flag} +${countryCode} ${ddd} ${phoneNumber}`;
  };

  return (
    <main className="container">
      <div className="glass-panel" style={{ marginTop: '5vh', maxWidth: '650px', margin: '5vh auto' }}>
        <h1 style={{ color: 'var(--primary)' }}>Gerar Link para Paciente</h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Crie um contrato em rascunho e gere a URL mágica preenchida para envio imediato ao paciente.</p>
        
        {!generatedLink ? (
          <div>
            {/* ══════ NOME ══════ */}
            <div className="form-group">
              <label className="label">Nome Completo do Paciente</label>
              <input 
                className="input-field" 
                value={patientName} 
                onChange={e => setPatientName(e.target.value)} 
                placeholder="João da Silva" 
              />
            </div>

            {/* ══════ WHATSAPP ══════ */}
            <div className="form-group">
              <label className="label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  📱 Número do WhatsApp do Paciente
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '0.75rem', alignItems: 'start' }}>
                {/* Código do País */}
                <div>
                  <span style={{ fontSize: '0.78rem', opacity: 0.6, display: 'block', marginBottom: '0.3rem' }}>Código do País</span>
                  <select 
                    className="input-field" 
                    value={countryCode} 
                    onChange={e => setCountryCode(e.target.value)}
                    style={{ padding: '0.75rem 0.5rem' }}
                  >
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* DDD */}
                <div>
                  <span style={{ fontSize: '0.78rem', opacity: 0.6, display: 'block', marginBottom: '0.3rem' }}>DDD</span>
                  <input 
                    className="input-field" 
                    value={ddd} 
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 3);
                      setDdd(v);
                    }}
                    placeholder="31"
                    maxLength={3}
                    inputMode="numeric"
                    style={{ textAlign: 'center' }}
                  />
                </div>

                {/* Número */}
                <div>
                  <span style={{ fontSize: '0.78rem', opacity: 0.6, display: 'block', marginBottom: '0.3rem' }}>Número do Telefone</span>
                  <input 
                    className="input-field"
                    value={phoneNumber} 
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setPhoneNumber(v);
                    }}
                    placeholder="999887766"
                    maxLength={9}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Preview do número formatado */}
              {ddd && phoneNumber && (
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.5rem 1rem', 
                  background: 'rgba(37, 99, 235, 0.06)', 
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  color: 'var(--primary)',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {formatPhoneDisplay()}
                </div>
              )}
            </div>

            {/* ══════ TEMPLATE ══════ */}
            <div className="form-group">
              <label className="label">Modelo de Contrato (Cirurgia)</label>
              <select className="input-field" value={surgeryType} onChange={e => setSurgeryType(e.target.value)}>
                {templates.map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              {templates.length === 0 && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Nenhum template cadastrado. Acesse a área de Modelos primeiro.</p>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <Link href="/" className="btn-secondary">
                Voltar
              </Link>
              <button onClick={handleGenerate} disabled={loading || templates.length === 0} className="btn-primary" style={{ flex: 1, background: 'var(--success)' }}>
                {loading ? 'Preparando Link...' : '📲 Gerar Link do WhatsApp'}
              </button>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════
             TELA PÓS-GERAÇÃO — 3 ações: Copiar, Enviar WhatsApp, Histórico
             ══════════════════════════════════════════════════════════════ */
          <div style={{ animation: 'fadeIn 0.5s' }}>
            {/* Cabeçalho de sucesso */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ 
                width: '70px', height: '70px', 
                margin: '0 auto 1rem', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem'
              }}>
                ✅
              </div>
              <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Link Gerado com Sucesso!</h2>
              <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>
                Contrato atrelado ao paciente <strong>{patientName}</strong>. Escolha como deseja prosseguir:
              </p>
            </div>

            {/* Link display */}
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(255,255,255,0.6)', 
              border: '1px dashed rgba(148, 163, 184, 0.5)', 
              borderRadius: '12px', 
              marginBottom: '1.5rem',
              wordBreak: 'break-all',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--primary)',
              fontFamily: 'monospace'
            }}>
              {generatedLink}
            </div>

            {/* Número do WhatsApp de destino */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '2rem', 
              fontSize: '0.85rem', 
              opacity: 0.6 
            }}>
              Será enviado para: <strong>{formatPhoneDisplay()}</strong>
            </div>

            {/* ── 3 BOTÕES DE AÇÃO ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* 1. COPIAR LINK */}
              <button 
                onClick={copyLink} 
                className={copied ? 'btn-success' : 'btn-primary'}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1.05rem',
                  transition: 'all 0.3s ease'
                }}
              >
                {copied ? '✅ Link Copiado!' : '📋 Copiar Link'}
              </button>
              
              {/* 2. ENVIAR AO WHATSAPP DO PACIENTE */}
              <button 
                onClick={sendToWhatsApp}
                disabled={sendingWhatsApp || whatsappSent}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1.05rem',
                  background: whatsappSent ? '#059669' : '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: sendingWhatsApp || whatsappSent ? 'default' : 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-base)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                  opacity: sendingWhatsApp ? 0.7 : 1,
                  boxShadow: whatsappSent ? 'none' : '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
                onMouseEnter={e => { if (!sendingWhatsApp && !whatsappSent) (e.target as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                {sendingWhatsApp ? (
                  <>⏳ Enviando mensagem...</>
                ) : whatsappSent ? (
                  <>✅ Mensagem Enviada com Sucesso!</>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar ao WhatsApp do Paciente
                  </>
                )}
              </button>

              {/* Erro ao enviar */}
              {whatsappError && (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--danger)',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  ❌ {whatsappError}
                </div>
              )}

              {/* 3. ACOMPANHAR NO HISTÓRICO */}
              <Link 
                href="/admin/historico" 
                className="btn-outline"
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1.05rem',
                  textAlign: 'center'
                }}
              >
                📋 Acompanhar no Histórico
              </Link>
            </div>

            {/* Nota de rodapé */}
            {whatsappSent && (
              <p style={{ 
                marginTop: '1.5rem', 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                opacity: 0.6,
                animation: 'fadeIn 0.5s'
              }}>
                ✅ A mensagem foi enviada automaticamente para o WhatsApp do paciente. Quando ele preencher o formulário, o status será atualizado no histórico.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
