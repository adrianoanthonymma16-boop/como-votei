import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const ufs = await prisma.uf.findMany({
    orderBy: { sigla: 'asc' },
    select: { id: true, sigla: true, nome: true, regiao: true },
  });

  return NextResponse.json({ data: ufs });
}

export const revalidate = 3600;