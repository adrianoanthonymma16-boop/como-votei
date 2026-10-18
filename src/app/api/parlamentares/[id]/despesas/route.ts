import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  buildDespesaWhere,
  calcularPaginacaoDespesa,
  mediaMensalDespesa,
  DEFAULT_DESPESA_PER_PAGE,
  MAX_DESPESA_PER_PAGE,
} from '@/lib/despesas-query';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  itensPorPagina: z.coerce.number().int().positive().max(MAX_DESPESA_PER_PAGE).default(DEFAULT_DESPESA_PER_PAGE),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  categoria: z.string().trim().min(1).optional(),
  busca: z.string().trim().min(1).optional(),
});

/**
 * Lê a query string ignorando chaves vazias (`?pagina=`), para que os
 * `.default()`/`.optional()` do zod valham — diferente de `searchParams.get()`,
 * que devolve `null` e derruba o schema com 400.
 */
function lerParametros(searchParams: URLSearchParams): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [chave, valor] of searchParams.entries()) {
    if (valor !== '') raw[chave] = valor;
  }
  return raw;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(lerParametros(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros de consulta inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pagina, itensPorPagina, ano, categoria, busca } = parsed.data;
  const { id: parlamentarId } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id: parlamentarId },
  });

  if (!parlamentar) {
    return NextResponse.json({ error: 'parlamentar não encontrado' }, { status: 404 });
  }

  const where = buildDespesaWhere(parlamentarId, { ano, categoria, busca });

  const [total, agregado, meses, categorias] = await Promise.all([
    prisma.despesa.count({ where }),
    prisma.despesa.aggregate({ where, _sum: { valor: true } }),
    prisma.despesa.groupBy({ by: ['ano', 'mes'], where }),
    // Lista estável de categorias do parlamentar (todo o histórico), para o dropdown
    // não esvaziar conforme outros filtros são aplicados.
    prisma.despesa.groupBy({
      by: ['categoria'],
      where: { parlamentarId },
      _count: { _all: true },
      orderBy: { _count: { categoria: 'desc' } },
    }),
  ]);

  const { pagina: paginaAtual, totalPaginas } = calcularPaginacaoDespesa(total, pagina, itensPorPagina);

  const despesas = await prisma.despesa.findMany({
    where,
    skip: (paginaAtual - 1) * itensPorPagina,
    take: itensPorPagina,
    // Datas nulas (fonte sem dataEmissão) vão para o fim, não para o topo.
    orderBy: [{ data: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
  });

  const totalGasto = Number(agregado._sum.valor ?? 0);
  const mesesComDespesa = meses.length;

  return NextResponse.json({
    data: despesas,
    meta: {
      pagina: paginaAtual,
      itensPorPagina,
      totalPaginas,
      totalItens: total,
      totalGasto,
      mesesComDespesa,
      mediaMensal: mediaMensalDespesa(totalGasto, mesesComDespesa),
      categorias: categorias.map((c) => ({ nome: c.categoria, total: c._count._all })),
    },
  });
}
