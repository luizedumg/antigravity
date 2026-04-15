'use server';

import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { getTemplateByName } from './contracts';

// Lista de todas as âncoras possíveis no sistema
const ANCHOR_NAMES = [
  'assinatura_paciente', 'assinatura_dr', 'assinatura_responsavel',
  'rubrica_paciente', 'rubrica_dr', 'rubrica_responsavel'
];

export async function generateDocument(contractId: string) {
  // 1. Busca os dados do contrato
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract) throw new Error('Contract not found');

  // 2. Busca o template da cirurgia para saber qual é o nome do arquivo-base
  const templateInfo = await getTemplateByName(contract.surgeryType);
  if (!templateInfo || !templateInfo.baseFilename) {
    throw new Error('Template file not associated for this surgery');
  }

  // 3. Lê o arquivo docx
  const templatePath = path.join(process.cwd(), 'templates', templateInfo.baseFilename);
  
  if (!fs.existsSync(templatePath)) {
     throw new Error(`O arquivo base ${templateInfo.baseFilename} não existe na pasta /templates`);
  }

  let dynamicData: Record<string, string> = {};
  if (contract.formData) {
     try { dynamicData = JSON.parse(contract.formData); } catch(e) {}
  }

  const mergedData: Record<string, string> = {
     nome_paciente: contract.patientName,
     cpf_paciente: contract.patientCpf,
     endereco_paciente: contract.patientAddress,
     cirurgia: contract.surgeryType,
     ...dynamicData 
  };

  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  // ── Função auxiliar: substitui apenas tags de chaves DUPLAS {{key}} ──
  // Tags de chaves TRIPLAS {{{anchor}}} são PRESERVADAS intactas para a ZapSign
  function replaceDataInXml(xml: string): string {
    for (const [key, value] of Object.entries(mergedData)) {
      if (!value) continue;
      const spacedKey = key.split('').join('(?:<[^>]*>)*');
      const patternStr = '(?<!\\{)\\{\\{(?:<[^>]*>)*' + spacedKey + '(?:<[^>]*>)*\\}\\}(?!\\})';
      const regex = new RegExp(patternStr, 'g');
      xml = xml.replace(regex, value.toString());
    }
    return xml;
  }

  // ══════════════════════════════════════════════════════════════════════
  // NOVA ABORDAGEM: Cirurgia a nível de RUN (não reconstrói parágrafos)
  //
  // A abordagem anterior reconstruía parágrafos inteiros quando encontrava 
  // âncoras, destruindo:
  //   - Campos de numeração do Word (PAGE, NUMPAGES)
  //   - Formatação complexa (tabs, negrito, etc.)
  //   - Posicionamento de elementos no rodapé
  //
  // Nova abordagem:
  //   1. Para cada parágrafo, extrair texto SOMENTE de <w:t> (ignorar <w:instrText>)
  //   2. Encontrar spans de âncoras no texto concatenado
  //   3. Mapear chars de volta para runs específicos
  //   4. Modificar APENAS os runs que contêm texto de âncora (cor branca, 1pt)
  //   5. Preservar TUDO o mais (campos, tabs, formatação, outros runs)
  //   6. NÃO deduplicar — manter todas as ocorrências para a ZapSign
  // ══════════════════════════════════════════════════════════════════════

  function processAnchorsInXml(xml: string, shrinkSize: boolean): string {
    return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
      // ─── Passo 1: Extrair texto somente de <w:t> (ignora instrText, etc.) ───
      const tTexts: string[] = [];
      paragraph.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => { tTexts.push(t); return _; });
      const fullText = tTexts.join('');

      // ─── Passo 2: Verificar se alguma âncora existe neste parágrafo ───
      const anchorsHere: string[] = [];
      for (const a of ANCHOR_NAMES) {
        if (new RegExp('\\{\\{\\{\\s*' + a + '\\s*\\}\\s*\\}\\s*\\}').test(fullText)) {
          anchorsHere.push(a);
        }
      }
      if (anchorsHere.length === 0) return paragraph; // Nada a fazer

      // ─── Passo 3: Encontrar todos os <w:r> e suas contribuições de texto ───
      const runRegex = /<w:r\b[^>]*>[\s\S]*?<\/w:r>/g;
      const runs: { index: number; length: number; xml: string; text: string; textStart: number }[] = [];
      let m;
      let textPos = 0;
      while ((m = runRegex.exec(paragraph)) !== null) {
        let text = '';
        m[0].replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => { text += t; return _; });
        runs.push({
          index: m.index,
          length: m[0].length,
          xml: m[0],
          text,
          textStart: textPos
        });
        textPos += text.length;
      }

      // ─── Passo 4: Encontrar spans das âncoras no texto concatenado ───
      const concatenated = runs.map(r => r.text).join('');
      const anchorSpans: { start: number; end: number }[] = [];
      for (const a of anchorsHere) {
        const pattern = new RegExp('\\{\\{\\{\\s*' + a + '\\s*\\}\\s*\\}\\s*\\}', 'g');
        let am;
        while ((am = pattern.exec(concatenated)) !== null) {
          anchorSpans.push({ start: am.index, end: am.index + am[0].length });
        }
      }

      // ─── Passo 5: Marcar runs que contêm texto de âncora ───
      const anchorRunIndices = new Set<number>();
      for (let r = 0; r < runs.length; r++) {
        const runTextStart = runs[r].textStart;
        const runTextEnd = runTextStart + runs[r].text.length;
        if (runs[r].text.length === 0) continue; // Runs sem <w:t> (tabs, field chars) não são afetados
        for (const span of anchorSpans) {
          if (runTextStart < span.end && runTextEnd > span.start) {
            anchorRunIndices.add(r);
          }
        }
      }

      // ─── Passo 6: Modificar SOMENTE os runs de âncora para ficarem invisíveis ───
      let result = paragraph;
      // Processar em ordem reversa para manter índices corretos
      const sortedIndices = Array.from(anchorRunIndices).sort((a, b) => b - a);
      for (const ri of sortedIndices) {
        const run = runs[ri];
        const modified = makeRunHidden(run.xml, shrinkSize);
        result = result.substring(0, run.index) + modified + result.substring(run.index + run.length);
      }

      return result;
    });
  }

  /**
   * Modifica um <w:r> para ter texto invisível.
   * - shrinkSize=true  → cor branca + 1pt (para body: assinaturas ficam pequenas)
   * - shrinkSize=false → SOMENTE cor branca, mantém o tamanho original
   *   (para footer: rubricas mantêm espaçamento horizontal correto)
   * Preserva todas as outras propriedades do run (negrito, itálico, etc.)
   * e elementos não-texto (lastRenderedPageBreak, tab, etc.)
   */
  function makeRunHidden(runXml: string, shrinkSize: boolean): string {
    // Somente cor branca para footer/header (preserva tamanho → evita sobreposição de rubricas)
    // Cor branca + 1pt para body (assinaturas não ocupam espaço visual)
    const hiddenProps = shrinkSize
      ? '<w:color w:val="FFFFFF"/><w:sz w:val="2"/><w:szCs w:val="2"/>'
      : '<w:color w:val="FFFFFF"/>';
    
    if (/<w:rPr>/.test(runXml)) {
      // Substituir propriedades existentes de cor (e tamanho se shrink), preservar o resto
      return runXml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, existing) => {
        let cleaned = existing
          .replace(/<w:color\b[^/]*\/>/g, '');
        if (shrinkSize) {
          cleaned = cleaned
            .replace(/<w:sz\b[^/]*\/>/g, '')
            .replace(/<w:szCs\b[^/]*\/>/g, '');
        }
        return `<w:rPr>${cleaned}${hiddenProps}</w:rPr>`;
      });
    } else {
      // Adicionar rPr após a abertura do <w:r>
      return runXml.replace(/(<w:r\b[^>]*>)/, `$1<w:rPr>${hiddenProps}</w:rPr>`);
    }
  }

  // 4. Processa document.xml e footers/headers para substituição de dados
  const xmlParts = Object.keys(zip.files).filter(
    f => f === 'word/document.xml' || f.match(/^word\/(footer|header)\d*\.xml$/)
  );
  
  for (const partName of xmlParts) {
    const file = zip.file(partName);
    if (!file) continue;
    let xml = file.asText();
    
    // PASSO 1: Substitui dados do paciente (apenas chaves duplas {{...}}, preserva triplas {{{...}}})
    xml = replaceDataInXml(xml);
    
    // PASSO 2: Processa âncoras — torna invisível SEM reconstruir parágrafos
    // Sem deduplicação: mantém TODAS as ocorrências para a ZapSign detectar
    //
    // document.xml → shrinkSize=true (assinaturas ficam 1pt para não ocupar espaço)
    // footer/header → shrinkSize=false (rubricas mantêm tamanho original para
    //   ZapSign posicionar cada rubrica em local distinto, sem sobreposição)
    const shrinkSize = (partName === 'word/document.xml');
    xml = processAnchorsInXml(xml, shrinkSize);
    
    zip.file(partName, xml);
  }

  const buf = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
  });

  return buf;
}

export async function generateDocumentHtmlPreview(contractId: string) {
  const mammoth = require('mammoth');
  const docxBuffer = await generateDocument(contractId);
  const result = await mammoth.convertToHtml({ buffer: docxBuffer });
  return result.value; // Retorna HTML renderizável seguro
}
