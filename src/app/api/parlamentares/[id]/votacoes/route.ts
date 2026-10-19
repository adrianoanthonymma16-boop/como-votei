import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { listaQueryCampos } from '@/lib/lista-query';
import { calcularPaginacao } from '@/lib/parlamentar-query';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  ...listaQueryCampos,
  ano: z.coerce.number().optional(),
  tema: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cursor, page, limit, ano, tema } = parsed.data;

  // Verificar se parlamentar existe
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { id: true, casa: true },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const where: Prisma.VotoWhereInput = {
    parlamentarId: id,
  };
  const votacaoWhere: Prisma.VotacaoWhereInput = {};

  if (ano) {
    votacaoWhere.data = {
      gte: new Date(`${ano}-01-01`),
      lte: new Date(`${ano}-12-31`),
    };
  }

  if (tema) {
    votacaoWhere.tema = { contains: tema, mode: 'insensitive' };
  }

  if (ano || tema) {
    where.votacao = votacaoWhere;
  }

  if (page) {
    const total = await prisma.voto.count({ where });
    const { page: paginaSegura, totalPages } = calcularPaginacao(total, page, limit);
    const votos = await prisma.voto.findMany({
      where,
      skip: (paginaSegura - 1) * limit,
      take: limit,
      orderBy: { votacao: { data: 'desc' } },
      include: {
        votacao: {
          select: {
            id: true,
            idExterno: true,
            data: true,
            descricao: true,
            ementa: true,
            tema: true,
            resultado: true,
            casa: true,
          },
        },
      },
    });
    const data = votos.map((v) => ({
      id: v.votacao.id,
      idExterno: v.votacao.idExterno,
      data: v.votacao.data,
      descricao: v.votacao.descricao,
      ementa: v.votacao.ementa,
      tema: v.votacao.tema,
      resultado: v.votacao.resultado,
      casa: v.votacao.casa,
      voto: v.tipo,
    }));
    return NextResponse.json({
      data,
      total,
      page: paginaSegura,
      totalPages,
      perPage: limit,
      nextCursor: undefined,
      hasMore: paginaSegura < totalPages,
    });
  }

  const votos = await prisma.voto.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { votacao: { data: 'desc' } },
    include: {
      votacao: {
        select: {
          id: true,
          idExterno: true,
          data: true,
          descricao: true,
          ementa: true,
          tema: true,
          resultado: true,
          casa: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (votos.length > limit) {
    const nextItem = votos.pop();
    nextCursor = nextItem!.id;
  }

  const data = votos.map((v) => ({
    id: v.votacao.id,
    idExterno: v.votacao.idExterno,
    data: v.votacao.data,
    descricao: v.votacao.descricao,
    ementa: v.votacao.ementa,
    tema: v.votacao.tema,
    resultado: v.votacao.resultado,
    casa: v.votacao.casa,
    voto: v.tipo,
    // Alinhamento será calculado via view ou separado
  }));

  return NextResponse.json({
    data,
    nextCursor,
    hasMore: !!nextCursor,
  });
}
