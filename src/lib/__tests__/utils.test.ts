import {
  formatDate,
  formatCurrency,
  truncate,
  getInitials,
  formatNumber,
  cn,
  debounce,
} from '@/lib/utils';

describe('formatDate', () => {
  it('formata data em pt-BR dd/mm/aaaa', () => {
    expect(formatDate(new Date(2024, 11, 19))).toBe('19/12/2024');
  });

  it('formata primeiro dia do ano', () => {
    expect(formatDate(new Date(2024, 0, 1))).toBe('01/01/2024');
  });
});

describe('formatCurrency', () => {
  it('formata valor em reais', () => {
    expect(formatCurrency(1234.5).replace(/\u00a0/g, ' ')).toBe('R$ 1.234,50');
  });
});

describe('truncate', () => {
  it('trunca string longa com reticências', () => {
    expect(truncate('abcdefghijklmnopqrstuvwxyz', 5)).toBe('abcde...');
  });

  it('não altera string curta', () => {
    expect(truncate('curta', 10)).toBe('curta');
  });
});

describe('getInitials', () => {
  it('retorna iniciais de nome composto', () => {
    expect(getInitials('Maria da Silva')).toBe('MD');
  });

  it('retorna iniciais maiúsculas', () => {
    expect(getInitials('joão silva')).toBe('JS');
  });
});

describe('formatNumber', () => {
  it('formata números com separador de milhar pt-BR', () => {
    expect(formatNumber(725)).toBe('725');
    expect(formatNumber(2001)).toBe('2.001');
    expect(formatNumber(50000)).toBe('50.000');
    expect(formatNumber(1500000)).toBe('1.500.000');
  });
});

describe('cn', () => {
  it('mescla classes condicionais', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('chama função apenas uma vez após o delay', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);
    debounced('a');
    debounced('b');
    debounced('c');
    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});
