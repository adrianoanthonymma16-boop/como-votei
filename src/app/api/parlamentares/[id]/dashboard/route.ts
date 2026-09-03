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
  tipoVoto: z.enum(['SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO', 'LICENCA', 'MISSAO', 'AUSENTE']).array().optional(),
  tipoDiscurso: z.enum(['ORDEM_DIA', 'PLENARIO', 'COMISSAO', 'LIDERANCA', 'OUTRO']).array().optional(),
});

async function anosComDadosGlobais(): Promise<number[]> {
  const rows = await prisma.$queryRawUnsafe<{ ano: number }[]>(
    `SELECT DISTINCT EXTRACT(YEAR FROM "data")::int AS ano FROM (
      SELECT data FROM "votacoes"
      UNION SELECT data FROM "discursos"
      UNION SELECT "data_apresentacao" FROM "proposicoes"
      UNION SELECT NOW() AS data
    ) a WHERE EXTRACT(YEAR FROM "data") >= 2023 GROUP BY ano ORDER BY ano DESC`
  );
  return rows.map((r) => r.ano);
}

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

const ANOS_GLOBAL = await anosComDadosGlobais();

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

  // Sem ?ano, usa 2026 se houver dados globais para esse ano;
  // senão o ano mais recente com registros do parlamentar;
  // nunca o ano corrente vazio.
  const anos = await anosComDados(id);
  const ano = parsed.data.ano ?? (ANOS_GLOBAL.includes(2026) ? 2026 : anos[0] ?? new Date().getFullYear());
  const temDados = anos.length > 0;

  const dataInicio = new Date(ano, 0, 1);
  const dataFim = new Date(ano, 11, 31, 23, 59, 59);

  const { tipoVoto, tipoDiscurso } = parsed.data;

  // Votos do parlamentar no período (filtrados por tipo)
  let votosRaw = await prisma.voto.findMany({
    where: {
      parlamentarId: id,
      votacao: { data: { gte: dataInicio, lte: dataFim } },
      ...(tipoVoto && tipoVoto.length > 0 ? { tipo: { in: tipoVoto } } : {}),
    },
    include: {
      votacao: { select: { id: true, data: true, tema: true } },
    },
  });

  // Discursos no período (filtrados por tipo)
  let discursosRaw = await prisma.discurso.findMany({
    where: {
      parlamentarId: id,
      data: { gte: dataInicio, lte: dataFim },
      ...(tipoDiscurso && tipoDiscurso.length > 0 ? { tipo: { in: tipoDiscurso } } : {}),
    },
    select: { data: true, tema: true, tipo: true },
  });

  // Contagens para os filtros (independentes do filtro aplicado)
  const [votosPorTipo, discursosPorTipo] = await Promise.all([
    prisma.$queryRawUnsafe<{ tipo: string; cnt: bigint }[]>(
      `SELECT v."tipo", count(*)::bigint as cnt FROM "votos" x JOIN "votacoes" v ON v.id = x."votacao_id" WHERE x."parlamentar_id" = $1 AND v."data" >= $2 AND v."data" <= $3 GROUP BY v."tipo" ORDER BY cnt DESC`,
      [id, dataInicio.toISOString(), dataFim.toISOString()]
    ),
    prisma.$queryRawUnsafe<{ tipo: string; cnt: bigint }[]>(
      `SELECT "tipo", count(*)::bigint as cnt FROM "discursos" WHERE "parlamentar_id" = $1 AND "data" >= $2 AND "data" <= $3 GROUP BY "tipo" ORDER BY cnt DESC`,
      [id, dataInicio.toISOString(), dataFim.toISOString()]
    ),
  ]);

  const proposicoes = await prisma.proposicao.findMany({
    where: {
      parlamentarId: id,
      dataApresentacao: { gte: dataInicio, lte: dataFim },
    },
    select: { dataApresentacao: true, tema: true },
  });

  // Aplicar filtros aos dados para computação
  const votos = tipoVoto?.length ? votosRaw.filter((v) => tipoVoto.includes(v.tipo)) : votosRaw;
  const discursos = tipoDiscurso?.length ? discursosRaw.filter((d) => tipoDiscurso.includes(d.tipo)) : discursosRaw;

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
    filtros: {
      tipoVoto: tipoVoto ?? null,
      tipoDiscurso: tipoDiscurso ?? null,
      disponiveis: {
        tipoVoto: votosPorTipo.map((r) => ({ tipo: r.tipo, total: Number(r.cnt) })),
        tipoDiscurso: discursosPorTipo.map((r) => ({ tipo: r.tipo, total: Number(r.cnt) })),
      },
    },
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
