import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadSignedPdfToDrive } from '@/actions/googledrive';
import { sendStatusNotification } from '@/actions/whatsapp';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    console.log('[Webhook ZapSign] Evento recebido:', JSON.stringify(payload).substring(0, 500));

    const eventType = payload.event_type;
    const zapsignToken = payload.token || payload.doc_token;
    const docStatus = payload.status; // Status global do documento
    
    if (!zapsignToken) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Buscar contrato pelo token do ZapSign
    const contract = await prisma.contract.findFirst({ where: { zapsignToken } });
    if (!contract) {
      console.log(`[Webhook] Contrato não encontrado para token: ${zapsignToken}`);
      return NextResponse.json({ success: true, message: 'Contract not found, ignored' });
    }

    const contractId = contract.id;
    const patientName = contract.patientName;
    const surgeryType = contract.surgeryType;

    // ══════════════════════════════════════════════════════════════
    // TRATAR CADA TIPO DE EVENTO
    // ══════════════════════════════════════════════════════════════

    switch (eventType) {
      // ── Documento visualizado pelo signatário ──
      case 'doc_viewed':
      case 'doc_read_confirmation': {
        // Só atualizar se estiver em estado anterior (PENDENTE ou ENVIADO)
        if (['PENDENTE', 'ENVIADO'].includes(contract.status)) {
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'VISUALIZADO' }
          });
          
          await sendStatusNotification({
            patientName, surgeryType,
            event: 'VISUALIZADO'
          });
          
          console.log(`[Webhook] 👁️ Contrato ${contractId} → VISUALIZADO`);
        }
        break;
      }

      // ── Alguém assinou (pode ser parcial ou total) ──
      case 'doc_signed': {
        // Verificar se TODOS os signatários assinaram
        const allSigned = docStatus === 'signed';
        
        // Descobrir quem acabou de assinar
        let signerName = '';
        if (payload.signers && Array.isArray(payload.signers)) {
          const justSigned = payload.signers.find((s: any) => s.status === 'signed');
          if (justSigned) signerName = justSigned.name;
        }

        if (allSigned) {
          // ── TOTALMENTE ASSINADO ──
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'ASSINADO' }
          });

          console.log(`[Webhook] ✅ Contrato ${contractId} → ASSINADO (todas as partes)`);

          await sendStatusNotification({
            patientName, surgeryType,
            event: 'ASSINADO'
          });

          // ── UPLOAD AUTOMÁTICO PARA O GOOGLE DRIVE ──
          if (!contract.googleDriveFileId) {
            // Pequeno delay para garantir que o PDF está disponível na ZapSign
            setTimeout(async () => {
              try {
                console.log(`[Webhook] ☁️ Iniciando upload automático para Drive...`);
                const result = await uploadSignedPdfToDrive(contractId);
                
                if (result.success) {
                  // Atualizar status para DRIVE_OK
                  await prisma.contract.update({
                    where: { id: contractId },
                    data: { status: 'DRIVE_OK' }
                  });
                  
                  console.log(`[Webhook] ☁️ PDF salvo no Drive: ${result.fileId} → DRIVE_OK`);
                  
                  await sendStatusNotification({
                    patientName, surgeryType,
                    event: 'DRIVE_OK'
                  });
                } else {
                  console.error(`[Webhook] ❌ Falha no upload Drive: ${result.error}`);
                  // Tentar novamente após 30 segundos
                  setTimeout(async () => {
                    const retry = await uploadSignedPdfToDrive(contractId);
                    if (retry.success) {
                      await prisma.contract.update({
                        where: { id: contractId },
                        data: { status: 'DRIVE_OK' }
                      });
                      console.log(`[Webhook] ☁️ Retry bem-sucedido! Drive: ${retry.fileId}`);
                      await sendStatusNotification({
                        patientName, surgeryType,
                        event: 'DRIVE_OK'
                      });
                    }
                  }, 30000);
                }
              } catch (err) {
                console.error('[Webhook] Erro no upload automático:', err);
              }
            }, 5000); // 5s delay para o PDF ficar disponível
          }

        } else {
          // ── ASSINATURA PARCIAL ──
          if (contract.status !== 'ASSINADO' && contract.status !== 'DRIVE_OK') {
            await prisma.contract.update({
              where: { id: contractId },
              data: { status: 'ASSINATURA_PARCIAL' }
            });

            console.log(`[Webhook] ✍️ Contrato ${contractId} → ASSINATURA_PARCIAL (${signerName})`);

            await sendStatusNotification({
              patientName, surgeryType,
              event: 'ASSINATURA_PARCIAL',
              signerName
            });
          }
        }
        break;
      }

      // ── Documento recusado ──
      case 'doc_refused': {
        let refuserName = '';
        if (payload.signers && Array.isArray(payload.signers)) {
          const refused = payload.signers.find((s: any) => s.status === 'refused');
          if (refused) refuserName = refused.name;
        }

        await prisma.contract.update({
          where: { id: contractId },
          data: { status: 'RECUSADO' }
        });

        console.log(`[Webhook] ❌ Contrato ${contractId} → RECUSADO por ${refuserName}`);

        await sendStatusNotification({
          patientName, surgeryType,
          event: 'RECUSADO',
          signerName: refuserName
        });
        break;
      }

      default:
        console.log(`[Webhook] Evento ignorado: ${eventType}`);
    }

    return NextResponse.json({ success: true, message: `Processed: ${eventType}` });

  } catch (error) {
    console.error('[Webhook] Erro:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
