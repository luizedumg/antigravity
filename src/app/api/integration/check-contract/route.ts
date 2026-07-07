import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bearerMatches } from '@/lib/tokens';

const SYSTEM_TOKEN = process.env.API_SECRET_TOKEN || 'antigravity-ai-secret-2026';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!bearerMatches(authHeader, SYSTEM_TOKEN)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Parâmetro name é obrigatório.' }, { status: 400 });
    }

    const cleanName = name.trim();

    // Preferir match EXATO do nome para não retornar o paciente errado; só cai
    // no `contains` se não houver correspondência exata (mantém compatibilidade
    // com chamadas que passam nome parcial).
    const contract =
      (await prisma.contract.findFirst({
        where: { patientName: { equals: cleanName } },
        orderBy: { createdAt: 'desc' },
      })) ||
      (await prisma.contract.findFirst({
        where: { patientName: { contains: cleanName } },
        orderBy: { createdAt: 'desc' },
      }));

    if (contract) {
      return NextResponse.json({
        success: true,
        found: true,
        id: contract.id,
        patientName: contract.patientName,
        status: contract.status,
        surgeryType: contract.surgeryType,
        linkId: contract.linkId,
        googleDriveFileId: contract.googleDriveFileId,
        createdAt: contract.createdAt
      });
    }

    return NextResponse.json({
      success: true,
      found: false
    });

  } catch (error: any) {
    console.error('[Integration Check Contract] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
