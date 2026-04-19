'use server';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';

/**
 * Envia uma mensagem de texto via Evolution API (WhatsApp Business)
 * A mensagem é enviada a partir do número conectado na instância configurada.
 */
export async function sendWhatsAppMessage(data: { 
  patientWhatsApp: string; 
  patientName: string;
  contractLink: string;
}): Promise<{ success: boolean; error?: string }> {
  
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    return { success: false, error: 'Evolution API não configurada. Verifique as variáveis de ambiente.' };
  }

  const message = 
    `Olá, ${data.patientName.split(' ')[0]}! 👋\n\n` +
    `Segue o link para assinatura do seu contrato de cirurgia.\n\n` +
    `Basta clicar no link abaixo, preencher os campos do formulário e seguir as instruções na tela.\n\n` +
    `⚠️ *Atenção:* na etapa de assinatura, informe seu e-mail corretamente — é por ele que você receberá o token de validação da ZapSign para concluir o processo.\n\n` +
    `🔗 ${data.contractLink}`;

  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: data.patientWhatsApp,
        text: message
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Evolution API] Erro:', result);
      return { success: false, error: result?.message || JSON.stringify(result) };
    }

    console.log(`[Evolution API] ✅ Mensagem enviada para ${data.patientWhatsApp}`);
    return { success: true };

  } catch (err: any) {
    console.error('[Evolution API] Erro de conexão:', err);
    return { success: false, error: err.message || 'Falha na conexão com a Evolution API' };
  }
}
