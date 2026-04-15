import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadSignedPdfToDrive } from '@/actions/googledrive';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    // A API da ZapSign envia o status no evento 'doc_signed' ou 'doc_completed'
    // Exemplo de payload dependendo do webhook da zapsign:
    // { event_type: 'doc_signed', doc_token: 'xyz123', status: 'signed' }
    
    const eventType = payload.event_type;
    const zapsignToken = payload.doc_token;
    
    if (!zapsignToken) {
      return NextResponse.json({ error: 'Missing doc_token' }, { status: 400 });
    }

    if (eventType === 'doc_signed' || payload.status === 'signed') {
      // Atualizar o banco de dados
      const updated = await prisma.contract.updateMany({
        where: { zapsignToken },
        data: { status: 'ASSINADO' }
      });

      // Upload automático para o Google Drive
      if (updated.count > 0) {
        const contract = await prisma.contract.findFirst({ where: { zapsignToken } });
        if (contract) {
          // Dispara upload em background (não bloqueia a resposta do webhook)
          uploadSignedPdfToDrive(contract.id)
            .then(result => {
              if (result.success) {
                console.log(`[Webhook] ✅ PDF salvo no Google Drive: ${result.fileId}`);
              } else {
                console.error(`[Webhook] ❌ Falha ao salvar no Drive: ${result.error}`);
              }
            })
            .catch(err => console.error('[Webhook] Erro no upload para Drive:', err));
        }
      }

      return NextResponse.json({ success: true, message: 'Contract marked as signed, Drive upload initiated' });
    }

    return NextResponse.json({ success: true, message: 'Ignored event' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

