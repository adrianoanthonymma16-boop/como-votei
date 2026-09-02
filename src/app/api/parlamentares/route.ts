import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  casa: z.enum(['CAMARA', 'SENADO']).optional(),
  partidoId: z.string().optional(),
  ufId: z.string().optional(),
  legislatura: z.coerce.number().optional(),
  situacao: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cursor, limit, casa, partidoId, ufId, legislatura, situacao, search } = parsed.data;

  const where: Record<string, unknown> = {};

  if (casa) where.casa = casa;
  if (partidoId) where.partidoId = partidoId;
  if (ufId) where.ufId = ufId;
  if (legislatura) where.legislatura = legislatura;
  if (situacao) where.situacao = situacao;
  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { cpf: { contains: search } },
      { idExterno: { contains: search } },
    ];
  }

  const parlamentares = await prisma.parlamentar.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { nome: 'asc' },
    include: {
      partido: { select: { id: true, sigla: true, nome: true, cor: true } },
      uf: { select: { id: true, sigla: true, nome: true, regiao: true } },
      _count: { select: { votos: true, discursos: true, proposicoes: true } },
    },
  });

  let nextCursor: string | undefined;
  if (parlamentares.length > limit) {
    const nextItem = parlamentares.pop();
    nextCursor = nextItem!.id;
  }

  return NextResponse.json({
    data: parlamentares,
    nextCursor,
    hasMore: !!nextCursor,
  });
}

export const revalidate = 3600; // ISR 1 hora