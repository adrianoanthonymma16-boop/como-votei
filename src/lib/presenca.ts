import { prisma } from '@/lib/prisma';
import { computeFrequencia } from '@/lib/dashboard';

export interface PresencaResumo {
  taxaPresenca: number;
  totalSessoes: number;
  presencas: number;
}

/**
 * Calcula a presença em votações de um parlamentar a partir dos registros
 * nominais existentes na base (votos por sessão/dia).
 * Retorna null quando não há votos registrados.
 */
export async function obterPresenca(parlamentarId: string): Promise<PresencaResumo | null> {
  const votos = await prisma.voto.findMany({
    where: { parlamentarId },
    select: { tipo: true, votacao: { select: { data: true } } },
  });

  if (votos.length === 0) return null;

  const freq = computeFrequencia(votos.map((v) => ({ tipo: v.tipo, data: v.votacao.data })));

  return {
    taxaPresenca: freq.taxaPresenca,
    totalSessoes: freq.totalSessoes,
    presencas: freq.presencas,
  };
}
