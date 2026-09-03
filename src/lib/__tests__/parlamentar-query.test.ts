import {
  buildParlamentarWhere,
  parsePaginacao,
  calcularPaginacao,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
} from '@/lib/parlamentar-query';

describe('buildParlamentarWhere', () => {
  it('aplica filtro de casa', () => {
    const where = buildParlamentarWhere({ casa: 'SENADO' });
    expect(where.casa).toBe('SENADO');
  });

  it('aplica filtro de partido e UF', () => {
    const where = buildParlamentarWhere({ partidoId: 'p1', ufId: 'u1' });
    expect(where.partidoId).toBe('p1');
    expect(where.ufId).toBe('u1');
  });

  it('busca por nome com case-insensitive', () => {
    const where = buildParlamentarWhere({ search: 'maria' }) as {
      OR?: Record<string, unknown>[];
    };
    expect(where.OR).toBeDefined();
    const nome = where.OR![0];
    expect(nome).toEqual({ nome: { contains: 'maria', mode: 'insensitive' } });
  });

  it('busca também por CPF quando o termo tem números', () => {
    const where = buildParlamentarWhere({ search: '123.456.789-00' }) as {
      OR?: Record<string, unknown>[];
    };
    const cpf = where.OR!.find((o) => Object.keys(o)[0] === 'cpf');
    expect(cpf).toEqual({ cpf: { contains: '12345678900' } });
  });

  it('não busca por CPF quando o termo é só texto', () => {
    const where = buildParlamentarWhere({ search: 'alfredo' }) as {
      OR?: Record<string, unknown>[];
    };
    expect(where.OR!.some((o) => 'cpf' in o)).toBe(false);
  });

  it('retorna where vazio sem filtros', () => {
    const where = buildParlamentarWhere({});
    expect(where).toEqual({});
  });

  it('ignora busca em branco', () => {
    const where = buildParlamentarWhere({ search: '   ' });
    expect(where).toEqual({});
  });
});

describe('parsePaginacao', () => {
  it('aplica padrão de 20 por página', () => {
    expect(parsePaginacao(undefined, undefined)).toEqual({ page: 1, perPage: DEFAULT_PER_PAGE });
  });

  it('aceita página e limite válidos', () => {
    expect(parsePaginacao('3', '20')).toEqual({ page: 3, perPage: 20 });
  });

  it('rejeita página menor que 1', () => {
    expect(parsePaginacao('0', '20')).toBeNull();
  });

  it('rejeita limite acima do máximo', () => {
    expect(parsePaginacao('1', String(MAX_PER_PAGE + 1))).toBeNull();
  });

  it('rejeita valores não numéricos', () => {
    expect(parsePaginacao('abc', '20')).toBeNull();
  });
});

describe('calcularPaginacao', () => {
  it('calcula total de páginas', () => {
    expect(calcularPaginacao(726, 1, 20)).toEqual({ page: 1, perPage: 20, total: 726, totalPages: 37 });
  });

  it('não permite página além do total de páginas', () => {
    const p = calcularPaginacao(10, 99, 20);
    expect(p.page).toBe(1);
    expect(p.totalPages).toBe(1);
  });

  it('total vazio vira uma página', () => {
    expect(calcularPaginacao(0, 1, 20).totalPages).toBe(1);
  });
});
