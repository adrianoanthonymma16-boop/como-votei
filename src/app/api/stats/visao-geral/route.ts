import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export const revalidate = 3600; // ISR 1 hora