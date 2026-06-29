'use server';

import { sendStatusNotification } from './whatsapp';

// Palavras-chave que identificam campos críticos
export const CRITICAL_PATTERNS: Record<string, string[]> = {
  'Uso de Imagem': ['imagem', 'foto', 'image', 'fotografia', 'video', 'filmagem'],
  'Alergias': ['alergia', 'alergico', 'alérgico', 'alergias'],
  'Uso de Drogas/Substâncias': ['droga', 'tabagismo', 'alcool', 'álcool', 'fumo', 'fumante', 'substancia', 'substância', 'cocaina', 'maconha', 'cigarro', 'etilismo', 'tabaco'],
  'Doenças Pré-existentes': ['doenca', 'doença', 'comorbidade', 'patologia', 'diabetes', 'hipertensao', 'hipertensão', 'cardiaco', 'cardíaco', 'renal', 'hepatica', 'hepática', 'hiv', 'hepatite', 'asma', 'epilepsia']
};

/**
 * Analisa as respostas do paciente e envia alerta ao médico sobre campos críticos.
 * Chamado quando o paciente passa do formulário para a visualização do contrato.
 */
export async function sendPatientAlerts(data: {
  patientName: string;
  surgeryType: string;
  answers: Record<string, string>;
  questions: Array<{ key: string; label: string; type: string }>;
}): Promise<{ alertsSent: boolean }> {
  const { patientName, surgeryType, answers, questions } = data;

  // Mapear key → label para usar labels bonitos na mensagem
  const labelMap: Record<string, string> = {};
  for (const q of questions) {
    labelMap[q.key] = q.label;
  }

  // Encontrar respostas críticas
  const criticalFindings: string[] = [];

  for (const [category, patterns] of Object.entries(CRITICAL_PATTERNS)) {
    for (const [key, value] of Object.entries(answers)) {
      const keyLower = key.toLowerCase();
      const labelLower = (labelMap[key] || key).toLowerCase();
      const combined = keyLower + ' ' + labelLower;

      const matched = patterns.some(p => combined.includes(p));
      if (matched && value && value.trim()) {
        // Formatar a resposta
        const displayLabel = labelMap[key] || key.replace(/_/g, ' ');
        const displayValue = value.toLowerCase() === 'sim' ? '✅ Sim' 
          : value.toLowerCase() === 'não' || value.toLowerCase() === 'nao' ? '❌ Não' 
          : value;
        
        criticalFindings.push(`• *${displayLabel}:* ${displayValue}`);
        break; // Evitar duplicatas na mesma categoria
      }
    }
  }

  if (criticalFindings.length === 0) {
    return { alertsSent: false };
  }

  // Montar mensagem do alerta usando sendMessage direto (só para o médico)
  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
  const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
  const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';

  const message = 
    `⚠️ *Alerta Médico — Formulário do Paciente*\n\n` +
    `Paciente: *${patientName}*\n` +
    `Cirurgia: *${surgeryType}*\n\n` +
    `📋 *Respostas relevantes:*\n` +
    criticalFindings.join('\n');

  const doctorNumber = '5534999189054';
  const groupNumber = '120363407792704523@g.us';
  const recipients = [doctorNumber, groupNumber];

  if (EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE) {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    
    for (const number of recipients) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          body: JSON.stringify({ number, text: message })
        });
        console.log(`[Alerta Médico] ✅ Enviado para ${number}`);
      } catch (err) {
        console.error(`[Alerta Médico] ❌ Erro ao enviar para ${number}:`, err);
      }
    }
  }

  return { alertsSent: true };
}
