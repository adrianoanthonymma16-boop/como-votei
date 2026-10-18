/**
 * Semântica de filtros e paginação da aba de gastos (despesas).
 * Funções puras — sem I/O, sem Prisma além do tipo de `where`.
 * Consumido por src/app/api/parlamentares/[id]/despesas/route.ts.
 */

import type { Prisma } from '@prisma/client';

export const DEFAULT_DESPESA_PER_PAGE = 20;
export const MAX_DESPESA_PER_PAGE = 50;

export interface DespesaFiltros {
  /** Ano exato (ex.: 2025). Ausente = todos os anos da janela. */
  ano?: number;
  /** Label de categoria exato da fonte (CEAP/CEAPS). Ausente = todas. */
  categoria?: string;
  /** Busca textual em fornecedor/categoria/nome da fonte (case-insensitive). */
  busca?: string;
}

/**
 * Monta o `where` das despesas de um parlamentar.
 * Sempre fixa `parlamentarId`; os filtros só restringem a partir daí.
 * Busca vazia/só-espaços é ignorada (não vira `OR` inútil).
 */
export function buildDespesaWhere(
  parlamentarId: string,
  filtros: DespesaFiltros = {}
): Prisma.DespesaWhereInput {
  const where: Prisma.DespesaWhereInput = { parlamentarId };

  if (filtros.ano !== undefined) {
    where.ano = filtros.ano;
  }

  const categoria = filtros.categoria?.trim();
  if (categoria) {
    where.categoria = categoria;
  }

  const busca = filtros.busca?.trim();
  if (busca) {
    where.OR = [
      { fornecedor: { contains: busca, mode: 'insensitive' } },
      { categoria: { contains: busca, mode: 'insensitive' } },
      { nomeParlamentarRaw: { contains: busca, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Paginação a partir do total filtrado. Nunca devolve página fora de [1, totalPaginas],
 * para que uma página órfã (ex.: após aplicar filtro) caia na última página válida.
 * Sempre há ao menos 1 página, mesmo com 0 resultados.
 */
export function calcularPaginacaoDespesa(
  total: number,
  pagina: number,
  itensPorPagina: number
): { pagina: number; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
  const paginaAjustada = Math.min(Math.max(1, pagina), totalPaginas);
  return { pagina: paginaAjustada, totalPaginas };
}

/** Média mensal = total / nº de meses distintos com despesa (evita dividir por meses vazios). */
export function mediaMensalDespesa(totalGasto: number, mesesComDespesa: number): number {
  if (mesesComDespesa <= 0) return 0;
  return totalGasto / mesesComDespesa;
}
