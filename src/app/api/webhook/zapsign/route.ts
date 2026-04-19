import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadSignedPdfToDrive } from '@/actions/googledrive';
import { sendStatusNotification } from '@/actions/whatsapp';

const ZAPSIGN_TOKEN = process.env.ZAPSIGN_API_TOKEN || '';

/**
 * Consulta o status real e completo do documento via API ZapSign.
 * A doc da ZapSign recomenda não depender apenas do payload do webhook.
 */
async function getDocumentDetails(docToken: string) {
  try {
    const response = await fetch(
      `https://api.zapsign.com.br/api/v1/docs/${docToken}/?api_token=${ZAPSIGN_TOKEN}`,
      { method: 'GET' }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    console.log('[Webhook ZapSign] Payload completo:', JSON.stringify(payload).substring(0, 1000));

    const eventType = payload.event_type;
    
    // ZapSign envia doc_token no payload ou dentro de document.token
    const docToken = payload.doc_token 
      || payload.token 
      || payload.document?.token;
    
    const signerName = payload.name || '';
    
    if (!docToken) {
      console.log('[Webhook] Nenhum doc_token encontrado no payload');
      return NextResponse.json({ error: 'Missing doc_token' }, { status: 400 });
    }

    console.log(`[Webhook] Event: ${eventType} | doc_token: ${docToken} | signer: ${signerName}`);

    // Buscar contrato pelo token do ZapSign
    const contract = await prisma.contract.findFirst({ where: { zapsignToken: docToken } });
    if (!contract) {
      console.log(`[Webhook] Contrato não encontrado para token: ${docToken}`);
      return NextResponse.json({ success: true, message: 'Contract not found, ignored' });
    }

    const contractId = contract.id;
    const patientName = contract.patientName;
    const surgeryType = contract.surgeryType;

    console.log(`[Webhook] Contrato encontrado: ${contractId} | Status atual: ${contract.status}`);

    // ══════════════════════════════════════════════════════════════
    // TRATAR CADA TIPO DE EVENTO
    // ══════════════════════════════════════════════════════════════

    switch (eventType) {
      // ── Documento visualizado pelo signatário ──
      case 'doc_viewed':
      case 'doc_read_confirmation': {
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

      // ── Alguém assinou ──
      case 'doc_signed':
      case 'signer_signed': {
        // Consultar a API para obter o status REAL do documento
        const docDetails = await getDocumentDetails(docToken);
        
        if (docDetails) {
          console.log(`[Webhook] ZapSign Doc Status: "${docDetails.status}" | Signers:`, 
            docDetails.signers?.map((s: any) => `${s.name}:${s.status}`).join(', '));
          
          const allSigned = docDetails.status === 'signed';
          
          // Pegar o nome de quem assinou
          const signerDisplayName = signerName || payload.signer_name || '';
          
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
            await handleDriveUpload(contractId, patientName, surgeryType);

          } else {
            // ── ASSINATURA PARCIAL ──
            if (!['ASSINADO', 'DRIVE_OK'].includes(contract.status)) {
              await prisma.contract.update({
                where: { id: contractId },
                data: { status: 'ASSINATURA_PARCIAL' }
              });

              console.log(`[Webhook] ✍️ Contrato ${contractId} → ASSINATURA_PARCIAL (${signerDisplayName})`);

              await sendStatusNotification({
                patientName, surgeryType,
                event: 'ASSINATURA_PARCIAL',
                signerName: signerDisplayName
              });
            }
          }
        } else {
          // Fallback se a API estiver indisponível: tratar como parcial
          console.log(`[Webhook] ⚠️ Não conseguiu consultar API, tratando como assinatura parcial`);
          
          if (!['ASSINADO', 'DRIVE_OK', 'ASSINATURA_PARCIAL'].includes(contract.status)) {
            await prisma.contract.update({
              where: { id: contractId },
              data: { status: 'ASSINATURA_PARCIAL' }
            });
            
            await sendStatusNotification({
              patientName, surgeryType,
              event: 'ASSINATURA_PARCIAL',
              signerName
            });
          }
        }
        break;
      }

      // ── Documento completamente finalizado (evento alternativo da ZapSign) ──
      case 'doc_completed':
      case 'doc_finalized': {
        if (!['ASSINADO', 'DRIVE_OK'].includes(contract.status)) {
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'ASSINADO' }
          });

          console.log(`[Webhook] ✅ Contrato ${contractId} → ASSINADO (via ${eventType})`);

          await sendStatusNotification({
            patientName, surgeryType,
            event: 'ASSINADO'
          });

          await handleDriveUpload(contractId, patientName, surgeryType);
        }
        break;
      }

      // ── Documento recusado ──
      case 'doc_refused':
      case 'signer_refused': {
        await prisma.contract.update({
          where: { id: contractId },
          data: { status: 'RECUSADO' }
        });

        console.log(`[Webhook] ❌ Contrato ${contractId} → RECUSADO por ${signerName}`);

        await sendStatusNotification({
          patientName, surgeryType,
          event: 'RECUSADO',
          signerName
        });
        break;
      }

      default:
        console.log(`[Webhook] Evento não tratado: ${eventType}`);
    }

    return NextResponse.json({ success: true, message: `Processed: ${eventType}` });

  } catch (error) {
    console.error('[Webhook] Erro:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Faz o upload do PDF assinado para o Google Drive com retry.
 */
async function handleDriveUpload(contractId: string, patientName: string, surgeryType: string) {
  // Recarregar o contrato para verificar se já não foi feito
  const freshContract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (freshContract?.googleDriveFileId) {
    console.log(`[Webhook] Drive upload já existe, ignorando`);
    return;
  }

  // Esperar 5s para o PDF ficar disponível na ZapSign
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log(`[Webhook] ☁️ Iniciando upload automático para Drive...`);
    const result = await uploadSignedPdfToDrive(contractId);
    
    if (result.success) {
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
      
      // Retry após 15 segundos
      await new Promise(resolve => setTimeout(resolve, 15000));
      
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
      } else {
        console.error(`[Webhook] ❌ Retry também falhou: ${retry.error}`);
      }
    }
  } catch (err) {
    console.error('[Webhook] Erro no upload automático:', err);
  }
}
