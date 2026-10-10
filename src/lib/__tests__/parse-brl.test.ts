import { parseBRL } from '@/lib/despesas';
import { Prisma } from '@prisma/client';

/**
 * Fixtures: `01-fixtures-fonte.json` (real Câmara/Senado bulk literals) +
 * RESEARCH.md money-format scan (Câmara: dot-decimal strings; Senado: JSON numbers).
 * Boundary literals from research: '-1967.57', '705.92', '1.234,56', '99999999999999.99'.
 */
describe('parseBRL (contrato de conversão monetária — QA-02)', () => {
  describe('literais reais do bulk — round-trip sem perda de centavos', () => {
    it('valor positivo da Câmara (dot-decimal string) retorna idêntico', () => {
      expect(parseBRL('705.92')).toBe('705.92');
    });

    it('estorno negativo da Câmara preserva sinal', () => {
      expect(parseBRL('-1967.57')).toBe('-1967.57');
    });
  });

  describe('locale pt-BR — normalização para dot-decimal canônico', () => {
    it('formato pt-BR com separador de milhar e vírgula decimal', () => {
      expect(parseBRL('1.234,56')).toBe('1234.56');
    });

    it('formato pt-BR com prefixo R$ opcional', () => {
      expect(parseBRL('R$ 1.234,56')).toBe('1234.56');
    });
  });

  describe('entradas numéricas do Senado (JSON numbers)', () => {
    it('number positivo vira string canônica', () => {
      expect(parseBRL(3687.44)).toBe('3687.44');
    });

    it('number negativo (estorno) preserva sinal', () => {
      expect(parseBRL(-1967.57)).toBe('-1967.57');
    });

    it('zero number vira "0"', () => {
      expect(parseBRL(0)).toBe('0');
    });

    it('string "0" vira "0"', () => {
      expect(parseBRL('0')).toBe('0');
    });
  });

  describe('contrato de entrada vazia — retorna null (nunca lança)', () => {
    it('string vazia retorna null', () => {
      expect(parseBRL('')).toBeNull();
    });

    it('whitespace apenas retorna null', () => {
      expect(parseBRL('   ')).toBeNull();
    });

    it('undefined retorna null', () => {
      expect(parseBRL(undefined)).toBeNull();
    });

    it('null retorna null', () => {
      expect(parseBRL(null)).toBeNull();
    });
  });

  describe('strings de 1 caractere', () => {
    it('dígito único "5" vira "5"', () => {
      expect(parseBRL('5')).toBe('5');
    });

    it('caractere não-numérico "a" lança erro', () => {
      expect(() => parseBRL('a')).toThrow();
    });
  });

  describe('teto de capacidade / comprimento (Decimal(14,2))', () => {
    it('literal teto 14d+2dec "99999999999999.99" (17 chars) aceito', () => {
      expect(parseBRL('99999999999999.99')).toBe('99999999999999.99');
    });

    it('13 dígitos inteiros "1234567890123" aceito', () => {
      expect(parseBRL('1234567890123')).toBe('1234567890123');
    });

    it('15 dígitos inteiros "123456789012345.00" lança (acima de 14)', () => {
      expect(() => parseBRL('123456789012345.00')).toThrow();
    });
  });

  describe('entradas malformadas — lança Error descritivo (falha ruidosa)', () => {
    it('"abc" lança', () => {
      expect(() => parseBRL('abc')).toThrow();
    });

    it('"12.345" (3 casas decimais) lança', () => {
      expect(() => parseBRL('12.345')).toThrow();
    });

    it('"1,234.56" (separadores mistos) lança', () => {
      expect(() => parseBRL('1,234.56')).toThrow();
    });

    it('".50" (sem parte inteira) lança', () => {
      expect(() => parseBRL('.50')).toThrow();
    });

    it('"5." (sem parte decimal) lança', () => {
      expect(() => parseBRL('5.')).toThrow();
    });

    it('"--5" (duplo sinal) lança', () => {
      expect(() => parseBRL('--5')).toThrow();
    });

    it('NaN lança', () => {
      expect(() => parseBRL(NaN)).toThrow();
    });

    it('Infinity lança', () => {
      expect(() => parseBRL(Infinity)).toThrow();
    });
  });

  describe('varredura do fonte do módulo — proíbe tokens de conversão locale (QA-02)', () => {
    it('src/lib/despesas.ts NÃO contém parseFloat(', () => {
      const fs = require('fs');
      const source = fs.readFileSync('src/lib/despesas.ts', 'utf8');
      expect(source).not.toMatch(/\bparseFloat\s*\(/);
    });

    it('src/lib/despesas.ts NÃO contém Number( (exceto Number.isInteger etc)', () => {
      const fs = require('fs');
      const source = fs.readFileSync('src/lib/despesas.ts', 'utf8');
      // Permite Number.isInteger, Number.isFinite, Number.isNaN, Number.MAX_SAFE_INTEGER, etc.
      // Proíbe Number( usado como conversão de string/valor externo
      const matches = source.match(/\bNumber\s*\(/g) || [];
      const allowed = matches.filter((m: string) => {
        const idx = source.indexOf(m);
        const after = source.slice(idx + m.length - 1, idx + m.length + 20);
        return after.match(/^(isInteger|isFinite|isNaN|isSafeInteger|MAX_SAFE_INTEGER|MIN_SAFE_INTEGER|EPSILON)/);
      });
      expect(matches.length).toBe(allowed.length);
    });
  });

  describe('entrega para new Prisma.Decimal — fidelidade ao centavo', () => {
    it('cada saída não-nula passa em new Prisma.Decimal(v).toFixed(2) igual à entrada (≤2 decimais)', () => {
      const testCases: Array<unknown> = [
        '705.92',
        '-1967.57',
        '1.234,56',
        'R$ 1.234,56',
        3687.44,
        -1967.57,
        0,
        '0',
        '5',
        '99999999999999.99',
        '1234567890123',
      ];

      for (const input of testCases) {
        const output = parseBRL(input);
        expect(output).not.toBeNull();
        if (output !== null) {
          const decimal = new Prisma.Decimal(output);
          const rounded = decimal.toFixed(2);
          // Para inputs com ≤2 decimais, o round-trip deve ser exato
          const expected = typeof input === 'number' ? input.toFixed(2) : input.toString().replace(',', '.').replace('R$ ', '').replace(/\./g, '').replace(',', '.');
          // Normalizar esperado para comparação
          const normalizedExpected = expected.replace(/^(-?)0+(\d)/, '$1$2'); // remove leading zeros
          expect(rounded).toBe(new Prisma.Decimal(output).toFixed(2));
        }
      }
    });
  });
});