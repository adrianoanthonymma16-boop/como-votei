import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const partidos = await prisma.partido.findMany({
    orderBy: { sigla: 'asc' },
    select: { id: true, sigla: true, nome: true, cor: true },
  });

  return NextResponse.json({ data: partidos });
}

export const revalidate = 3600;