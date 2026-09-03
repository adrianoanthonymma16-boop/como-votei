import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  voto: z.enum(['SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO', 'AUSENTE', 'LICENCA', 'MISSAO']).optional(),
  q: z.string().optional(),
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

  const { page, limit, voto, q } = parsed.data;

  const votacao = await prisma.votacao.findUnique({
    where: { id },
    select: { id: true, descricao: true, ementa: true, data: true, casa: true, resultado: true },
  });

  if (!votacao) {
    return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
  }

  const where: Record<string, unknown> = { votacaoId: id };

  if (voto) where.tipo = voto;

  if (q && q.trim().length > 0) {
    const termo = q.trim();
    where.parlamentar = {
      OR: [
        { nome: { contains: termo, mode: 'insensitive' } },
        { nomeCivil: { contains: termo, mode: 'insensitive' } },
      ],
    };
  }

  const [total, votos] = await Promise.all([
    prisma.voto.count({ where: where as any }),
    prisma.voto.findMany({
      where: where as any,
      orderBy: [{ parlamentar: { nome: 'asc' } }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        tipo: true,
        parlamentar: {
          select: {
            id: true,
            nome: true,
            fotoUrl: true,
            casa: true,
            partido: { select: { sigla: true, cor: true } },
            uf: { select: { sigla: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Agregação por tipo para chips de filtro
  const porTipoRaw = await prisma.voto.groupBy({
    by: ['tipo'],
    where: { votacaoId: id },
    _count: { tipo: true },
  });

  const porTipo = porTipoRaw.map((r) => ({ tipo: r.tipo, total: r._count.tipo }));

  return NextResponse.json({
    votacao,
    data: votos,
    total,
    page,
    totalPages,
    perPage: limit,
    hasMore: page < totalPages,
    porTipo,
  });
}
