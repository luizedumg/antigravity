'use client';

import { useState, useEffect } from 'react';
import { getTemplates } from '@/actions/templates';
import Link from 'next/link';

// We need to move the server action out, but for simplicity I can define a wrapper or use the existing `createContractDraft` from `actions/contracts.ts`.
// Let's import from contracts!
import { createContractDraft as createContract } from '@/actions/contracts';

// Monta a URL wa.me com a mensagem para o paciente.
// `whatsappDigits` deve estar em formato E.164 sem o "+" (ex: 5511912345678)
function buildWhatsappUrl(whatsappDigits: string, patientFirstName: string, link: string) {
  const message =
    `Olá, ${patientFirstName}! 👋\n\n` +
    `Segue o link para a assinatura do seu contrato de cirurgia:\n${link}\n\n` +
    `Basta clicar no link, preencher o formulário e seguir as instruções.\n\n` +
    `⚠️ *Atenção:* ao chegar na etapa de assinatura, informe o seu e-mail *corretamente* — é por ele que a ZapSign enviará o token necessário para finalizar a assinatura.`;
  return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
}

export default function NovoLinkPaciente() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [patientName, setPatientName] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [areaCode, setAreaCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [surgeryType, setSurgeryType] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleGenerate = async () => {
    // Country code: "+" seguido de 1 a 3 dígitos
    const ccDigits = countryCode.replace(/\D/g, '');
    const ddd = areaCode.replace(/\D/g, '');
    const phone = phoneNumber.replace(/\D/g, '');

    if (!patientName.trim() || !surgeryType) {
      return alert('Preencha o nome e o tipo de cirurgia.');
    }
    if (ccDigits.length < 1 || ccDigits.length > 3) {
      return alert('Código do país inválido (ex.: +55).');
    }
    if (ddd.length < 2 || ddd.length > 3) {
      return alert('DDD inválido (2 ou 3 dígitos).');
    }
    if (phone.length < 8 || phone.length > 9) {
      return alert('Número de telefone inválido (8 ou 9 dígitos).');
    }

    const whatsappDigits = `${ccDigits}${ddd}${phone}`;
    const whatsappE164 = `+${whatsappDigits}`;

    setLoading(true);
    try {
      const contract = await createContract({
        patientName,
        patientWhatsapp: whatsappE164,
        surgeryType,
      });
      const link = `${window.location.origin}/paciente/${contract.linkId}`;
      const firstName = patientName.trim().split(' ')[0];
      setGeneratedLink(link);
      setWhatsappUrl(buildWhatsappUrl(whatsappDigits, firstName, link));
    } catch (e) {
      console.error(e);
      alert('Erro ao criar contrato');
    }

    setLoading(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    alert('Link copiado! Você já pode colar no WhatsApp do paciente.');
  };

  const sendToWhatsApp = () => {
    if (!whatsappUrl) return;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="container">
      <div className="glass-panel" style={{ marginTop: '5vh', maxWidth: '600px', margin: '5vh auto' }}>
        <h1 style={{ color: 'var(--primary)' }}>Gerar Link para Paciente</h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Crie um contrato em rascunho e gere a URL mágica preenchida para envio imediato ao paciente.</p>

        {!generatedLink ? (
          <div>
            <div className="form-group">
              <label className="label">Nome Completo do Paciente</label>
              <input className="input-field" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="João da Silva" />
            </div>

            <div className="form-group">
              <label className="label">Número do WhatsApp do Paciente</label>
              <div style={{ display: 'grid', gridTemplateColumns: '90px 90px 1fr', gap: '0.5rem' }}>
                <input
                  className="input-field"
                  value={countryCode}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^\d+]/g, '');
                    const withPlus = raw.startsWith('+') ? raw : `+${raw.replace(/\+/g, '')}`;
                    setCountryCode(withPlus.slice(0, 4));
                  }}
                  placeholder="+55"
                  inputMode="tel"
                  aria-label="Código do país"
                />
                <input
                  className="input-field"
                  value={areaCode}
                  onChange={e => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="DDD"
                  inputMode="numeric"
                  aria-label="DDD da cidade"
                />
                <input
                  className="input-field"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="912345678"
                  inputMode="numeric"
                  aria-label="Número do telefone"
                />
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: '0.4rem' }}>
                Formato exigido pelo WhatsApp: código do país + DDD + número (ex.: +55 11 912345678).
              </p>
            </div>

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
                {loading ? 'Preparando Link...' : 'Gerar Link do WhatsApp'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s', textAlign: 'center' }}>
            <div style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid var(--success)', borderRadius: '16px' }}>
              <h2 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Link Gerado com Sucesso!</h2>
              <p style={{ margin: '0 0 2rem 0', opacity: 0.8 }}>O contrato em rascunho foi atrelado a este link. Envie para o WhatsApp do paciente para iniciar o Workflow Dinâmico.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <input readOnly className="input-field" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.7)', borderStyle: 'dashed' }} value={generatedLink} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={copyLink} className="btn-primary" style={{ flex: '1 1 180px' }}>
                  ✔ Copiar Link
                </button>
                <button onClick={sendToWhatsApp} className="btn-primary" style={{ flex: '1 1 220px', background: '#25D366' }}>
                  📲 Enviar ao WhatsApp do Paciente
                </button>
                <Link href="/admin/historico" className="btn-outline" style={{ flex: '1 1 180px' }}>
                  Acompanhar no Histórico
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
