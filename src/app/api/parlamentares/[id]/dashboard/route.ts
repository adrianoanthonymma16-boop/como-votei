import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

  // Buscar parlamentar com relacionamentos
  const parlamentar = await prisma.parlamentar.findUnique({
    where: { id },
    include: {
      partido: { select: { sigla: true, cor: true } },
      uf: { select: { sigla: true } },
    },
  });

  if (!parlamentar) {
    return NextResponse.json(
      { error: 'Parlamentar não encontrado' },
      { status: 404 }
    );
  }

  const dataInicio = new Date(`${ano}-01-01`);
  const dataFim = new Date(`${ano}-12-31`);

  // 1. Frequência (buscar da view ou calcular)
  const votosNoPeriodo = await prisma.voto.findMany({
    where: {
      parlamentarId: id,
      votacao: {
        data: { gte: dataInicio, lte: dataFim },
      },
    },
    include: {
      votacao: { select: { data: true } },
    },
  });

  const totalSessoes = new Set(votosNoPeriodo.map(v => v.votacao.data.toISOString().split('T')[0])).size;
  const presencas = votosNoPeriodo.filter(v => ['SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO'].includes(v.tipo)).length;
  const faltasJustificadas = votosNoPeriodo.filter(v => ['LICENCA', 'MISSAO'].includes(v.tipo)).length;
  const faltasInjustificadas = votosNoPeriodo.filter(v => ['AUSENTE'].includes(v.tipo)).length;
  const taxaPresenca = totalSessoes > 0 ? (presencas / totalSessoes) * 100 : 0;

  // 2. Alinhamento partidário
  const alinhamentoData = await prisma.$queryRawUnsafe<{ total_votacoes: bigint; votos_alinhados: bigint; percentual_alinhamento: number }[]>(`
    SELECT 
      COUNT(*) as total_votacoes,
      SUM(alinhado)::int as votos_alinhados,
      ROUND((SUM(alinhado)::numeric / COUNT(*) * 100), 2) as percentual_alinhamento
    FROM "alinhamento_partidario"
    WHERE "parlamentarId" = $1
      AND data_votacao >= $2
      AND data_votacao <= $3
  `, id, dataInicio, dataFim);

  const alinhamento = alinhamentoData[0] || { total_votacoes: 0, votos_alinhados: 0, percentual_alinhamento: 0 };

  // Ranking no partido
  let rankingPartido: number | undefined;
  let totalPartido: number | undefined;
  
  if (parlamentar.partidoId) {
    const rankingData = await prisma.$queryRawUnsafe<{ rank: bigint; total: bigint }[]>(`
      WITH ranked AS (
        SELECT 
          "parlamentarId",
          ROUND((SUM(alinhado)::numeric / COUNT(*) * 100), 2) as pct,
          ROW_NUMBER() OVER (ORDER BY ROUND((SUM(alinhado)::numeric / COUNT(*) * 100), 2) DESC) as rank,
          COUNT(*) OVER () as total
        FROM "alinhamento_partidario"
        WHERE "partidoId" = $1
          AND data_votacao >= $2
          AND data_votacao <= $3
        GROUP BY "parlamentarId"
      )
      SELECT rank, total FROM ranked WHERE "parlamentarId" = $4
    `, parlamentar.partidoId, dataInicio, dataFim, id);
    
    if (rankingData.length > 0) {
      rankingPartido = Number(rankingData[0].rank);
      totalPartido = Number(rankingData[0].total);
    }
  }

  // 3. Atividade mensal
  const atividadeMensal = await prisma.$queryRawUnsafe<{ mes: number; votações: bigint; discursos: bigint; proposicoes: bigint }[]>(`
    SELECT 
      EXTRACT(MONTH FROM data)::int as mes,
      COUNT(DISTINCT v.id) as votações,
      COUNT(DISTINCT d.id) as discursos,
      COUNT(DISTINCT p.id) as proposicoes
    FROM (SELECT 1) dummy
    LEFT JOIN "Voto" v ON v."parlamentarId" = $1 AND v."votacaoId" IN (
      SELECT id FROM "Votacao" WHERE data >= $2 AND data <= $3
    )
    LEFT JOIN "Discurso" d ON d."parlamentarId" = $1 AND d.data >= $2 AND d.data <= $3
    LEFT JOIN "Proposicao" p ON p."parlamentarId" = $1 AND p."dataApresentacao" >= $2 AND p."dataApresentacao" <= $3
    GROUP BY EXTRACT(MONTH FROM COALESCE(v."createdAt", d.data, p."dataApresentacao"))
    ORDER BY mes
  `, id, dataInicio, dataFim);

  // Completar meses vazios
  const mesesMap = new Map(atividadeMensal.map(a => [Number(a.mes), a]));
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const data = mesesMap.get(m) || { votações: 0, discursos: 0, proposicoes: 0 };
    return {
      mes: m.toString().padStart(2, '0'),
      votações: Number(data.votações),
      discursos: Number(data.discursos),
      proposicoes: Number(data.proposicoes),
    };
  });

  // 4. Temas principais
  const temasData = await prisma.$queryRawUnsafe<{ tema: string; total: bigint; votações: bigint; discursos: bigint; proposicoes: bigint }[]>(`
    SELECT 
      COALESCE(v.tema, d.tema, p.tema, 'Sem tema') as tema,
      COUNT(DISTINCT v.id) + COUNT(DISTINCT d.id) + COUNT(DISTINCT p.id) as total,
      COUNT(DISTINCT v.id) as votações,
      COUNT(DISTINCT d.id) as discursos,
      COUNT(DISTINCT p.id) as proposicoes
    FROM (SELECT 1) dummy
    LEFT JOIN "Voto" vt ON vt."parlamentarId" = $1
    LEFT JOIN "Votacao" v ON v.id = vt."votacaoId" AND v.data >= $2 AND v.data <= $3
    LEFT JOIN "Discurso" d ON d."parlamentarId" = $1 AND d.data >= $2 AND d.data <= $3
    LEFT JOIN "Proposicao" p ON p."parlamentarId" = $1 AND p."dataApresentacao" >= $2 AND p."dataApresentacao" <= $3
    GROUP BY COALESCE(v.tema, d.tema, p.tema, 'Sem tema')
    ORDER BY total DESC
    LIMIT 10
  `, id, dataInicio, dataFim);

  const temas = temasData.map(t => ({
    tema: t.tema,
    total: Number(t.total),
    votações: Number(t.votações),
    discursos: Number(t.discursos),
    proposicoes: Number(t.proposicoes),
  }));

  return NextResponse.json({
    parlamentar: {
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partido: parlamentar.partido,
      uf: parlamentar.uf,
      legislatura: parlamentar.legislatura,
    },
    frequencia: {
      totalSessoes,
      presencas,
      faltasJustificadas,
      faltasInjustificadas,
      taxaPresenca: Math.round(taxaPresenca * 10) / 10,
    },
    alinhamento: {
      totalVotacoes: Number(alinhamento.total_votacoes),
      votosAlinhados: Number(alinhamento.votos_alinhados),
      percentualAlinhamento: alinhamento.percentual_alinhamento,
      rankingPartido,
      totalPartido,
    },
    atividade: { porMes },
    temas,
  });
}

export const revalidate = 3600;