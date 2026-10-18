/**
 * Testes dos filtros/paginação das despesas (aba de gastos).
 * Funções puras — nenhum acesso a banco.
 */

import {
  buildDespesaWhere,
  calcularPaginacaoDespesa,
  mediaMensalDespesa,
  DEFAULT_DESPESA_PER_PAGE,
  MAX_DESPESA_PER_PAGE,
} from '@/lib/despesas-query';

describe('buildDespesaWhere', () => {
  it('sempre fixa o parlamentarId', () => {
    expect(buildDespesaWhere('p1')).toEqual({ parlamentarId: 'p1' });
  });

  it('aplica filtro de ano', () => {
    expect(buildDespesaWhere('p1', { ano: 2025 })).toEqual({ parlamentarId: 'p1', ano: 2025 });
  });

  it('aplica filtro de categoria com trim', () => {
    const where = buildDespesaWhere('p1', { categoria: '  TELEFONIA  ' });
    expect(where.categoria).toBe('TELEFONIA');
  });

  it('ignora categoria vazia/só-espaços', () => {
    const where = buildDespesaWhere('p1', { categoria: '   ' });
    expect(where).not.toHaveProperty('categoria');
  });

  it('cria OR case-insensitive em fornecedor/categoria/nome para a busca', () => {
    const where = buildDespesaWhere('p1', { busca: 'tam' });
    expect(where.OR).toEqual([
      { fornecedor: { contains: 'tam', mode: 'insensitive' } },
      { categoria: { contains: 'tam', mode: 'insensitive' } },
      { nomeParlamentarRaw: { contains: 'tam', mode: 'insensitive' } },
    ]);
  });

  it('ignora busca vazia', () => {
    const where = buildDespesaWhere('p1', { busca: '   ' });
    expect(where).not.toHaveProperty('OR');
  });

  it('combina ano + categoria + busca', () => {
    const where = buildDespesaWhere('p1', { ano: 2024, categoria: 'VIAGEM', busca: 'aéreo' });
    expect(where.parlamentarId).toBe('p1');
    expect(where.ano).toBe(2024);
    expect(where.categoria).toBe('VIAGEM');
    expect(where.OR).toHaveLength(3);
  });
});

describe('calcularPaginacaoDespesa', () => {
  it('com total 0 mantém página 1 e ao menos 1 página', () => {
    expect(calcularPaginacaoDespesa(0, 1, 20)).toEqual({ pagina: 1, totalPaginas: 1 });
  });

  it('calcula o número de páginas arredondando para cima', () => {
    expect(calcularPaginacaoDespesa(41, 1, 20)).toEqual({ pagina: 1, totalPaginas: 3 });
  });

  it('clampa página acima do total para a última página válida', () => {
    expect(calcularPaginacaoDespesa(41, 99, 20)).toEqual({ pagina: 3, totalPaginas: 3 });
  });

  it('clampa página negativa/zero para 1', () => {
    expect(calcularPaginacaoDespesa(41, 0, 20)).toEqual({ pagina: 1, totalPaginas: 3 });
  });
});

describe('mediaMensalDespesa', () => {
  it('retorna 0 quando não há meses com despesa', () => {
    expect(mediaMensalDespesa(1000, 0)).toBe(0);
  });

  it('divide o total pelo número de meses distintos', () => {
    expect(mediaMensalDespesa(1200, 12)).toBe(100);
    expect(mediaMensalDespesa(500, 4)).toBe(125);
  });
});

describe('constantes de paginação', () => {
  it('limita itens por página a um teto coerente', () => {
    expect(DEFAULT_DESPESA_PER_PAGE).toBeLessThanOrEqual(MAX_DESPESA_PER_PAGE);
    expect(MAX_DESPESA_PER_PAGE).toBeGreaterThan(0);
  });
});
