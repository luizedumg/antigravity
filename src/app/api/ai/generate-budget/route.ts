import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBudgetToN8N } from '@/actions/budgets';

export async function POST(req: Request) {
  try {
    // 1. Validar a Autenticação
    const authHeader = req.headers.get('authorization');
    const systemToken = process.env.API_SECRET_TOKEN || 'antigravity-ai-secret-2026';
    
    if (authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: 'Acesso negado. Token inválido.' }, { status: 401 });
    }

    const data = await req.json();
    const { patientName, patientWhatsApp, surgeryName, variablesNames, discount } = data;

    if (!patientName || !surgeryName) {
      return NextResponse.json({ error: 'Nome do paciente e cirurgia são obrigatórios.' }, { status: 400 });
    }

    // 2. Buscar o Modelo de Cirurgia
    const template = await prisma.budgetTemplate.findUnique({
      where: { name: surgeryName }
    });

    if (!template) {
      return NextResponse.json({ error: `Procedimento '${surgeryName}' não encontrado.` }, { status: 404 });
    }

    // 3. Buscar os Adicionais Selecionados
    let selectedVariables: any[] = [];
    let variablesCost = 0;

    if (variablesNames && Array.isArray(variablesNames) && variablesNames.length > 0) {
      const vars = await prisma.budgetVariable.findMany({
        where: { name: { in: variablesNames } }
      });
      selectedVariables = vars;
      variablesCost = vars.reduce((acc, v) => acc + v.price, 0);
    }

    // 4. Calcular o Total
    const appliedDiscount = parseFloat(discount) || 0;
    const totalPrice = Math.max(0, template.basePrice + variablesCost - appliedDiscount);

    // 5. Salvar o Orçamento
    const budget = await prisma.budget.create({
      data: {
        patientName,
        patientWhatsApp,
        surgeryType: template.name,
        basePrice: template.basePrice,
        discount: appliedDiscount,
        totalPrice,
        variablesSelectedJson: JSON.stringify(selectedVariables),
        status: "GERADO"
      }
    });

    // 6. Retornar a Resposta
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/orcamento/${budget.magicLinkId}`;

    // (Opcional) Podemos disparar o webhook do n8n automaticamente se quisermos
    // await sendBudgetToN8N(budget.id, process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!);

    return NextResponse.json({
      success: true,
      message: 'Orçamento gerado com sucesso!',
      magicLink: magicLinkUrl,
      totalPrice,
      budget
    });

  } catch (error: any) {
    console.error("API Error [generate-budget]:", error);
    return NextResponse.json({ error: 'Erro interno no servidor', details: error.message }, { status: 500 });
  }
}
