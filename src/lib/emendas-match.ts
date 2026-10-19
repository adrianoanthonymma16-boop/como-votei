/**
 * Match do autor de emenda (`nomeAutor` do Portal) com parlamentar do diretório.
 *
 * Regra do produto: **match exato** por nome normalizado, nunca fuzzy. Nome que
 * casa com 0 ou com 2+ parlamentares vira `null` — a emenda continua gravada
 * (total por ano auditável), mas sem dono resolvido.
 *
 * Aliases curados à mão corrigem as divergências conhecidas de nome parlamentar
 * (ex.: `Ismael Alexandrino` no perfil × `DR ISMAEL ALEXANDRINO` na fonte).
 */

import { normalizarNome } from './normalizar-nome';

/** nome do autor na fonte → nome do parlamentar, ambos já normalizados. */
export type AliasesEmenda = Record<string, string>;

export interface DiretorioPorNome {
  /** nome normalizado → ids (mais de um id força `null`: ambiguidade não é palpite) */
  porNome: Record<string, string[]>;
}

export interface ParlamentarNomeavel {
  id: string;
  nome: string;
}

export function construirDiretorioPorNome(parlamentares: ParlamentarNomeavel[]): DiretorioPorNome {
  const porNome: Record<string, string[]> = {};
  for (const p of parlamentares) {
    const chave = normalizarNome(p.nome);
    if (!chave) continue;
    (porNome[chave] ??= []).push(p.id);
  }
  return { porNome };
}

/**
 * Resolve o parlamentar do autor da emenda.
 *
 * @param nomeAutor nome como veio da fonte (`nomeAutor`), nunca o campo `autor`
 * @param diretorio diretório construído a partir da tabela de parlamentares
 * @param aliases correções curadas (chaves normalizadas)
 * @returns id do parlamentar ou `null` quando não há match único
 */
export function matchAutorEmenda(
  nomeAutor: unknown,
  diretorio: DiretorioPorNome,
  aliases: AliasesEmenda = {}
): string | null {
  // O Portal às vezes publica "NOME (EX-PARLAMENTAR ...)" no próprio
  // `nomeAutor`; o sufixo entre parênteses nunca faz parte do nome do perfil.
  const normalizado = normalizarNome(String(nomeAutor ?? '').replace(/\(.*$/, ''));
  if (!normalizado) return null;

  const alvo = aliases[normalizado] ?? normalizado;
  const ids = diretorio.porNome[alvo];
  if (!ids || ids.length !== 1) return null;
  return ids[0];
}

/**
 * Aliases curados: divergências reais entre o nome do perfil e o `nomeAutor`
 * publicado pelo Portal (levantadas do log de unmatched do sync).
 * Chaves e valores já normalizados para leitura direta.
 */
export const ALIASES_EMENDA: AliasesEmenda = {
  'DR. ISMAEL ALEXANDRINO': 'ISMAEL ALEXANDRINO',
  'DR ISMAEL ALEXANDRINO': 'ISMAEL ALEXANDRINO',
  'JOAO CURY NETO': 'JOAO CURY',
  'MARCIVANIA FLEXA': 'PROFESSORA MARCIVANIA',
};
