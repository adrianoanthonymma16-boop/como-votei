import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  computeFrequencia,
  computeAlinhamento,
  computeAtividadeMensal,
  computeTemas,
  type AlinhamentoResult,
} from '@/lib/dashboard';

const querySchema = z.object({
  ano: z.coerce.number().default(() => new Date().getFullYear()),
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

  const { ano } = parsed.data;
  const dataInicio = new Date(ano, 0, 1);
  const dataFim = new Date(ano, 11, 31, 23, 59, 59);

  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    include: {
      partido: { select: { id: true, sigla: true, cor: true } },
      uf: { select: { sigla: true } },
    },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  // Votos do parlamentar no período
  const votos = await prisma.voto.findMany({
    where: {
      parlamentarId: id,
      votacao: { data: { gte: dataInicio, lte: dataFim } },
    },
    include: {
      votacao: { select: { id: true, data: true, tema: true } },
    },
  });

  // Discursos e proposições no período
  const discursos = await prisma.discurso.findMany({
    where: {
      parlamentarId: id,
      data: { gte: dataInicio, lte: dataFim },
    },
    select: { data: true, tema: true },
  });

  const proposicoes = await prisma.proposicao.findMany({
    where: {
      parlamentarId: id,
      dataApresentacao: { gte: dataInicio, lte: dataFim },
    },
    select: { dataApresentacao: true, tema: true },
  });

  // Frequência
  const frequencia = computeFrequencia(
    votos.map((v) => ({ tipo: v.tipo, data: v.votacao.data }))
  );

  // Alinhamento partidário
  const votacoesIds = votos
    .filter((v) => ['SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO'].includes(v.tipo))
    .map((v) => v.votacaoId);

  let alinhamento: AlinhamentoResult = {
    totalVotacoes: 0,
    votosAlinhados: 0,
    percentualAlinhamento: 0,
    rankingPartido: undefined,
    totalPartido: undefined,
  };

  if (parlamentar.partidoId && votacoesIds.length > 0) {
    const votosPartido = await prisma.voto.findMany({
      where: {
        votacaoId: { in: votacoesIds },
        parlamentar: { partidoId: parlamentar.partidoId },
      },
      select: { votacaoId: true, tipo: true, parlamentarId: true },
    });

    alinhamento = computeAlinhamento(
      votos
        .filter((v) => votacoesIds.includes(v.votacaoId))
        .map((v) => ({ votacaoId: v.votacaoId, tipo: v.tipo })),
      votosPartido.map((v) => ({
        votacaoId: v.votacaoId,
        tipo: v.tipo,
        parlamentarId: v.parlamentarId,
      })),
      id
    );
  }

  // Atividade mensal
  const atividadeMensal = computeAtividadeMensal(
    votos.map((v) => ({ votacaoId: v.votacaoId, tipo: v.tipo, data: v.votacao.data })),
    discursos.map((d) => ({ data: d.data })),
    proposicoes.map((p) => ({ data: p.dataApresentacao }))
  );

  // Temas (votações distintas)
  const votacoesDistintas = new Map<string, { tema?: string | null }>();
  for (const v of votos) {
    if (!votacoesDistintas.has(v.votacaoId)) {
      votacoesDistintas.set(v.votacaoId, { tema: v.votacao.tema });
    }
  }
  const temas = computeTemas(
    Array.from(votacoesDistintas.values()),
    discursos.map((d) => ({ tema: d.tema })),
    proposicoes.map((p) => ({ tema: p.tema }))
  );

  return NextResponse.json({
    parlamentar: {
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partido: parlamentar.partido ? { sigla: parlamentar.partido.sigla, cor: parlamentar.partido.cor } : null,
      uf: parlamentar.uf ? { sigla: parlamentar.uf.sigla } : null,
      legislatura: parlamentar.legislatura,
    },
    frequencia,
    alinhamento,
    atividade: { porMes: atividadeMensal },
    temas,
  });
}

export const revalidate = 3600;
