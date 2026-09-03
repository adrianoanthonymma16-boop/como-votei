import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  ano: z.coerce.number().optional(),
  status: z.string().optional(),
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

  const { cursor, page, limit, ano, status, tema } = parsed.data;

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const where: Record<string, unknown> = {
    parlamentarId: id,
  };

  if (ano) {
    where.ano = ano;
  }

  if (status) {
    where.status = status;
  }

  if (tema) {
    where.tema = { contains: tema, mode: 'insensitive' };
  }

  if (page) {
    const total = await prisma.proposicao.count({ where } as any);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const paginaSegura = Math.min(page, totalPages);
    const proposicoes = await prisma.proposicao.findMany({
      where,
      skip: (paginaSegura - 1) * limit,
      take: limit,
      orderBy: { dataApresentacao: 'desc' },
      include: {
        tramitacoes: {
          orderBy: { data: 'desc' },
          take: 5,
          select: {
            data: true,
            descricao: true,
            orgao: true,
            situacao: true,
          },
        },
      },
    });
    const data = proposicoes.map((p) => ({
      id: p.id,
      idExterno: p.idExterno,
      tipo: p.tipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      autorPrincipal: p.autorPrincipal,
      status: p.status,
      dataApresentacao: p.dataApresentacao,
      urlOriginal: p.urlOriginal,
      tema: p.tema,
      casa: p.casa,
      tramitacoes: p.tramitacoes,
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

  const proposicoes = await prisma.proposicao.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { dataApresentacao: 'desc' },
    include: {
      tramitacoes: {
        orderBy: { data: 'desc' },
        take: 5,
        select: {
          data: true,
          descricao: true,
          orgao: true,
          situacao: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (proposicoes.length > limit) {
    const nextItem = proposicoes.pop();
    nextCursor = nextItem!.id;
  }

  const data = proposicoes.map((p) => ({
    id: p.id,
    idExterno: p.idExterno,
    tipo: p.tipo,
    numero: p.numero,
    ano: p.ano,
    ementa: p.ementa,
    autorPrincipal: p.autorPrincipal,
    status: p.status,
    dataApresentacao: p.dataApresentacao,
    urlOriginal: p.urlOriginal,
    tema: p.tema,
    casa: p.casa,
    tramitacoes: p.tramitacoes,
  }));

  return NextResponse.json({
    data,
    nextCursor,
    hasMore: !!nextCursor,
  });
}

export const revalidate = 3600;