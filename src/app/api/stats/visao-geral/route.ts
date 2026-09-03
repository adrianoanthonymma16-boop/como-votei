import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [parlamentares, deputados, senadores, votacoes, discursos, proposicoes, partidos] =
    await Promise.all([
      prisma.parlamentar.count(),
      prisma.parlamentar.count({ where: { casa: 'CAMARA' } }),
      prisma.parlamentar.count({ where: { casa: 'SENADO' } }),
      prisma.votacao.count(),
      prisma.discurso.count(),
      prisma.proposicao.count(),
      prisma.partido.count(),
    ]);

  return NextResponse.json({
    parlamentares,
    deputados,
    senadores,
    votacoes,
    discursos,
    proposicoes,
    partidos,
  });
}
