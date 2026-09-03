import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function contarPorAno(tabelaColuna: { tabela: string; coluna: string }): Promise<{ ano: number; total: number }[]> {
  const rows = await prisma.$queryRawUnsafe<{ ano: number; total: number }[]>(
    `SELECT EXTRACT(YEAR FROM "${tabelaColuna.coluna}")::int as ano, COUNT(*)::int as total
     FROM "${tabelaColuna.tabela}"
     GROUP BY 1
     ORDER BY ano DESC`
  );
  return rows;
}

export async function GET() {
  const [
    parlamentares,
    deputados,
    senadores,
    votacoes,
    discursos,
    proposicoes,
    partidos,
    parlamentaresPorCasa,
    votacoesPorCasa,
    discursosPorCasa,
    proposicoesPorCasa,
    votacoesPorAno,
    discursosPorAno,
    proposicoesPorAno,
  ] = await Promise.all([
    prisma.parlamentar.count(),
    prisma.parlamentar.count({ where: { casa: 'CAMARA' } }),
    prisma.parlamentar.count({ where: { casa: 'SENADO' } }),
    prisma.votacao.count(),
    prisma.discurso.count(),
    prisma.proposicao.count(),
    prisma.partido.count(),
    prisma.parlamentar.groupBy({ by: ['casa'], _count: { _all: true } }),
    prisma.votacao.groupBy({ by: ['casa'], _count: { _all: true } }),
    prisma.discurso.groupBy({ by: ['casa'], _count: { _all: true } }),
    prisma.proposicao.groupBy({ by: ['casa'], _count: { _all: true } }),
    contarPorAno({ tabela: 'votacoes', coluna: 'data' }),
    contarPorAno({ tabela: 'discursos', coluna: 'data' }),
    contarPorAno({ tabela: 'proposicoes', coluna: 'data_apresentacao' }),
  ]);

  const paraCasa = (rows: { casa: string; _count: { _all: number } }[]) => ({
    CAMARA: rows.find((r) => r.casa === 'CAMARA')?._count._all ?? 0,
    SENADO: rows.find((r) => r.casa === 'SENADO')?._count._all ?? 0,
  });

  return NextResponse.json({
    parlamentares,
    deputados,
    senadores,
    votacoes,
    discursos,
    proposicoes,
    partidos,
    detalhe: {
      parlamentares: {
        porCasa: paraCasa(parlamentaresPorCasa),
        descricao: 'Deputados federais e senadores monitorados nas duas casas legislativas.',
      },
      votacoes: {
        porCasa: paraCasa(votacoesPorCasa),
        porAno: votacoesPorAno,
        descricao: 'Deliberações nominais registradas, com o voto de cada parlamentar quando disponível.',
      },
      discursos: {
        porCasa: paraCasa(discursosPorCasa),
        porAno: discursosPorAno,
        descricao: 'Pronunciamentos em plenário, comissões e ordem do dia, com link para o texto oficial.',
      },
      proposicoes: {
        porCasa: paraCasa(proposicoesPorCasa),
        porAno: proposicoesPorAno,
        descricao: 'Projetos de lei e outras proposições, com ementa, tramitação e link oficial.',
      },
    },
  });
}
