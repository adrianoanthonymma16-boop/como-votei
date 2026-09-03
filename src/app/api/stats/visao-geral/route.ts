import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [parlamentares, votacoes, discursos, proposicoes] = await Promise.all([
    prisma.parlamentar.count(),
    prisma.votacao.count(),
    prisma.discurso.count(),
    prisma.proposicao.count(),
  ]);

  return NextResponse.json({
    parlamentares,
    votacoes,
    discursos,
    proposicoes,
  });
}