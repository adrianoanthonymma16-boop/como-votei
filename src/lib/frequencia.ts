import { prisma } from '@/lib/prisma';

export interface FrequenciaAno {
  ano: number;
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  taxaPresenca: number;
}

export interface FrequenciaTotal {
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  taxaPresenca: number;
}

export interface FrequenciaOficial {
  anos: number[];
  porAno: FrequenciaAno[];
  /** Soma de todos os anos com dados oficiais; null quando não há nenhum registro. */
  total: FrequenciaTotal | null;
}

interface FrequenciaRow {
  ano: number;
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
}

/**
 * Soma linhas oficiais de frequência (pura e testável).
 * A taxa é recalculada sobre o somatório — nunca herdada de médias por ano.
 */
export function somarFrequencias(rows: FrequenciaRow[]): FrequenciaTotal | null {
  if (rows.length === 0) return null;

  const total = rows.reduce(
    (acc, r) => ({
      totalSessoes: acc.totalSessoes + r.totalSessoes,
      presencas: acc.presencas + r.presencas,
      faltasJustificadas: acc.faltasJustificadas + r.faltasJustificadas,
      faltasInjustificadas: acc.faltasInjustificadas + r.faltasInjustificadas,
    }),
    { totalSessoes: 0, presencas: 0, faltasJustificadas: 0, faltasInjustificadas: 0 }
  );

  return {
    ...total,
    taxaPresenca:
      total.totalSessoes > 0 ? Math.round((total.presencas / total.totalSessoes) * 1000) / 10 : 0,
  };
}

/**
 * Lê APENAS a tabela oficial `frequencias` (populada pelo sync a partir das
 * fontes da Câmara e do Senado). Não estima nada a partir de votos:
 * sem registro oficial, retorna listas vazias e total null.
 */
export async function obterFrequenciaOficial(parlamentarId: string): Promise<FrequenciaOficial> {
  const rows = await prisma.frequencia.findMany({
    where: { parlamentarId },
    orderBy: { ano: 'desc' },
    select: {
      ano: true,
      totalSessoes: true,
      presencas: true,
      faltasJustificadas: true,
      faltasInjustificadas: true,
      taxaPresenca: true,
    },
  });

  return {
    anos: rows.map((r) => r.ano),
    porAno: rows,
    total: somarFrequencias(rows),
  };
}
