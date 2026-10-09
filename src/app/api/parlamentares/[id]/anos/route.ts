import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anosComDados } from '@/lib/parlamentar-anos';

export const dynamic = 'force-dynamic';

/** Anos com dados do parlamentar — alimenta os selects "Ano" das abas. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  return NextResponse.json({ anos: await anosComDados(id) });
}
