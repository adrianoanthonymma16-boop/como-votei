import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  itensPorPagina: z.coerce.number().int().positive().max(50).default(20),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    pagina: searchParams.get('pagina'),
    itensPorPagina: searchParams.get('itensPorPagina'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros de consulta inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pagina, itensPorPagina } = parsed.data;
  const { id: parlamentarId } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id: parlamentarId },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const [despesas, total] = await Promise.all([
    prisma.despesa.findMany({
      where: { parlamentarId },
      skip: (pagina - 1) * itensPorPagina,
      take: itensPorPagina,
      orderBy: { data: 'desc' },
    }),
    prisma.despesa.count({ where: { parlamentarId } }),
  ]);

  const totalPaginas = Math.ceil(total / itensPorPagina);

  return NextResponse.json({
    data: despesas,
    meta: { pagina, totalPaginas, totalItens: total },
  });
}