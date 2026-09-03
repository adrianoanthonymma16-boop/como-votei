import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  buildParlamentarWhere,
  parsePaginacao,
  calcularPaginacao,
} from '@/lib/parlamentar-query';
import { calcularPontuacao, STATUS_PL_APROVADO } from '@/lib/produtividade';

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
  // "recent" ordena pelos mais recentemente atualizados
  // "ativos" ordena por número de votações
  // "produtivos" ordena pela métrica de produtividade do desenvolvedor
  sort: z.enum(['nome', 'recent', 'ativos', 'produtivos']).optional().default('nome'),
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

  // Ranking por produtividade: calcula pontuação em JS sobre os filtrados.
  // É custoso fazer ORDER BY por expressão com múltiplos JOINs no Postgres;
  // como são no máximo ~800 parlamentares, buscar todos e ordenar em memória é simples e estável.
  if (sort === 'produtivos') {
    const idsRows = await prisma.parlamentar.findMany({
      where,
      select: { id: true },
    });
    const ids = idsRows.map((r) => r.id);
    const total = ids.length;

    if (total === 0) {
      return NextResponse.json({
        data: [],
        ...calcularPaginacao(0, page, perPage),
      });
    }

    const [plApresentados, plAprovados, faltas, votosSimNao, discursos] = await Promise.all([
      prisma.proposicao.groupBy({
        by: ['parlamentarId'],
        where: { parlamentarId: { in: ids }, tipo: 'PL' },
        _count: { _all: true },
      }),
      prisma.proposicao.groupBy({
        by: ['parlamentarId'],
        where: { parlamentarId: { in: ids }, tipo: 'PL', status: { in: [...STATUS_PL_APROVADO] as any } },
        _count: { _all: true },
      }),
      prisma.voto.groupBy({
        by: ['parlamentarId'],
        where: { parlamentarId: { in: ids }, tipo: 'AUSENTE' },
        _count: { _all: true },
      }),
      prisma.voto.groupBy({
        by: ['parlamentarId'],
        where: { parlamentarId: { in: ids }, tipo: { in: ['SIM', 'NAO'] } },
        _count: { _all: true },
      }),
      prisma.discurso.groupBy({
        by: ['parlamentarId'],
        where: { parlamentarId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

    const map = (rows: { parlamentarId: string; _count: { _all: number } }[]) =>
      new Map(rows.map((r) => [r.parlamentarId, r._count._all]));

    const mPl = map(plApresentados as any);
    const mPlAp = map(plAprovados as any);
    const mFalta = map(faltas as any);
    const mVoto = map(votosSimNao as any);
    const mDisc = map(discursos as any);

    const pontuacoes = ids.map((id) => ({
      id,
      pontuacao: calcularPontuacao({
        plApresentados: mPl.get(id) ?? 0,
        plAprovados: mPlAp.get(id) ?? 0,
        faltas: mFalta.get(id) ?? 0,
        votosSimNao: mVoto.get(id) ?? 0,
        discursos: mDisc.get(id) ?? 0,
      }),
    }));

    pontuacoes.sort((a, b) => b.pontuacao - a.pontuacao);

    const paginaIds = pontuacoes.slice((page - 1) * perPage, page * perPage).map((p) => p.id);
    const pontuacaoById = new Map(pontuacoes.map((p) => [p.id, p.pontuacao]));

    const parlamentares = await prisma.parlamentar.findMany({
      where: { id: { in: paginaIds } },
      include: {
        partido: { select: { id: true, sigla: true, nome: true, cor: true } },
        uf: { select: { id: true, sigla: true, nome: true, regiao: true } },
        _count: { select: { votos: true, discursos: true, proposicoes: true } },
      },
    });

    // preservar ordem do ranking e anexar produtividade para exibição opcional no cliente
    const porId = new Map(parlamentares.map((p) => [p.id, p]));
    const ordenados = paginaIds
      .map((id) => porId.get(id))
      .filter(Boolean)
      .map((p: any) => ({
        ...p,
        produtividade: {
          pontuacao: pontuacaoById.get(p.id) ?? 0,
          plApresentados: mPl.get(p.id) ?? 0,
          plAprovados: mPlAp.get(p.id) ?? 0,
          faltas: mFalta.get(p.id) ?? 0,
          votosSimNao: mVoto.get(p.id) ?? 0,
          discursos: mDisc.get(p.id) ?? 0,
        },
      }));

    return NextResponse.json({
      data: ordenados,
      ...calcularPaginacao(total, page, perPage),
    });
  }

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
