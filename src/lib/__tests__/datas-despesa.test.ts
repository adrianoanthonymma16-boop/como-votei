import { parseDataFonte, ANOS_JANELA } from '@/lib/despesas';

/**
 * Fixtures: `01-fixtures-fonte.json` (real Câmara/Senado bulk) +
 * RESEARCH.md Pattern 4 (date helper — UTC-midnight, slice 10 chars, Date.UTC).
 * Edge case: Senado typo year '0202-07-04' (year 202) must parse without throwing.
 */
describe('parseDataFonte + ANOS_JANELA (contratos de data e janela de anos)', () => {
  describe('parseDataFonte — normalização UTC-midnight', () => {
    it('Câmara ISO-with-time → Date UTC-midnight (sem shift de fuso)', () => {
      const d = parseDataFonte('2025-06-10T00:00:00');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2025);
      expect(d!.getUTCMonth()).toBe(5); // 0-indexed: June = 5
      expect(d!.getUTCDate()).toBe(10);
      expect(d!.getUTCHours()).toBe(0);
      expect(d!.getUTCMinutes()).toBe(0);
      expect(d!.getUTCSeconds()).toBe(0);
    });

    it('Senado date-only YYYY-MM-DD → mesmo UTC-midnight', () => {
      const d = parseDataFonte('2025-06-10');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(2025);
      expect(d!.getUTCMonth()).toBe(5);
      expect(d!.getUTCDate()).toBe(10);
    });

    it('entradas vazias/inválidas → null (nunca lança)', () => {
      expect(parseDataFonte('')).toBeNull();
      expect(parseDataFonte('   ')).toBeNull();
      expect(parseDataFonte('not-a-date')).toBeNull();
      expect(parseDataFonte('2025-13-01')).toBeNull(); // mês 13 inválido
      expect(parseDataFonte('2025-06-45')).toBeNull(); // dia 45 inválido
      expect(parseDataFonte(undefined)).toBeNull();
      expect(parseDataFonte(null)).toBeNull();
      expect(parseDataFonte(20250610)).toBeNull(); // number input
    });

    it('ano com typo (0202-07-04, fixture Senado) parseia sem lançar → year 202', () => {
      const d = parseDataFonte('0202-07-04');
      expect(d).not.toBeNull();
      expect(d!.getUTCFullYear()).toBe(202);
      expect(d!.getUTCMonth()).toBe(6); // July = 6
      expect(d!.getUTCDate()).toBe(4);
    });
  });

  describe('ANOS_JANELA — janela rolante de 3 anos a partir do ano UTC corrente', () => {
    it('é tupla readonly de 3 anos [ano, ano-1, ano-2] estritamente descendentes consecutivos', () => {
      const currentYear = new Date().getUTCFullYear();
      expect(ANOS_JANELA).toEqual([currentYear, currentYear - 1, currentYear - 2]);
      expect(ANOS_JANELA.length).toBe(3);
      expect(ANOS_JANELA[0]).toBe(ANOS_JANELA[1] + 1);
      expect(ANOS_JANELA[1]).toBe(ANOS_JANELA[2] + 1);
    });
  });
});