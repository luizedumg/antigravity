'use server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';

// Números para receber notificações de status
const NOTIFY_NUMBERS = [
  '5534997346139', // Número comercial
  '5534999189054', // Dr. Luiz Eduardo (médico)
];

/**
 * Envia uma mensagem de texto via Evolution API (WhatsApp Business)
 * A mensagem é enviada a partir do número conectado na instância configurada.
 */
async function sendMessage(number: string, text: string): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return { success: false, error: 'Evolution API não configurada.' };
  }

  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({ number, text })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error(`[Evolution API] Erro ao enviar para ${number}:`, result);
      return { success: false, error: result?.message || JSON.stringify(result) };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[Evolution API] Erro de conexão para ${number}:`, err);
    return { success: false, error: err.message || 'Falha na conexão' };
  }
}

/**
 * Envia o link do contrato para o WhatsApp do paciente.
 */
export async function sendWhatsAppMessage(data: { 
  patientWhatsApp: string; 
  patientName: string;
  contractLink: string;
}): Promise<{ success: boolean; error?: string }> {
  const message = 
    `Olá, ${data.patientName.split(' ')[0]}! 👋\n\n` +
    `Segue o link para assinatura do seu contrato de cirurgia.\n\n` +
    `Basta clicar no link abaixo, preencher os campos do formulário e seguir as instruções na tela.\n\n` +
    `⚠️ *Atenção:* na etapa de assinatura, informe seu e-mail corretamente — é por ele que você receberá o token de validação da ZapSign para concluir o processo.\n\n` +
    `🔗 ${data.contractLink}`;

  const result = await sendMessage(data.patientWhatsApp, message);
  if (result.success) {
    console.log(`[WhatsApp] ✅ Link enviado para paciente ${data.patientWhatsApp}`);
  }
  return result;
}

/**
 * Envia notificações de mudança de status para o médico e número comercial.
 * Chamado automaticamente pelo webhook da ZapSign.
 */
export async function sendStatusNotification(data: {
  patientName: string;
  surgeryType: string;
  event: 'ENVIADO' | 'VISUALIZADO' | 'ASSINATURA_PARCIAL' | 'ASSINADO' | 'DRIVE_OK' | 'RECUSADO';
  signerName?: string;
}): Promise<void> {
  const { patientName, surgeryType, event, signerName } = data;
  const firstName = patientName.split(' ')[0];

  const messages: Record<string, string> = {
    ENVIADO: 
      `📨 *Contrato Enviado*\n\n` +
      `O link do contrato de *${surgeryType}* foi enviado via WhatsApp para o paciente *${patientName}*.`,

    VISUALIZADO: 
      `👁️ *Contrato Visualizado*\n\n` +
      `O paciente *${firstName}* abriu o link do contrato de *${surgeryType}*.`,

    ASSINATURA_PARCIAL: 
      `✍️ *Assinatura Parcial*\n\n` +
      `${signerName ? `*${signerName}*` : 'Um signatário'} assinou o contrato de *${surgeryType}* do paciente *${firstName}*.\n\n` +
      `⏳ Aguardando os demais signatários.`,

    ASSINADO: 
      `✅ *Contrato Totalmente Assinado!*\n\n` +
      `Todas as partes assinaram o contrato de *${surgeryType}* do paciente *${patientName}*.\n\n` +
      `☁️ O PDF será enviado automaticamente ao Google Drive.`,

    DRIVE_OK: 
      `☁️ *Salvo no Google Drive*\n\n` +
      `O PDF assinado do contrato de *${surgeryType}* do paciente *${patientName}* foi salvo automaticamente no Google Drive. ✅\n\n` +
      `📋 Processo concluído com sucesso!`,

    RECUSADO: 
      `❌ *Contrato Recusado*\n\n` +
      `${signerName ? `*${signerName}*` : 'Um signatário'} recusou o contrato de *${surgeryType}* do paciente *${firstName}*.\n\n` +
      `⚠️ Verifique o histórico para mais detalhes.`
  };

  const message = messages[event];
  if (!message) return;

  // Enviar para todos os números de notificação em paralelo
  const results = await Promise.allSettled(
    NOTIFY_NUMBERS.map(num => sendMessage(num, message))
  );

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value.success) {
      console.log(`[Notificação] ✅ Enviado para ${NOTIFY_NUMBERS[i]}`);
    } else {
      const error = r.status === 'rejected' ? r.reason : r.value?.error;
      console.error(`[Notificação] ❌ Falha para ${NOTIFY_NUMBERS[i]}:`, error);
    }
  });
}
