/**
 * Match exato de despesa da Câmara para parlamentar do diretório.
 * Nunca similaridade aproximada; ambiguidade → null; diretório é argumento puro.
 *
 * Ordem de resolução (Option A — id-first com fallback nome+UF):
 * 1. idDeputado → porIdExterno (metodo: 'idExterno')
 * 2. Rejeita linhas de liderança/vazias (uf 'NA', uf vazio, nome vazio → null)
 * 3. Chave exata `${nomeNormalizado}|${ufNormalizado}` em porNomeUf:
 *    - 0 candidatos → null
 *    - 1 candidato → match (metodo: 'nomeUf')
 *    - ≥2 candidatos → desempate exato por partidoSigla via partidosPorId (senão null)
 *
 * O espaço de id é `Parlamentar.idExterno` (string) — NUNCA `numeroDeputadoID`.
 * Retorna `ResultadoMatch` com `metodo` para auditoria (alimenta `nomeParlamentarRaw`, D-01).
 */

import type { Casa } from './types';

export type ResultadoMatch =
  | { parlamentarId: string; metodo: 'idExterno' | 'nomeUf' }
  | null;

export interface DiretorioParlamentares {
  porIdExterno: Record<string, string>;        // idExterno (string) → parlamentarId
  porNomeUf: Record<string, string[]>;         // `${nomeNormalizado}|${ufNormalizado}` → parlamentarId[]
  partidosPorId: Record<string, string>;       // parlamentarId → partidoSigla
}

export interface EntradaMatch {
  idDeputado?: number | string;
  nomeParlamentar: string;
  uf: string;
  partidoSigla?: string;
}

function normalizarNome(nome: string): string {
  throw new Error('not implemented');
}

function normalizarUf(uf: string): string {
  throw new Error('not implemented');
}

export function camaraNameMatch(
  entrada: EntradaMatch,
  diretorio: DiretorioParlamentares
): ResultadoMatch {
  throw new Error('not implemented');
}