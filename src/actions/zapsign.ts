'use server';

import { prisma } from '@/lib/prisma';
import { generateDocument } from './document';
import { getTemplateByName } from './contracts';
import { requireAuth } from '@/lib/auth';
import { uploadSignedPdfToDrive } from './googledrive';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

// O token de API deverá ser configurado nas variáveis de ambiente: ZAPSIGN_API_TOKEN
const ZAPSIGN_TOKEN = process.env.ZAPSIGN_API_TOKEN || 'INSIRA_O_SEU_TOKEN_AQUI';

export async function sendToZapsign(contractId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error("Contrato não encontrado");

  // 1. Gera o arquivo DOCX via docxtemplater em um Buffer
  const docxBuffer = await generateDocument(contractId);
  const base64Doc = docxBuffer.toString('base64');

  // 2. Chama a API da ZapSign
  // Nota: A ZapSign aceita docx através do parâmetro base64_docx (ou base64_pdf dependendo do endpoint)
  const templateInfo = await getTemplateByName(contract.surgeryType);
  const templatePath = path.join(process.cwd(), 'templates', templateInfo?.baseFilename || '');
  let hasResponsavel = false;
  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const xml = zip.file('word/document.xml')?.asText() || '';
    // Extrair texto somente de <w:t> para lidar com fragmentação do Word
    // (o Word pode dividir "{{{assinatura_responsavel}}}" em 3+ runs separados)
    const tTexts: string[] = [];
    xml.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => { tTexts.push(t); return _; });
    const plainText = tTexts.join('');
    hasResponsavel = /\{\{\{\s*assinatura_responsavel\s*\}\s*\}\s*\}/.test(plainText);
    
    // Também verificar nos footers/headers
    if (!hasResponsavel) {
      const footerFiles = Object.keys(zip.files).filter(f => f.match(/^word\/(footer|header)\d*\.xml$/));
      for (const footerFile of footerFiles) {
        const footerXml = zip.file(footerFile)?.asText() || '';
        const fTexts: string[] = [];
        footerXml.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => { fTexts.push(t); return _; });
        if (/rubrica_responsavel/.test(fTexts.join(''))) {
          hasResponsavel = true;
          break;
        }
      }
    }
  }

  // Descobre o nome do responsável caso o paciente tenha preenchido no formulário
  let nomeResponsavel = "Responsável Legal do Paciente";
  if (hasResponsavel && contract.formData) {
     try {
       const fd = JSON.parse(contract.formData);
       const respKey = Object.keys(fd).find(k => k.toLowerCase().includes('responsavel') || k.toLowerCase().includes('responsável'));
       if (respKey && fd[respKey]) {
          nomeResponsavel = fd[respKey];
       }
     } catch(e) {}
  }

  // ── Monta a lista de signatários com âncoras via signature_placement ──
  // Campos corretos da API ZapSign para posicionamento automático:
  //   signature_placement  → texto no doc onde a assinatura será posicionada
  //   rubrica_placement    → texto no doc onde a rubrica será posicionada
  const signersPayload: any[] = [
    {
      name: contract.patientName,
      auth_mode: "assinaturaTela",
      signature_placement: "{{{assinatura_paciente}}}",
      rubrica_placement: "{{{rubrica_paciente}}}"
    },
    {
      name: "LUIZ EDUARDO MAMEDE - MÉDICO",
      auth_mode: "assinaturaTela",
      send_via: "email",
      email: "luizedumg@gmail.com",
      signature_placement: "{{{assinatura_dr}}}",
      rubrica_placement: "{{{rubrica_dr}}}"
    }
  ];

  if (hasResponsavel) {
     signersPayload.push({
        name: nomeResponsavel,
        auth_mode: "assinaturaTela",
        signature_placement: "{{{assinatura_responsavel}}}",
        rubrica_placement: "{{{rubrica_responsavel}}}"
     });
  }

  const zapsignPayload = {
    name: `Consentimento Cirúrgico - ${contract.patientName}`,
    base64_docx: base64Doc,
    signers: signersPayload,
    lang: "pt-br",
    folder_path: "/Prontuários"
  };

  console.log("[ZapSign] Enviando documento com", signersPayload.length, "signatários");

  const response = await fetch(`https://api.zapsign.com.br/api/v1/docs/?api_token=${ZAPSIGN_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zapsignPayload)
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error("[ZapSign] Resposta não-JSON:", responseText.substring(0, 500));
    throw new Error("ZapSign retornou resposta inválida. Verifique o token da API.");
  }

  if (!response.ok) {
     console.error("Erro ZapSign:", data);
     const errorMessage = data.detail || JSON.stringify(data);
     throw new Error("ZapSign recusou: " + errorMessage);
  }

  console.log("[ZapSign] Documento criado com sucesso. Token:", data.token);
  data.signers.forEach((s: any, idx: number) => {
    console.log(`[ZapSign]   Signer[${idx}] "${s.name}" → sign_url: ${s.sign_url?.substring(0, 60)}...`);
  });

  // ── Encontra o signer do PACIENTE pela correspondência de nome ──
  const patientNameLower = contract.patientName.toLowerCase().trim();
  const patientSigner = data.signers.find((s: any) =>
    s.name.toLowerCase().trim() === patientNameLower
  );

  // Fallback: se não achar por nome exato, pega o que NÃO é o médico nem o responsável
  const doctorName = "LUIZ EDUARDO MAMEDE - MÉDICO";
  const fallbackSigner = data.signers.find((s: any) =>
    s.name.toUpperCase() !== doctorName && 
    s.name.toLowerCase().trim() !== nomeResponsavel.toLowerCase().trim()
  );

  const chosenSigner = patientSigner || fallbackSigner || data.signers[0];
  console.log(`[ZapSign] ✅ Signer escolhido para o paciente: "${chosenSigner.name}"`);

  // ── Encontra o signer do RESPONSÁVEL (se houver) ──
  let responsavelSignUrl: string | null = null;
  if (hasResponsavel && nomeResponsavel) {
    const respNameLower = nomeResponsavel.toLowerCase().trim();
    const respSigner = data.signers.find((s: any) =>
      s.name.toLowerCase().trim() === respNameLower
    );
    if (respSigner) {
      responsavelSignUrl = respSigner.sign_url;
      console.log(`[ZapSign] ✅ Signer do responsável: "${respSigner.name}"`);
    }
  }

  // Atualiza banco com o Token do documento e URLs persistidas para rastreamento
  await prisma.contract.update({
    where: { id: contractId },
    data: { 
      zapsignToken: data.token,
      patientSignUrl: chosenSigner.sign_url,
      responsavelSignUrl: responsavelSignUrl,
      nomeResponsavel: hasResponsavel ? nomeResponsavel : null,
      signUrlsCreatedAt: new Date(),
      status: 'VISUALIZADO'
    }
  });

  return {
    success: true,
    signUrl: chosenSigner.sign_url,
    responsavelSignUrl,
    nomeResponsavel: hasResponsavel ? nomeResponsavel : null
  };
}

export async function checkZapsignDocumentStatus(contractId: string) {
  await requireAuth();
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || !contract.zapsignToken) return null;

  try {
    const response = await fetch(`https://api.zapsign.com.br/api/v1/docs/${contract.zapsignToken}/?api_token=${ZAPSIGN_TOKEN}`, {
      method: 'GET'
    });
    
    if (!response.ok) return null;
    const data = await response.json();

    // ── TOTALMENTE ASSINADO ──
    if (data.status === 'signed') {
       if (!['ASSINADO', 'DRIVE_OK'].includes(contract.status)) {
         // Re-ler o contrato para evitar race condition com o webhook
         const fresh = await prisma.contract.findUnique({ where: { id: contractId } });
         if (fresh && !['ASSINADO', 'DRIVE_OK'].includes(fresh.status)) {
           await prisma.contract.update({
             where: { id: contractId },
             data: { status: 'ASSINADO' }
           });
           console.log(`[Polling] ✅ Contrato ${contractId} → ASSINADO (fallback — webhook não processou)`);
         }
       }

       // Garante o arquivamento no Drive mesmo que o webhook não tenha subido o
       // PDF (uploadSignedPdfToDrive é idempotente: sai cedo se já há arquivo).
       const afterSign = await prisma.contract.findUnique({ where: { id: contractId } });
       if (afterSign && !afterSign.googleDriveFileId) {
         const up = await uploadSignedPdfToDrive(contractId);
         if (up.success && afterSign.status !== 'DRIVE_OK') {
           await prisma.contract.update({
             where: { id: contractId },
             data: { status: 'DRIVE_OK' }
           });
           console.log(`[Polling] ☁️ PDF arquivado no Drive (fallback) → DRIVE_OK`);
         }
       }
    }
    // ── ASSINATURA PARCIAL (algum signatário assinou, mas não todos) ──
    else if (data.status !== 'signed' && !['ASSINADO', 'DRIVE_OK', 'ASSINATURA_PARCIAL'].includes(contract.status)) {
      const signers = data.signers || [];
      const signedSigners = signers.filter((s: any) => s.status === 'signed');
      
      if (signedSigners.length > 0 && signedSigners.length < signers.length) {
        // Re-ler para evitar race condition
        const fresh = await prisma.contract.findUnique({ where: { id: contractId } });
        if (fresh && !['ASSINADO', 'DRIVE_OK', 'ASSINATURA_PARCIAL'].includes(fresh.status)) {
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'ASSINATURA_PARCIAL' }
          });
          console.log(`[Polling] ✍️ Contrato ${contractId} → ASSINATURA_PARCIAL (fallback)`);
        }
      }
    }

    return {
      status: data.status,
      signedFileUrl: data.signed_file || null,
      signers: (data.signers || []).map((s: any) => ({
        name: s.name,
        status: s.status,
        sign_url: s.sign_url || null
      }))
    };
  } catch (err) {
    console.error("Erro ao checar status na ZapSign", err);
    return null;
  }
}

/**
 * Busca a URL de assinatura do médico (Dr. Luiz Eduardo Mamede) na ZapSign.
 * Retorna a sign_url do signer do médico, permitindo assinatura direta do painel admin.
 */
export async function getDoctorSignUrl(contractId: string): Promise<{ success: boolean; signUrl?: string; error?: string; doctorStatus?: string }> {
  await requireAuth();
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || !contract.zapsignToken) {
    return { success: false, error: 'Contrato não possui documento na ZapSign.' };
  }

  try {
    const response = await fetch(`https://api.zapsign.com.br/api/v1/docs/${contract.zapsignToken}/?api_token=${ZAPSIGN_TOKEN}`, {
      method: 'GET'
    });

    if (!response.ok) {
      return { success: false, error: 'Erro ao consultar ZapSign.' };
    }

    const data = await response.json();
    const signers = data.signers || [];

    // Encontrar o signer do médico pelo nome
    const doctorSigner = signers.find((s: any) =>
      s.name.toUpperCase().includes('LUIZ EDUARDO MAMEDE') ||
      s.name.toUpperCase().includes('MÉDICO') ||
      s.name.toUpperCase().includes('MEDICO')
    );

    if (!doctorSigner) {
      return { success: false, error: 'Signatário do médico não encontrado neste documento.' };
    }

    if (doctorSigner.status === 'signed') {
      return { success: false, error: 'O médico já assinou este contrato.', doctorStatus: 'signed' };
    }

    if (!doctorSigner.sign_url) {
      return { success: false, error: 'URL de assinatura não disponível.' };
    }

    return { success: true, signUrl: doctorSigner.sign_url, doctorStatus: doctorSigner.status };
  } catch (err) {
    console.error('[getDoctorSignUrl] Erro:', err);
    return { success: false, error: 'Falha na conexão com ZapSign.' };
  }
}
