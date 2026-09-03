import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  computeAlinhamento,
  computeAtividadeMensal,
  computeTemas,
  type AlinhamentoResult,
} from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  ano: z.coerce.number().optional(),
});

async function anosComDados(parlamentarId: string): Promise<number[]> {
  const rows = await prisma.$queryRawUnsafe<{ ano: number }[]>(
    `SELECT DISTINCT EXTRACT(YEAR FROM a.dt)::int AS ano FROM (
       SELECT v.data AS dt FROM "votacoes" v JOIN "votos" x ON x."votacao_id" = v.id WHERE x."parlamentar_id" = $1
       UNION SELECT d.data FROM "discursos" d WHERE d."parlamentar_id" = $1
       UNION SELECT p."data_apresentacao" FROM "proposicoes" p WHERE p."parlamentar_id" = $1
     ) a ORDER BY ano DESC`,
    parlamentarId
  );
  return rows.map((r) => r.ano);
}

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

  // Sem ?ano, usa o ano mais recente com registros na base — nunca o ano corrente
  // vazio (que fazia o dashboard retornar tudo 0).
  const anos = await anosComDados(id);
  const ano = parsed.data.ano ?? anos[0] ?? new Date().getFullYear();
  const temDados = anos.length > 0;

  const dataInicio = new Date(ano, 0, 1);
  const dataFim = new Date(ano, 11, 31, 23, 59, 59);

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

  // Frequência — SOMENTE dados oficiais da tabela `frequencias`
  // (populada pelo sync). Sem registro oficial, retorna zeros e o
  // frontend exibe "sem dados oficiais" em vez de estimar via votos.
  const frequenciaOficial = await prisma.frequencia.findUnique({
    where: { parlamentarId_ano: { parlamentarId: id, ano } },
    select: {
      totalSessoes: true,
      presencas: true,
      faltasJustificadas: true,
      faltasInjustificadas: true,
      taxaPresenca: true,
    },
  });

  const frequencia = frequenciaOficial ?? {
    totalSessoes: 0,
    presencas: 0,
    faltasJustificadas: 0,
    faltasInjustificadas: 0,
    taxaPresenca: 0,
  };
  const semDadosOficiais = !frequenciaOficial;

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
    ano,
    anos,
    semDados: !temDados,
    parlamentar: {
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partido: parlamentar.partido ? { sigla: parlamentar.partido.sigla, cor: parlamentar.partido.cor } : null,
      uf: parlamentar.uf ? { sigla: parlamentar.uf.sigla } : null,
      legislatura: parlamentar.legislatura,
    },
    frequencia,
    fonteFrequencia: 'oficial' as const,
    semDadosOficiais,
    alinhamento,
    atividade: { porMes: atividadeMensal },
    temas,
  });
}
