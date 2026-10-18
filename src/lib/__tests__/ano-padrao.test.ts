/**
 * Testes da regra de "ano padrão" dos filtros do perfil.
 * Funções puras — nenhum acesso a banco nem dependência de relógio real.
 */

import { anoCorrente, escolherAnoPadrao } from '@/lib/ano-padrao';

describe('escolherAnoPadrao', () => {
  it('prioriza o ano preferido quando ele tem dados', () => {
    expect(escolherAnoPadrao([2026, 2025, 2024], 2026)).toBe(2026);
  });

  it('prioriza o preferido mesmo fora da primeira posição', () => {
    expect(escolherAnoPadrao([2024, 2026, 2025], 2026)).toBe(2026);
  });

  it('cai para o maior ano quando o preferido não tem dados', () => {
    expect(escolherAnoPadrao([2025, 2024, 2023], 2026)).toBe(2025);
  });

  it('retorna undefined quando não há anos', () => {
    expect(escolherAnoPadrao([], 2026)).toBeUndefined();
  });

  it('usa o ano corrente como preferido por padrão', () => {
    const corrente = anoCorrente();
    expect(escolherAnoPadrao([corrente, corrente - 1])).toBe(corrente);
    expect(escolherAnoPadrao([corrente - 1, corrente - 2])).toBe(corrente - 1);
  });
});

describe('anoCorrente', () => {
  it('usa o ano em UTC (não o fuso local)', () => {
    expect(anoCorrente()).toBe(new Date().getUTCFullYear());
  });
});
