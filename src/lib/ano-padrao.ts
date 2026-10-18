/**
 * Regra única de "ano padrão" dos filtros do perfil: prioriza o ano corrente
 * (2026) quando ele tem dados; senão cai para o ano mais recente disponível.
 * Pura — sem I/O — para ser testável e reutilizada pelas abas.
 */

/** Ano UTC corrente — fonte única para o "ano que queremos priorizar". */
export function anoCorrente(): number {
  return new Date().getUTCFullYear();
}

/**
 * Escolhe o ano a pré-selecionar num select "Ano".
 * @param anos anos com dados (em qualquer ordem)
 * @param preferido ano a priorizar (default: ano corrente)
 * @returns o preferido se presente, senão o maior ano; undefined se a lista vazia
 */
export function escolherAnoPadrao(anos: number[], preferido: number = anoCorrente()): number | undefined {
  if (anos.length === 0) return undefined;
  if (anos.includes(preferido)) return preferido;
  return Math.max(...anos);
}

/**
 * Janela rolante de N anos a partir do ano corrente (mais recente primeiro).
 * Substitui listas de ano estáticas que quebram na virada do ano.
 */
export function janelaAnos(quantidade = 3): number[] {
  const base = anoCorrente();
  return Array.from({ length: quantidade }, (_, i) => base - i);
}
