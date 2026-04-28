import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';
import { getApiKeyForProvider } from '@/actions/apikeys';

const SYSTEM_TOKEN = process.env.API_SECRET_TOKEN || 'antigravity-ai-secret-2026';

/**
 * Smart Budget API — Interpreta texto natural e gera orçamentos.
 * 
 * Fluxo em 2 etapas:
 *   1. action: "preview"  → Interpreta o texto e retorna um resumo para confirmação
 *   2. action: "confirm"  → Recebe o preview aprovado e cria o orçamento no banco
 */
export async function POST(req: Request) {
  try {
    // ── Autenticação (Bearer token OU cookie admin) ──
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie') || '';
    const hasAdminCookie = cookieHeader.includes('admin_auth=authenticated');
    const hasValidToken = authHeader === `Bearer ${SYSTEM_TOKEN}`;

    if (!hasValidToken && !hasAdminCookie) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'preview') {
      return handlePreview(body);
    } else if (action === 'confirm') {
      return handleConfirm(body);
    } else {
      return NextResponse.json({ error: 'Ação inválida. Use "preview" ou "confirm".' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[Smart Budget] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor.', details: error.message },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════
//  ETAPA 1 — PREVIEW (interpretar sem criar)
// ═══════════════════════════════════════════════════
async function handlePreview(body: any) {
  const { message } = body;

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return NextResponse.json(
      { error: 'Envie uma mensagem com pelo menos o nome do paciente e o tipo de cirurgia.' },
      { status: 400 }
    );
  }

  // 1. Buscar chave Gemini do banco
  const apiKey = await getApiKeyForProvider('gemini');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Chave API do Gemini não configurada. Acesse Modelos e Variáveis para cadastrá-la.' },
      { status: 400 }
    );
  }

  // 2. Buscar catálogo completo do banco
  const [templates, variables] = await Promise.all([
    prisma.budgetTemplate.findMany(),
    prisma.budgetVariable.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
  ]);

  if (templates.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum modelo de cirurgia cadastrado. Cadastre um modelo primeiro.' },
      { status: 400 }
    );
  }

  // 3. Montar catálogo para o prompt
  const catalogLines: string[] = [];

  catalogLines.push('=== CIRURGIAS DISPONÍVEIS (BudgetTemplates) ===');
  templates.forEach(t => {
    catalogLines.push(`• ID:${t.id} | "${t.name}" | Base: R$ ${t.basePrice.toLocaleString('pt-BR')}`);
  });

  catalogLines.push('');
  catalogLines.push('=== VARIÁVEIS GLOBAIS (BudgetVariables) ===');
  const categories = ['Hospitais', 'Anestesista', 'Cirurgias Complementares', 'Exames', 'Outros'];
  categories.forEach(cat => {
    const varsInCat = variables.filter(v => v.category === cat);
    if (varsInCat.length > 0) {
      catalogLines.push(`\n[${cat}]${cat === 'Hospitais' || cat === 'Anestesista' ? ' (SELEÇÃO ÚNICA — escolher apenas 1)' : ' (MULTI-SELEÇÃO — pode escolher vários)'}`);
      varsInCat.forEach(v => {
        catalogLines.push(`  • ID:${v.id} | "${v.name}" | R$ ${v.price.toLocaleString('pt-BR')}${v.isDefault ? ' (PADRÃO)' : ''}`);
      });
    }
  });

  const catalog = catalogLines.join('\n');

  // 4. Prompt para o Gemini
  const prompt = `Você é um assistente de interpretação de orçamentos cirúrgicos do Dr. Luiz Eduardo.

Sua tarefa: receber uma mensagem informal do administrador e extrair os dados para gerar um orçamento, fazendo MATCHING INTELIGENTE com o catálogo disponível.

CATÁLOGO DISPONÍVEL:
${catalog}

REGRAS OBRIGATÓRIAS:
1. O "patientName" é o nome completo do paciente mencionado na mensagem.
2. Para "surgeryTemplateId": encontre o BudgetTemplate cujo nome mais se aproxima do que foi descrito. Exemplo: "rino com costela" → "Rinoplastia Primária Estruturada Ultrassônica Costal".
3. Para "matchedVariableIds": encontre as BudgetVariables que mais se aproximam do que foi descrito.
4. A ANESTESIA é determinada pelo HOSPITAL e TIPO DE CIRURGIA, NÃO pelo nome do médico anestesista. Ex: "anestesia do santa marta" para uma rinoplastia → buscar "Anestesia Santa Marta (Rino)".
5. Categorias de seleção única (Hospitais, Anestesista): escolha APENAS 1 de cada.
6. Se o admin NÃO mencionar uma variável, NÃO inclua (exceto se marcada como PADRÃO no catálogo).
7. Se mencionar desconto, extraia o valor numérico.
8. Se NÃO conseguir identificar algo com segurança, coloque null e explique em "notes".

MENSAGEM DO ADMIN:
"${message.trim()}"

Responda APENAS com JSON puro (sem \`\`\`json), no formato EXATO:
{
  "patientName": "Nome Completo do Paciente",
  "surgeryTemplateId": "id-do-template-encontrado",
  "surgeryTemplateName": "Nome do template encontrado",
  "matchedVariableIds": ["id1", "id2"],
  "matchedVariableNames": ["Nome Var 1", "Nome Var 2"],
  "discount": 0,
  "confidence": "high|medium|low",
  "notes": "Observações sobre o matching, se houver"
}`;

  // 5. Chamar Gemini
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const rawText = (response.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
  
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[Smart Budget] Gemini retornou JSON inválido:', rawText);
    return NextResponse.json(
      { error: 'A IA não conseguiu interpretar a mensagem. Tente reformular.', rawResponse: rawText },
      { status: 422 }
    );
  }

  // 6. Validar e enriquecer o resultado
  const matchedTemplate = templates.find(t => t.id === parsed.surgeryTemplateId);
  if (!matchedTemplate) {
    return NextResponse.json({
      error: `Cirurgia não identificada. A IA sugeriu "${parsed.surgeryTemplateName}" mas não encontramos no catálogo.`,
      parsed,
    }, { status: 404 });
  }

  const matchedVars = variables.filter(v => 
    (parsed.matchedVariableIds || []).includes(v.id)
  );
  const variablesCost = matchedVars.reduce((acc, v) => acc + v.price, 0);
  const discount = parseFloat(parsed.discount) || 0;
  const totalPrice = Math.max(0, matchedTemplate.basePrice + variablesCost - discount);

  // 7. Retornar preview
  return NextResponse.json({
    success: true,
    preview: {
      patientName: parsed.patientName || 'Nome não identificado',
      surgeryTemplate: {
        id: matchedTemplate.id,
        name: matchedTemplate.name,
        basePrice: matchedTemplate.basePrice,
      },
      matchedVariables: matchedVars.map(v => ({
        id: v.id,
        name: v.name,
        category: v.category,
        price: v.price,
      })),
      discount,
      totalPrice,
      confidence: parsed.confidence || 'medium',
      notes: parsed.notes || null,
    },
  });
}

// ═══════════════════════════════════════════════════
//  ETAPA 2 — CONFIRM (criar o orçamento)
// ═══════════════════════════════════════════════════
async function handleConfirm(body: any) {
  const { preview } = body;

  if (!preview || !preview.patientName || !preview.surgeryTemplate?.id) {
    return NextResponse.json(
      { error: 'Preview inválido. Envie o preview completo retornado na etapa anterior.' },
      { status: 400 }
    );
  }

  // Validar que o template ainda existe
  const template = await prisma.budgetTemplate.findUnique({
    where: { id: preview.surgeryTemplate.id },
  });

  if (!template) {
    return NextResponse.json(
      { error: 'Modelo de cirurgia não encontrado. Pode ter sido excluído.' },
      { status: 404 }
    );
  }

  // Buscar variáveis reais do banco para garantir integridade
  const varIds = (preview.matchedVariables || []).map((v: any) => v.id);
  const realVars = varIds.length > 0
    ? await prisma.budgetVariable.findMany({ where: { id: { in: varIds } } })
    : [];

  const variablesCost = realVars.reduce((acc, v) => acc + v.price, 0);
  const discount = parseFloat(preview.discount) || 0;
  const totalPrice = Math.max(0, template.basePrice + variablesCost - discount);

  // Criar o orçamento
  const budget = await prisma.budget.create({
    data: {
      patientName: preview.patientName,
      surgeryType: template.name,
      basePrice: template.basePrice,
      discount,
      totalPrice,
      variablesSelectedJson: JSON.stringify(realVars),
      status: 'GERADO',
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLinkUrl = `${baseUrl}/orcamento/${budget.magicLinkId}`;

  return NextResponse.json({
    success: true,
    message: 'Orçamento gerado com sucesso!',
    magicLink: magicLinkUrl,
    totalPrice,
    patientName: preview.patientName,
    surgeryType: template.name,
  });
}
