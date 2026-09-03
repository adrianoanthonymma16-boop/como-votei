import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { obterFrequenciaOficial } from '@/lib/frequencia';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!parlamentar) {
    return NextResponse.json({ error: 'Parlamentar não encontrado' }, { status: 404 });
  }

  const frequencia = await obterFrequenciaOficial(id);

  return NextResponse.json({ fonte: 'oficial', ...frequencia });
}
