import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  q: z.string().optional(),
  casa: z.enum(['CAMARA', 'SENADO']).optional(),
  ano: z.coerce.number().optional(),
  resultado: z.enum(['APROVADA', 'REJEITADA']).optional(),
  tema: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
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

  const { q, casa, ano, resultado, tema, page, limit } = parsed.data;

  const where: Record<string, unknown> = {};

  if (casa) where.casa = casa;

  if (ano) {
    where.data = {
      gte: new Date(`${ano}-01-01T00:00:00.000Z`),
      lte: new Date(`${ano}-12-31T23:59:59.999Z`),
    };
  }

  if (resultado) {
    where.resultado = { contains: resultado, mode: 'insensitive' };
  }

  if (tema) {
    where.tema = { contains: tema, mode: 'insensitive' };
  }

  if (q) {
    const termo = q.trim();
    if (termo.length > 0) {
      where.OR = [
        { descricao: { contains: termo, mode: 'insensitive' } },
        { ementa: { contains: termo, mode: 'insensitive' } },
      ];
    }
  }

  const [total, votacoes] = await Promise.all([
    prisma.votacao.count({ where: where as any }),
    prisma.votacao.findMany({
      where: where as any,
      orderBy: { data: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        idExterno: true,
        casa: true,
        data: true,
        descricao: true,
        ementa: true,
        tema: true,
        resultado: true,
        _count: { select: { votos: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    data: votacoes,
    total,
    page,
    totalPages,
    perPage: limit,
    hasMore: page < totalPages,
  });
}
