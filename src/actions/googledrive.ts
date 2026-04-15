'use server';

import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { Readable } from 'stream';

const ZAPSIGN_TOKEN = process.env.ZAPSIGN_API_TOKEN || '';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1W3LZGBjyTaohyanVnsGuYCyx7QZTs3SO';

/**
 * Autentica com OAuth2 usando refresh token (conta pessoal do Gmail).
 * Os arquivos são criados com a cota de armazenamento do próprio usuário.
 */
function getDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Credenciais do Google Drive não configuradas. ' +
      'Execute: node scripts/get-drive-token.js <CLIENT_ID> <CLIENT_SECRET> ' +
      'e adicione GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN ao .env'
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Formata a data para o nome do arquivo: DD-MM-YYYY
 */
function formatDateForFilename(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Baixa o PDF assinado da ZapSign usando o token do documento.
 * Retorna o buffer do PDF ou null se não estiver disponível.
 */
async function downloadSignedPdf(zapsignToken: string): Promise<Buffer | null> {
  try {
    // 1. Buscar info do documento na ZapSign para obter a URL do PDF assinado
    const docResponse = await fetch(
      `https://api.zapsign.com.br/api/v1/docs/${zapsignToken}/?api_token=${ZAPSIGN_TOKEN}`,
      { method: 'GET' }
    );

    if (!docResponse.ok) {
      console.error('[GoogleDrive] Erro ao buscar doc na ZapSign:', docResponse.status);
      return null;
    }

    const docData = await docResponse.json();
    const signedFileUrl = docData.signed_file;

    if (!signedFileUrl) {
      console.error('[GoogleDrive] PDF assinado ainda não disponível na ZapSign');
      return null;
    }

    // 2. Download do PDF
    console.log('[GoogleDrive] Baixando PDF assinado de:', signedFileUrl.substring(0, 80) + '...');
    const pdfResponse = await fetch(signedFileUrl);

    if (!pdfResponse.ok) {
      console.error('[GoogleDrive] Erro ao baixar PDF:', pdfResponse.status);
      return null;
    }

    const arrayBuffer = await pdfResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[GoogleDrive] Erro no download do PDF:', error);
    return null;
  }
}

/**
 * Faz upload do PDF assinado para o Google Drive.
 * Retorna o fileId do arquivo criado no Drive.
 */
async function uploadToDrive(pdfBuffer: Buffer, fileName: string): Promise<string> {
  const drive = getDriveClient();

  const fileMetadata = {
    name: fileName,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(pdfBuffer),
  };

  console.log(`[GoogleDrive] Fazendo upload: "${fileName}" para pasta ${FOLDER_ID}`);

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  });

  console.log(`[GoogleDrive] ✅ Upload concluído! File ID: ${response.data.id}`);
  return response.data.id!;
}

/**
 * Função principal: busca o PDF assinado na ZapSign e faz upload para o Google Drive.
 * Atualiza o registro do contrato com o ID do arquivo no Drive.
 * 
 * Chamada automaticamente quando:
 * - O webhook da ZapSign notifica que o documento foi assinado
 * - O polling detecta status "signed" na ZapSign
 */
export async function uploadSignedPdfToDrive(contractId: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    // 1. Busca o contrato
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      return { success: false, error: 'Contrato não encontrado' };
    }

    // 2. Verifica se já foi feito upload
    if (contract.googleDriveFileId) {
      console.log(`[GoogleDrive] Contrato ${contractId} já possui arquivo no Drive: ${contract.googleDriveFileId}`);
      return { success: true, fileId: contract.googleDriveFileId };
    }

    // 3. Verifica se tem token da ZapSign
    if (!contract.zapsignToken) {
      return { success: false, error: 'Contrato sem token da ZapSign' };
    }

    // 4. Baixa o PDF assinado
    const pdfBuffer = await downloadSignedPdf(contract.zapsignToken);
    if (!pdfBuffer) {
      return { success: false, error: 'PDF assinado não disponível na ZapSign' };
    }

    // 5. Monta o nome do arquivo
    const dateStr = formatDateForFilename(contract.createdAt);
    const sanitizedName = contract.patientName.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
    const sanitizedSurgery = contract.surgeryType.replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
    const fileName = `Consentimento - ${sanitizedName} - ${sanitizedSurgery} - ${dateStr}.pdf`;

    // 6. Faz upload para o Google Drive
    const fileId = await uploadToDrive(pdfBuffer, fileName);

    // 7. Salva o ID no banco
    await prisma.contract.update({
      where: { id: contractId },
      data: { googleDriveFileId: fileId },
    });

    console.log(`[GoogleDrive] ✅ Contrato ${contractId} salvo no Drive com sucesso!`);
    return { success: true, fileId };
  } catch (error: any) {
    console.error('[GoogleDrive] ❌ Erro no upload:', error.message || error);
    return { success: false, error: error.message || 'Erro desconhecido' };
  }
}
