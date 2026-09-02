import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  ano: z.coerce.number().optional(),
  tipo: z.string().optional(),
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

  const { cursor, limit, ano, tipo, tema } = parsed.data;

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

  const where: Record<string, unknown> = {
    parlamentarId: id,
  };

  if (ano) {
    where.data = {
      gte: new Date(`${ano}-01-01`),
      lte: new Date(`${ano}-12-31`),
    };
  }

  if (tipo) {
    where.tipo = tipo;
  }

  if (tema) {
    where.tema = { contains: tema, mode: 'insensitive' };
  }

  const discursos = await prisma.discurso.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { data: 'desc' },
    select: {
      id: true,
      idExterno: true,
      data: true,
      hora: true,
      tipo: true,
      resumo: true,
      urlOriginal: true,
      tema: true,
      duracaoSegundos: true,
      casa: true,
    },
  });

  let nextCursor: string | undefined;
  if (discursos.length > limit) {
    const nextItem = discursos.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({
    data: discursos,
    nextCursor,
    hasMore: !!nextCursor,
  });
}

export const revalidate = 3600;