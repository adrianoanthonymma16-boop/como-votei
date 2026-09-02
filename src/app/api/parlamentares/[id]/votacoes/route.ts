import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  ano: z.coerce.number().optional(),
  tema: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cursor, limit, ano, tema } = parsed.data;

  // Verificar se parlamentar existe
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { id: true, casa: true },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const where: Record<string, unknown> = {
    parlamentarId: id,
  };

  if (ano) {
    where.votacao = {
      ...(where.votacao as Record<string, unknown> || {}),
      data: {
        gte: new Date(`${ano}-01-01`),
        lte: new Date(`${ano}-12-31`),
      },
    };
  }

  if (tema) {
    where.votacao = {
      ...(where.votacao as Record<string, unknown> || {}),
      tema: { contains: tema, mode: 'insensitive' },
    };
  }

  const votos = await prisma.voto.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { votacao: { data: 'desc' } },
    include: {
      votacao: {
        select: {
          id: true,
          idExterno: true,
          data: true,
          descricao: true,
          ementa: true,
          tema: true,
          resultado: true,
          casa: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (votos.length > limit) {
    const nextItem = votos.pop();
    nextCursor = nextItem!.id;
  }

  const data = votos.map((v) => ({
    id: v.votacao.id,
    idExterno: v.votacao.idExterno,
    data: v.votacao.data,
    descricao: v.votacao.descricao,
    ementa: v.votacao.ementa,
    tema: v.votacao.tema,
    resultado: v.votacao.resultado,
    casa: v.votacao.casa,
    voto: v.tipo,
    // Alinhamento será calculado via view ou separado
  }));

  return NextResponse.json({
    data,
    nextCursor,
    hasMore: !!nextCursor,
  });
}

export const revalidate = 3600;