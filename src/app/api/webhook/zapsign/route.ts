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

/**
 * Hierarquia de status — um status só pode avançar, nunca retroceder.
 * Isso previne reprocessamento quando múltiplos webhooks chegam para o mesmo evento.
 */
const STATUS_ORDER = ['PENDENTE', 'ENVIADO', 'VISUALIZADO', 'ASSINATURA_PARCIAL', 'ASSINADO', 'DRIVE_OK'];

function canTransition(currentStatus: string, newStatus: string): boolean {
  // RECUSADO pode vir de qualquer status
  if (newStatus === 'RECUSADO') return currentStatus !== 'RECUSADO';
  
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  
  // Só avança, nunca retrocede ou repete
  return newIdx > currentIdx;
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
        if (canTransition(contract.status, 'VISUALIZADO')) {
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'VISUALIZADO' }
          });
          
          await sendStatusNotification({
            patientName, surgeryType,
            event: 'VISUALIZADO'
          });
          
          console.log(`[Webhook] 👁️ Contrato ${contractId} → VISUALIZADO`);
        } else {
          console.log(`[Webhook] ⏭️ Ignorado: ${contract.status} → VISUALIZADO (já processado)`);
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
            if (canTransition(contract.status, 'ASSINADO')) {
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
              console.log(`[Webhook] ⏭️ Ignorado: ${contract.status} → ASSINADO (já processado)`);
            }

          } else {
            // ── ASSINATURA PARCIAL ──
            if (canTransition(contract.status, 'ASSINATURA_PARCIAL')) {
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
            } else {
              console.log(`[Webhook] ⏭️ Ignorado: ${contract.status} → ASSINATURA_PARCIAL (já processado)`);
            }
          }
        } else {
          // Fallback se a API estiver indisponível: tratar como parcial
          console.log(`[Webhook] ⚠️ Não conseguiu consultar API, tratando como assinatura parcial`);
          
          if (canTransition(contract.status, 'ASSINATURA_PARCIAL')) {
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
        if (canTransition(contract.status, 'ASSINADO')) {
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
        } else {
          console.log(`[Webhook] ⏭️ Ignorado: ${contract.status} → ASSINADO via ${eventType} (já processado)`);
        }
        break;
      }

      // ── Documento recusado ──
      case 'doc_refused':
      case 'signer_refused': {
        if (canTransition(contract.status, 'RECUSADO')) {
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
        } else {
          console.log(`[Webhook] ⏭️ Ignorado: já estava RECUSADO`);
        }
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
 * Inclui guard de idempotência para evitar uploads duplicados.
 */
async function handleDriveUpload(contractId: string, patientName: string, surgeryType: string) {
  // Recarregar o contrato para verificar se já não foi feito
  const freshContract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (freshContract?.googleDriveFileId) {
    console.log(`[Webhook] ⏭️ Drive upload já existe (${freshContract.googleDriveFileId}), ignorando`);
    return;
  }

  // Guard extra: se o status já é DRIVE_OK, outro processo já tratou
  if (freshContract?.status === 'DRIVE_OK') {
    console.log(`[Webhook] ⏭️ Status já é DRIVE_OK, ignorando upload`);
    return;
  }

  // Esperar 5s para o PDF ficar disponível na ZapSign
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log(`[Webhook] ☁️ Iniciando upload automático para Drive...`);
    const result = await uploadSignedPdfToDrive(contractId);
    
    if (result.success) {
      // Verificar mais uma vez antes de atualizar (race condition protection)
      const checkAgain = await prisma.contract.findUnique({ where: { id: contractId } });
      if (checkAgain?.status === 'DRIVE_OK') {
        console.log(`[Webhook] ⏭️ Outro processo já atualizou para DRIVE_OK`);
        return;
      }

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
      
      // Verificar se outro processo já resolveu
      const preRetry = await prisma.contract.findUnique({ where: { id: contractId } });
      if (preRetry?.status === 'DRIVE_OK' || preRetry?.googleDriveFileId) {
        console.log(`[Webhook] ⏭️ Outro processo já fez upload no Drive durante o retry`);
        return;
      }

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
