import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anosComDados, type FonteAnos } from '@/lib/parlamentar-anos';
import { z } from 'zod';

const fonteSchema = z.enum(['todos', 'votos', 'discursos', 'proposicoes']).catch('todos');

export const dynamic = 'force-dynamic';

/** Anos com dados do parlamentar — alimenta os selects "Ano" das abas. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fonte = fonteSchema.parse(request.nextUrl.searchParams.get('fonte') ?? 'todos') as FonteAnos;

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

  return NextResponse.json({ anos: await anosComDados(id, fonte) });
}
