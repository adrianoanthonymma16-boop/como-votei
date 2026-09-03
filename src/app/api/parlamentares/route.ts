import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  buildParlamentarWhere,
  parsePaginacao,
  calcularPaginacao,
} from '@/lib/parlamentar-query';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  casa: z.enum(['CAMARA', 'SENADO']).optional(),
  partidoId: z.string().optional(),
  ufId: z.string().optional(),
  legislatura: z.coerce.number().optional(),
  situacao: z.string().optional(),
  search: z.string().optional(),
  // "recent" ordena pelos mais recentemente atualizados na base
  // "ativos" ordena por número de votações (mais ativos primeiro)
  sort: z.enum(['nome', 'recent', 'ativos']).optional().default('nome'),
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

  const { casa, partidoId, ufId, legislatura, situacao, search, sort } = parsed.data;

  const paginacao = parsePaginacao(parsed.data.page, parsed.data.limit);
  if (!paginacao) {
    return NextResponse.json(
      { error: 'Parâmetros de paginação inválidos' },
      { status: 400 }
    );
  }
  const { page, perPage } = paginacao;

  const where = buildParlamentarWhere({ casa, partidoId, ufId, legislatura, situacao, search });

  const [parlamentares, total] = await Promise.all([
    prisma.parlamentar.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: sort === 'recent'
        ? { updatedAt: 'desc' }
        : sort === 'ativos'
          ? { votos: { _count: 'desc' } }
          : { nome: 'asc' },
      include: {
        partido: { select: { id: true, sigla: true, nome: true, cor: true } },
        uf: { select: { id: true, sigla: true, nome: true, regiao: true } },
        _count: { select: { votos: true, discursos: true, proposicoes: true } },
      },
    }),
    prisma.parlamentar.count({ where }),
  ]);

  return NextResponse.json({
    data: parlamentares,
    ...calcularPaginacao(total, page, perPage),
  });
}
