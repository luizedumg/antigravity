'use server';

import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { revalidatePath } from 'next/cache';
import { GoogleGenAI } from '@google/genai';
import { getApiKeyForProvider } from './apikeys';

const ADMIN_PIN = '1986';

export async function uploadTemplateDocx(formData: FormData) {
  const pin = (formData.get('pin') as string) || '';
  if (pin !== ADMIN_PIN) {
    throw new Error('Senha incorreta. Operação não autorizada.');
  }

  const file = formData.get('file') as File;
  const name = formData.get('name') as string;
  let apiKey = (formData.get('apiKey') as string) || '';
  const aiProvider = (formData.get('aiProvider') as string) || 'gemini';
  const aiModel = (formData.get('aiModel') as string) || 'gemini-2.5-flash';
  const useSavedKey = formData.get('useSavedKey') === 'true';

  // Se não veio uma apiKey manual mas useSavedKey está ativo, buscar do banco
  if (!apiKey && useSavedKey) {
    const savedKey = await getApiKeyForProvider(aiProvider);
    if (savedKey) apiKey = savedKey;
  }

  if (!file || !name) throw new Error('O arquivo DOCX e o nome da Cirurgia são obrigatórios.');

  // Salva o arquivo no disco
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const templatesDir = path.join(process.cwd(), 'templates');
  
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir);
  }
  
  const filePath = path.join(templatesDir, filename);
  fs.writeFileSync(filePath, buffer);

  // Lê a estrutura do ZIP (DOCX)
  const zip = new PizZip(buffer);
  
  // O texto corrido geralmente está no document.xml
  const documentXml = zip.file('word/document.xml')?.asText();
  if (!documentXml) throw new Error('Não foi possível ler a estrutura document.xml do docx');

  // Strip XML tags before matching so negative lookbehinds work on pure text like "{{{assinatura}}}"
  const cleanText = documentXml.replace(/<[^>]*>?/gm, '');
  
  // Regex para encontrar apenas {{tags_dinamicas}} duplas, ignorando {{{chaves_triplas}}}
  const tagRegex = /(?<!\{)\{\{([^{}]+)\}\}(?!\})/g;
  const tagsFound = new Set<string>();
  let match;
  while ((match = tagRegex.exec(cleanText)) !== null) {
      const tag = match[1].trim(); 
      if (tag && tag.length < 50) tagsFound.add(tag);
  }

  // Lista de tags padrões que o nosso sistema preenche no arquivo contracts.ts
  const ignoreTags = ['nome_paciente', 'cpf_paciente', 'endereco_paciente', 'cirurgia'];
  const customTags = Array.from(tagsFound).filter(t => !ignoreTags.includes(t));

  let finalQuestions = [];

  // Chama a IA selecionada se a API Key estiver presente
  if (apiKey && customTags.length > 0) {
     try {
         const prompt = `Você é um curador e assistente de formulários médicos premium. O sistema identificou algumas variáveis brutas dentro de um modelo Word. Sua tarefa é transformar essas chaves num array JSON de perguntas fáceis para o paciente responder. Deduza se é uma pergunta de "Sim/Não" ("boolean") ou campo aberto ("text").
Variáveis Extraídas: ${JSON.stringify(customTags)}
Devolva APENAS um Array JSON puro (sem marcação \`\`\`json): [{"key": "variavel_original", "label": "Título da pergunta bonito", "type": "text ou boolean"}]`;

         let text = '[]';
         
         if (aiProvider === 'gemini') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: aiModel,
                contents: prompt,
            });
            text = response.text || '[]';
         } else if (aiProvider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
               body: JSON.stringify({
                  model: aiModel,
                  messages: [{ role: 'user', content: prompt }]
               })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            text = data.choices[0].message.content;
         } else if (aiProvider === 'claude') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
               method: 'POST',
               headers: { 
                 'Content-Type': 'application/json', 
                 'x-api-key': apiKey,
                 'anthropic-version': '2023-06-01'
               },
               body: JSON.stringify({
                  model: aiModel,
                  max_tokens: 1024,
                  messages: [{ role: 'user', content: prompt }]
               })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            text = data.content[0].text;
         }

         text = text.replace(/```json/g, '').replace(/```/g, '').trim();
         finalQuestions = JSON.parse(text);
     } catch (err) {
         console.error('Falha ao acionar Inteligência Artificial:', err);
         finalQuestions = customTags.map(tag => ({ key: tag, label: tag.replace(/_/g, ' '), type: 'text' }));
     }
  } else {
      // Fallback sem IA
      finalQuestions = customTags.map(tag => ({ key: tag, label: tag.replace(/_/g, ' '), type: 'text' }));
  }

  // Cria no banco de dados Prisma
  await prisma.surgeryTemplate.create({
    data: {
      name,
      baseFilename: filename,
      questionsJson: JSON.stringify(finalQuestions)
    }
  });

  revalidatePath('/admin/templates');
  return { success: true, customTagsFound: customTags.length };
}
