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

export function parseDataFonte(v: unknown): Date | null {
  throw new Error('not implemented');
}

export const ANOS_JANELA: readonly [number, number, number] = [2026, 2025, 2024] as const;