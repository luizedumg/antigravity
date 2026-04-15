'use client';

import { useEffect, useState } from 'react';
import { getContractByLink, updateContractData, getTemplateByName } from '@/actions/contracts';
import { generateDocumentHtmlPreview } from '@/actions/document';
import { sendToZapsign } from '@/actions/zapsign';
import { useParams } from 'next/navigation';

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

  useEffect(() => {
    async function load() {
      const c = await getContractByLink(linkId);
      if (c) {
        setContract(c);
        const t = await getTemplateByName(c.surgeryType);
        if (t) setTemplate(t);

        if (c.status === 'VISUALIZADO' || c.status === 'ASSINADO') {
           // Já preenchido, pode pular etapas...
           if (c.status === 'VISUALIZADO') setStep(3);
           if (c.status === 'ASSINADO') setStep(4);
        }
      }
      setLoading(false);
    }
    load();
  }, [linkId]);

  const handleAnswerChange = (key: string, value: string) => {
    setDynamicAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleGoToPreview = async () => {
    const questionsList = template?.questionsJson ? JSON.parse(template.questionsJson) : [];
    for (const q of questionsList) {
      if (!dynamicAnswers[q.key] || dynamicAnswers[q.key].trim() === '') {
        return alert(`Por favor, preencha o campo obrigatório: ${q.label}`);
      }
    }

    setLoading(true);
    try {
      // Salva os dados na base de dados (o endereço nativo ficará vazio se não quisermos)
      await updateContractData(linkId, "", dynamicAnswers);
      
      // Gera preview HTML
      const html = await generateDocumentHtmlPreview(contract.id);
      setHtmlPreview(html);
      
      setStep(2);
    } catch (e: any) {
      alert("Houve um erro ao processar seu documento: " + (e.message || JSON.stringify(e)));
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
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao conectar com servidor de assinatura.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && step === 1) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Carregando sua Experiência Segura...</div>;
  }

  if (!contract) {
    return <div style={{ textAlign: 'center', marginTop: '10vh' }}>Link de acesso inválido ou expirado.</div>;
  }

  const questions = template?.questionsJson ? JSON.parse(template.questionsJson) : [];

  return (
    <main style={{ padding: '0', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      {/* HEADER LUXO */}
      <div style={{ background: 'var(--primary)', padding: '2rem 1rem', color: 'white', textAlign: 'center', boxShadow: '0 4px 20px rgba(37,99,235,0.2)' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Confirmação e Consentimento Médico</h1>
        <p style={{ opacity: 0.9 }}>{contract.surgeryType}</p>
      </div>

      <div className="container" style={{ flex: 1, padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div className="glass-panel" style={{ padding: '2.5rem', borderTop: '4px solid var(--primary)', borderRadius: '16px' }}>
          
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
                 return (
                <div key={i} className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="label" style={{ fontSize: '1rem', color: 'var(--foreground)' }}>
                    {q.label} <span style={{ color: 'red', fontWeight: 'bold' }}>*</span>
                  </label>
                  {isBooleanField ? (
                    <select 
                      className="input-field" 
                      onChange={e => handleAnswerChange(q.key, e.target.value)}
                      defaultValue=""
                      style={{ padding: '1rem' }}
                    >
                       <option value="" disabled>Selecione uma resposta...</option>
                       <option value="Sim">Sim</option>
                       <option value="Não">Não</option>
                    </select>
                  ) : (
                    <input 
                      className="input-field" 
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
              <div style={{ fontSize: '3rem', margin: '0 auto 1.5rem', background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖋</div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Quase lá!</h2>
              <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>
                O documento já está pronto. Para dar validade jurídica, realize a assinatura criptografada pela plataforma segura ZapSign.
              </p>
              
              {/* ── LINK DO PACIENTE ── */}
              <div style={{ padding: '1.5rem', border: '2px dashed var(--primary)', borderRadius: '16px', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
                  ✍️ Assinatura do Paciente{responsavelSignUrl ? ' (Menor)' : ''}
                </p>
                <a href={signUrl || '#'} target="_blank" className="btn-primary" style={{ display: 'inline-flex', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                  Assinar como Paciente
                </a>
                <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.6 }}>Abrirá na ZapSign em nova aba.</p>
              </div>

              {/* ── LINK DO RESPONSÁVEL (se menor de idade) ── */}
              {responsavelSignUrl && (
                <div style={{ padding: '1.5rem', border: '2px dashed var(--success)', borderRadius: '16px', marginBottom: '1.5rem', background: 'rgba(16,185,129,0.03)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--success)' }}>
                    👨‍👧 Assinatura do Responsável Legal
                  </p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '1rem' }}>
                    {nomeResponsavel}
                  </p>
                  <a href={responsavelSignUrl} target="_blank" className="btn-success" style={{ display: 'inline-flex', padding: '1rem 2rem', fontSize: '1.1rem' }}>
                    Assinar como Responsável
                  </a>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', opacity: 0.6 }}>Abrirá na ZapSign em nova aba.</p>
                </div>
              )}

              {responsavelSignUrl && (
                <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>
                  📧 O médico receberá automaticamente o link de assinatura por e-mail.
                </p>
              )}

              <button className="btn-success" onClick={() => setStep(4)} style={{ width: '100%', padding: '1rem', marginTop: '1rem' }}>
                {responsavelSignUrl ? 'AMBOS JÁ ASSINARAM' : 'EU JÁ ASSINEI NA ZAPSIGN'}
              </button>
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
