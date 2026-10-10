/**
 * Conversões puras de despesa — dinheiro, datas, janela de anos.
 * Nenhum I/O, nenhum Prisma.
 */

const RE_VALOR_DECIMAL = /^-?\d{1,14}(\.\d{1,2})?$/;

export function parseBRL(v: unknown): string | null {
  // null/undefined/empty-after-trim → null
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return null;

    // Strip optional "R$" prefix
    let normalized = trimmed.replace(/^R\$\s*/, '');

    // Detect pt-BR format (contains comma as decimal separator)
    if (normalized.includes(',')) {
      // pt-BR: remove thousand separators (dots), then comma becomes decimal point
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
    // Otherwise assume dot-decimal format (already canonical or from Câmara bulk)

    // Validate against regex: optional minus + 1-14 integer digits + optional dot + 1-2 decimals
    if (!RE_VALOR_DECIMAL.test(normalized)) {
      throw new Error(`parseBRL: valor malformado "${trimmed}"`);
    }

    return normalized;
  }

  // Number branch (Senado JSON numbers)
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) {
      throw new Error(`parseBRL: valor não-finito ${v}`);
    }
    // Check decimal places - reject >2 decimals
    const str = v.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1].length;
      if (decimals > 2) {
        throw new Error(`parseBRL: valor com mais de 2 casas decimais "${str}"`);
      }
    }
    const normalized = String(v);
    if (!RE_VALOR_DECIMAL.test(normalized)) {
      throw new Error(`parseBRL: valor malformado "${normalized}"`);
    }
    return normalized;
  }

  // Anything else throws
  throw new Error(`parseBRL: entrada inválida ${typeof v}`);
}

/**
 * Converte strings de data das fontes oficiais (Câmara ISO, Senado YYYY-MM-DD)
 * em Date UTC-meia-noite. Nunca usa new Date(string) diretamente (hazard de fuso local).
 * Retorna null para entradas vazias/inválidas/fora de range.
 */
const RE_DATA_ISO = /^\d{4}-\d{2}-\d{2}/;

export function parseDataFonte(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed === '') return null;

  // Take first 10 chars (YYYY-MM-DD)
  const datePart = trimmed.slice(0, 10);
  if (!RE_DATA_ISO.test(datePart)) return null;

  const year = parseInt(datePart.slice(0, 4), 10);
  const month = parseInt(datePart.slice(5, 7), 10);
  const day = parseInt(datePart.slice(8, 10), 10);

  // Validate month/day ranges (will reject 2025-13-01, 2025-06-45, etc.)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Build UTC-midnight date — this is what makes '0202-07-04' parse to year 202
  const date = new Date(Date.UTC(year, month - 1, day));

  // Verify the UTC components match what we parsed (catches invalid days like Feb 30)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Janela de 3 anos para retenção/ingestão de despesas.
 * Computada a partir do ano UTC corrente — NÃO uma tupla estática.
 * Fonte única consumida por scripts/ (Phase 2 import loop) E retenção (GAST-05).
 * Evita o pitfall de duas constantes de ano que derivam (precedent: VotacoesPageClient.tsx ANOS estático).
 */
export const ANOS_JANELA: readonly [number, number, number] = (() => {
  const currentYear = new Date().getUTCFullYear();
  return [currentYear, currentYear - 1, currentYear - 2] as const;
})();