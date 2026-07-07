'use client';

import { useEffect, useState } from 'react';
import { getContractByLink, updateContractData, getTemplateByName } from '@/actions/contracts';
import { generateDocumentHtmlPreview } from '@/actions/document';
import { sendToZapsign } from '@/actions/zapsign';
import { sendPatientAlerts } from '@/actions/alerts';
import { sendWhatsAppSignatureLinks } from '@/actions/whatsapp';
import { useParams } from 'next/navigation';

// ══════ Helpers de CPF ══════
function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function validateCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return false;
  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(d)) return false;
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(d[9]) !== check) return false;
  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(d[10]) !== check) return false;
  return true;
}

function isCpfQuestion(q: any): boolean {
  return q.key.toLowerCase().includes('cpf') || q.label.toLowerCase().includes('cpf');
}

export default function WizardPaciente() {
  const params = useParams();
  const linkId = params.linkId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 1: Dados, 2: Preview, 3: Assinatura, 4: Finalização
  const [step, setStep] = useState(1);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [signUrl, setSignUrl] = useState<string>('');
  const [responsavelSignUrl, setResponsavelSignUrl] = useState<string | null>(null);
  const [nomeResponsavel, setNomeResponsavel] = useState<string | null>(null);
  const [whatsAppSignSent, setWhatsAppSignSent] = useState(false);
  const [urlsExpired, setUrlsExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [recusado, setRecusado] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const c = await getContractByLink(linkId);
        if (c) {
          setContract(c);
          const t = await getTemplateByName(c.surgeryType);
          if (t) setTemplate(t);

          // Contrato recusado: mostra tela dedicada (não reabrir assinatura).
          if (c.status === 'RECUSADO') {
            setRecusado(true);
            setLoading(false);
            return;
          }
          // Se o contrato já foi totalmente assinado ou salvo no Drive
          if (['ASSINADO', 'DRIVE_OK'].includes(c.status)) {
            setStep(4);
          }
          // Se o contrato já passou pelo ZapSign (tem URLs salvas no banco), restaurar
          else if (c.patientSignUrl) {
            // Verificar expiração de 30 dias
            if (c.signUrlsCreatedAt) {
              const createdAt = new Date(c.signUrlsCreatedAt);
              const diffDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
              if (diffDays > 30) {
                setUrlsExpired(true);
                setStep(3);
                setLoading(false);
                return;
              }
            }
            setSignUrl(c.patientSignUrl);
            setResponsavelSignUrl(c.responsavelSignUrl || null);
            setNomeResponsavel(c.nomeResponsavel || null);
            setStep(3);
          }
          // Se o contrato está VISUALIZADO mas sem URLs (preencheu formulário mas ZapSign não foi chamado)
          else if (['VISUALIZADO', 'ASSINATURA_PARCIAL'].includes(c.status) && !c.patientSignUrl) {
            // Paciente preencheu o formulário mas não chegou a enviar ao ZapSign
            // Mostrar step 1 para ele poder prosseguir novamente
            setStep(1);
          }
        }
      } catch (err) {
        console.error('[Paciente] Erro ao carregar contrato:', err);
      }
      setLoading(false);
    }
    load();
  }, [linkId]);

  const handleAnswerChange = (key: string, value: string) => {
    setDynamicAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleGoToPreview = async () => {
    setErrorMsg('');
    const questionsList = template?.questionsJson ? JSON.parse(template.questionsJson) : [];
    for (const q of questionsList) {
      if (!dynamicAnswers[q.key] || dynamicAnswers[q.key].trim() === '') {
        setErrorMsg(`Por favor, preencha o campo obrigatório: ${q.label}`);
        return;
      }
      // Validação algorítmica do CPF (dígitos verificadores)
      if (isCpfQuestion(q) && !validateCpf(dynamicAnswers[q.key])) {
        setErrorMsg('O CPF informado é inválido. Verifique os números digitados (11 dígitos).');
        return;
      }
    }

    setLoading(true);
    try {
      // Formata CPFs com pontos e traço antes de salvar (para aparecer correto no documento)
      const formattedAnswers = { ...dynamicAnswers };
      for (const q of questionsList) {
        if (isCpfQuestion(q) && formattedAnswers[q.key]) {
          formattedAnswers[q.key] = formatCpf(formattedAnswers[q.key]);
        }
      }
      await updateContractData(linkId, "", formattedAnswers);
      
      // Enviar alertas ao médico sobre respostas críticas (imagem, alergias, drogas, doenças)
      const questionsList2 = template?.questionsJson ? JSON.parse(template.questionsJson) : [];
      sendPatientAlerts({
        patientName: contract.patientName,
        surgeryType: contract.surgeryType,
        answers: dynamicAnswers,
        questions: questionsList2
      }).catch(err => console.error('Erro ao enviar alertas:', err));
      
      // Gera preview HTML
      const html = await generateDocumentHtmlPreview(contract.id);
      setHtmlPreview(html);
      
      setStep(2);
    } catch (e: any) {
      console.error('[Paciente] Erro ao preparar documento:', e);
      setErrorMsg('Não conseguimos preparar seu documento agora. Tente novamente em instantes ou fale com a clínica.');
    }
    setLoading(false);
  };

  const processZapSign = async () => {
    setLoading(true);
    try {
      const res = await sendToZapsign(contract.id);
      setSignUrl(res.signUrl);
      if (res.responsavelSignUrl) {
        setResponsavelSignUrl(res.responsavelSignUrl);
        setNomeResponsavel(res.nomeResponsavel || 'Responsável Legal');
      }
      setStep(3);

      // ── ENVIO AUTOMÁTICO DOS LINKS VIA WHATSAPP ──
      // Envia os links de assinatura separados para o WhatsApp do paciente
      if (contract.patientWhatsApp) {
        sendWhatsAppSignatureLinks({
          patientWhatsApp: contract.patientWhatsApp,
          patientName: contract.patientName,
          patientSignUrl: res.signUrl,
          responsavelSignUrl: res.responsavelSignUrl,
          nomeResponsavel: res.nomeResponsavel,
        }).then(result => {
          if (result.success) {
            setWhatsAppSignSent(true);
          } else {
            console.error('[WhatsApp Auto] Falha ao enviar links:', result.error);
          }
        }).catch(err => console.error('[WhatsApp Auto] Erro:', err));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Não conseguimos preparar sua assinatura agora. Tente novamente em instantes ou fale com a clínica.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Carregando sua Experiência Segura...</div>;
  }

  if (!contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '420px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔗</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>Link inválido ou expirado</h2>
          <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: '1.5rem' }}>Não localizamos este contrato. Se você recebeu este link do consultório, fale conosco pelo WhatsApp que geramos um novo.</p>
          <a href="https://wa.me/5534997346139" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#25D366', color: 'white', padding: '0.85rem 1.6rem', borderRadius: '50px', fontWeight: 600, textDecoration: 'none' }}>💬 Falar com o consultório</a>
        </div>
      </div>
    );
  }

  if (recusado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '440px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--danger, #ef4444)' }}>Contrato recusado</h2>
          <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: '1.5rem' }}>Este contrato foi recusado e não pode mais ser assinado. Se foi um engano ou você deseja retomar, entre em contato com a clínica para gerarmos um novo documento.</p>
          <a href="https://wa.me/5534997346139" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#25D366', color: 'white', padding: '0.85rem 1.6rem', borderRadius: '50px', fontWeight: 600, textDecoration: 'none' }}>💬 Falar com a clínica</a>
        </div>
      </div>
    );
  }

  const questions = template?.questionsJson ? JSON.parse(template.questionsJson) : [];
  const STEP_LABELS = ['Dados', 'Revisão', 'Assinatura'];

  return (
    <main style={{ padding: '0', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      {/* HEADER LUXO */}
      <div style={{ background: 'var(--primary)', padding: '2rem 1rem', color: 'white', textAlign: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.2)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Confirmação e Consentimento Médico</h1>
        <p style={{ opacity: 0.9 }}>{contract.surgeryType}</p>
      </div>

      <div className="container" style={{ flex: 1, padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderTop: '4px solid var(--primary)', borderRadius: '16px' }}>

          {/* ═══ Indicador de progresso (passos 1–3) ═══ */}
          {step <= 3 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = step > n;
                const active = step === n;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: active || done ? 1 : 0.4 }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', background: done ? 'var(--success, #10b981)' : active ? 'var(--primary)' : '#cbd5e1' }}>
                        {done ? '✓' : n}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: active ? 700 : 500 }}>{label}</span>
                    </div>
                    {n < STEP_LABELS.length && <span style={{ width: '20px', height: '2px', background: '#cbd5e1' }} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ Aviso de erro inline (substitui alert() nativo) ═══ */}
          {errorMsg && (
            <div role="alert" style={{ marginBottom: '1.5rem', padding: '0.9rem 1.1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', color: 'var(--danger, #ef4444)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ <span style={{ flex: 1 }}>{errorMsg}</span>
              <button onClick={() => setErrorMsg('')} aria-label="Fechar aviso" style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
            </div>
          )}

          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.5s' }}>
              <div style={{ marginBottom: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Olá, {contract.patientName.split(' ')[0]}</h2>
                <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
                  Para agilizar e garantir sua total segurança jurídica na <b>{contract.surgeryType}</b>, precisamos que você forneça os dados complementares abaixo. 
                  Eles farão parte do seu termo oficial.
                </p>
              </div>

              {questions.length === 0 ? (
                 <p style={{ opacity: 0.8, marginBottom: '2rem', fontStyle: 'italic' }}>* Nenhum dado complementar exigido para esta cirurgia.</p>
              ) : questions.map((q: any, i: number) => {
                 const isBooleanField = q.type === 'boolean' || q.label.toLowerCase().includes('imagem') || q.key.toLowerCase().includes('imagem');
                 const cpfField = isCpfQuestion(q);
                 const cpfRaw = dynamicAnswers[q.key] || '';
                 return (
                <div key={i} className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="label" style={{ fontSize: '1rem', color: 'var(--foreground)' }}>
                    {q.label} <span style={{ color: 'red', fontWeight: 'bold' }}>*</span>
                  </label>
                  {cpfField ? (
                    /* ══════ CAMPO CPF COM MÁSCARA E VALIDAÇÃO ══════ */
                    <div>
                      <input 
                        className="input-field" 
                        value={formatCpf(cpfRaw)}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                          handleAnswerChange(q.key, raw);
                        }}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                        maxLength={14}
                        style={{ 
                          padding: '1rem',
                          borderColor: cpfRaw.length === 11 
                            ? (validateCpf(cpfRaw) ? '#10b981' : '#ef4444') 
                            : undefined,
                          borderWidth: cpfRaw.length === 11 ? '2px' : undefined,
                          transition: 'border-color 0.3s ease',
                        }}
                      />
                      {cpfRaw.length > 0 && cpfRaw.length < 11 && (
                        <span style={{ color: '#f59e0b', fontSize: '0.8rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ⚠️ Faltam {11 - cpfRaw.length} dígito(s)
                        </span>
                      )}
                      {cpfRaw.length === 11 && validateCpf(cpfRaw) && (
                        <span style={{ color: '#059669', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ✅ CPF válido
                        </span>
                      )}
                      {cpfRaw.length === 11 && !validateCpf(cpfRaw) && (
                        <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ❌ CPF inválido — verifique os números digitados
                        </span>
                      )}
                    </div>
                  ) : isBooleanField ? (
                    <select
                      className="input-field"
                      onChange={e => handleAnswerChange(q.key, e.target.value)}
                      value={dynamicAnswers[q.key] || ''}
                      style={{ padding: '1rem' }}
                    >
                       <option value="" disabled>Selecione uma resposta...</option>
                       <option value="Sim">Sim</option>
                       <option value="Não">Não</option>
                    </select>
                  ) : (
                    <input
                      className="input-field"
                      value={dynamicAnswers[q.key] || ''}
                      onChange={e => handleAnswerChange(q.key, e.target.value)}
                      placeholder="Sua resposta..."
                      style={{ padding: '1rem' }}
                    />
                  )}
                </div>
                 );
              })}

              <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                 <button className="btn-primary" onClick={handleGoToPreview} disabled={loading} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                   {loading ? 'Processando Documento...' : 'Próximo Passo (Visualização Legal)'}
                 </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.5s' }}>
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>Leia o seu Contrato</h2>
                <p style={{ opacity: 0.8 }}>Este é o documento legal oficial gerado com os seus dados inseridos.</p>
              </div>

              <div style={{ 
                background: 'white', 
                color: 'black',
                padding: '2rem', 
                borderRadius: '8px', 
                border: '1px solid #ccc',
                maxHeight: '400px', 
                overflowY: 'auto',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05) inset'
              }}>
                <div dangerouslySetInnerHTML={{ __html: htmlPreview }} style={{ fontSize: '0.9rem', lineHeight: '1.6' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                 <button className="btn-outline" onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem' }}>
                   Voltar e Corrigir
                 </button>
                 <button className="btn-success" onClick={processZapSign} disabled={loading} style={{ flex: 2, padding: '1rem' }}>
                   {loading ? 'Preparando Assinatura...' : 'Li e Concordo (Próximo)'}
                 </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.5s', textAlign: 'center', padding: '2rem 0' }}>
              
              {/* ── URLS EXPIRADAS ── */}
              {urlsExpired ? (
                <div>
                  <div style={{ fontSize: '3rem', margin: '0 auto 1.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger, #ef4444)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏰</div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--danger, #ef4444)' }}>Links Expirados</h2>
                  <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>
                    Os links de assinatura expiraram (mais de 30 dias). Entre em contato com a clínica para gerar um novo contrato.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3rem', margin: '0 auto 1.5rem', background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖋</div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Quase lá!</h2>
                  <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                    O documento já está pronto. Para dar validade jurídica, realize a assinatura criptografada pela plataforma segura ZapSign.
                  </p>

                  {/* ── AVISO: LINKS ENVIADOS AO WHATSAPP ── */}
                  {whatsAppSignSent && (
                    <div style={{
                      margin: '1rem auto 2rem',
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(37, 211, 102, 0.08)',
                      border: '1px solid rgba(37, 211, 102, 0.25)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: '#059669',
                      maxWidth: '450px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      📱 Os links de assinatura também foram enviados ao seu WhatsApp!
                    </div>
                  )}

                  {/* ── INSTRUÇÃO PARA MENOR ── */}
                  {responsavelSignUrl && (
                    <div style={{
                      margin: '0 auto 2rem',
                      padding: '1rem 1.25rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: '#b45309',
                      maxWidth: '500px',
                      textAlign: 'center'
                    }}>
                      ⚠️ <strong>Atenção:</strong> Este contrato requer <strong>2 assinaturas separadas</strong>. Cada pessoa deve clicar <strong>apenas</strong> no seu botão correspondente abaixo.
                    </div>
                  )}
                  
                  {/* ── LINK DO PACIENTE ── */}
                  <div style={{ 
                    padding: '1.5rem', 
                    border: '3px solid var(--primary)', 
                    borderRadius: '16px', 
                    marginBottom: '2rem',
                    background: 'rgba(37,99,235,0.03)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '0.25rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }}>
                      {responsavelSignUrl ? 'ASSINATURA 1 DE 2' : 'SUA ASSINATURA'}
                    </div>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', marginTop: '0.5rem', color: 'var(--primary)' }}>
                      ✍️ Paciente
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
                      {contract.patientName}
                    </p>
                    <a 
                      href={signUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary" 
                      style={{ 
                        display: 'inline-flex', 
                        padding: '1rem 2.5rem', 
                        fontSize: '1.1rem',
                        boxShadow: '0 4px 15px rgba(37,99,235,0.3)',
                        textDecoration: 'none'
                      }}
                    >
                      Assinar como Paciente →
                    </a>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.5 }}>Abrirá na ZapSign em nova aba.</p>
                  </div>

                  {/* ── LINK DO RESPONSÁVEL (se menor de idade) ── */}
                  {responsavelSignUrl && (
                    <div style={{ 
                      padding: '1.5rem', 
                      border: '3px solid var(--success, #10b981)', 
                      borderRadius: '16px', 
                      marginBottom: '2rem', 
                      background: 'rgba(16,185,129,0.03)',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--success, #10b981)',
                        color: 'white',
                        padding: '0.25rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}>
                        ASSINATURA 2 DE 2
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', marginTop: '0.5rem', color: 'var(--success, #10b981)' }}>
                        👨‍👧 Responsável Legal
                      </p>
                      <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>
                        {nomeResponsavel}
                      </p>
                      <a 
                        href={responsavelSignUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-success" 
                        style={{ 
                          display: 'inline-flex', 
                          padding: '1rem 2.5rem', 
                          fontSize: '1.1rem',
                          boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                          textDecoration: 'none'
                        }}
                      >
                        Assinar como Responsável →
                      </a>
                      <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.5 }}>Abrirá na ZapSign em nova aba.</p>
                    </div>
                  )}

                  {/* ── NOTA SOBRE MÉDICO ── */}
                  <p style={{ fontSize: '0.85rem', opacity: 0.5, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                    📧 O médico receberá automaticamente o link de assinatura por e-mail.
                  </p>

                  {/* ── NOTA SOBRE WHATSAPP ── */}
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.03)',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    opacity: 0.7,
                    lineHeight: '1.6'
                  }}>
                    {whatsAppSignSent ? (
                      <>
                        💡 <strong>Dica:</strong> Você pode fechar esta tela com segurança. {responsavelSignUrl
                          ? 'Os links de assinatura de ambas as partes foram enviados ao seu WhatsApp.'
                          : 'O link de assinatura foi enviado ao seu WhatsApp.'}
                        <br />
                        Basta abrir o WhatsApp e clicar no link correspondente a qualquer momento.
                      </>
                    ) : (
                      <>
                        💡 <strong>Dica:</strong> Assine {responsavelSignUrl ? 'pelos botões' : 'pelo botão'} acima nesta tela.
                        Se preferir, deixe esta aba aberta — {responsavelSignUrl ? 'os links continuam' : 'o link continua'} disponíveis aqui.
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ animation: 'fadeIn 0.5s', textAlign: 'center', padding: '3rem 0' }}>
               <div style={{ fontSize: '4rem', margin: '0 auto 1.5rem', background: 'var(--success)', color: 'white', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(16,185,129,0.4)' }}>✓</div>
               <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--success)' }}>Tudo Certo!</h2>
               <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: '400px', margin: '0 auto' }}>
                 Muito obrigado, {contract.patientName.split(' ')[0]}! O termo de consentimento foi assinado com validade legal e retornado para o cirurgião.
               </p>
               <h3 style={{ fontSize: '1.5rem', marginTop: '3rem', color: 'var(--primary)' }}>Boa cirurgia! 🚀</h3>
            </div>
          )}

        </div>
      </div>
      


    </main>
  );
}
