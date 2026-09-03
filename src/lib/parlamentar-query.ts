import type { Prisma } from '@prisma/client';

export interface ParlamentarFiltros {
  search?: string;
  casa?: 'CAMARA' | 'SENADO';
  partidoId?: string;
  ufId?: string;
  legislatura?: number;
  situacao?: string;
}

export interface Paginacao {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 50;

/**
 * Converte filtros de consulta em um where do Prisma.
 * Busca por nome/nome civil é case-insensitive e também aceita trechos
 * do id externo ou CPF (apenas dígitos).
 */
export function buildParlamentarWhere(f: ParlamentarFiltros): Prisma.ParlamentarWhereInput {
  const where: Prisma.ParlamentarWhereInput = {};

  if (f.casa) where.casa = f.casa;
  if (f.partidoId) where.partidoId = f.partidoId;
  if (f.ufId) where.ufId = f.ufId;
  if (f.legislatura) where.legislatura = f.legislatura;
  if (f.situacao) where.situacao = f.situacao;

  const termo = f.search?.trim();
  if (termo) {
    const soDigitos = termo.replace(/\D/g, '');
    where.OR = [
      { nome: { contains: termo, mode: 'insensitive' } },
      { nomeCivil: { contains: termo, mode: 'insensitive' } },
    ];
    // Busca por CPF apenas quando o termo contém números (evita query inútil).
    if (soDigitos.length > 0) {
      where.OR.push({ cpf: { contains: soDigitos } });
      where.OR.push({ idExterno: { contains: soDigitos } });
    }
  }

  return where;
}

/**
 * Valida e normaliza os parâmetros de paginação.
 * Retorna null quando inválidos.
 */
export function parsePaginacao(rawPage: unknown, rawPerPage: unknown): { page: number; perPage: number } | null {
  const pageNum = Number(rawPage ?? 1);
  const perPageNum = Number(rawPerPage ?? DEFAULT_PER_PAGE);

  if (!Number.isInteger(pageNum) || pageNum < 1) return null;
  if (!Number.isInteger(perPageNum) || perPageNum < 1 || perPageNum > MAX_PER_PAGE) return null;

  return { page: pageNum, perPage: perPageNum };
}

export function calcularPaginacao(total: number, page: number, perPage: number): Paginacao {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginaSegura = Math.min(page, totalPages);
  return { page: paginaSegura, perPage, total, totalPages };
}
