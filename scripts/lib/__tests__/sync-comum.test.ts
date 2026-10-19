import { parseSyncArgs, criarSeletorDeFases } from '../sync-comum';

describe('parseSyncArgs', () => {
  it('retorna objeto vazio sem argumentos', () => {
    expect(parseSyncArgs([])).toEqual({});
  });

  it('lê --ano e ignora valores não numéricos na cauda', () => {
    expect(parseSyncArgs(['--ano=2025'])).toEqual({ ano: 2025 });
  });

  it('lê todos os flags de fase e --debug', () => {
    expect(
      parseSyncArgs([
        '--apenas-parlamentares',
        '--apenas-votacoes',
        '--apenas-discursos',
        '--apenas-proposicoes',
        '--apenas-frequencia',
        '--debug',
      ])
    ).toEqual({
      apenasParlamentares: true,
      apenasVotacoes: true,
      apenasDiscursos: true,
      apenasProposicoes: true,
      apenasFrequencia: true,
      debug: true,
    });
  });
});

describe('criarSeletorDeFases', () => {
  it('sem nenhum --apenas-*, sincroniza tudo', () => {
    const sync = criarSeletorDeFases({});
    expect(sync()).toBe(true);
    expect(sync(undefined)).toBe(true);
    expect(sync(true)).toBe(true);
    expect(sync(false)).toBe(true);
  });

  it('com um --apenas-*, sincroniza somente a fase marcada', () => {
    const sync = criarSeletorDeFases({ apenasVotacoes: true });
    expect(sync(true)).toBe(true);
    expect(sync(false)).toBe(false);
    expect(sync(undefined)).toBe(false);
  });

  it('com vários --apenas-*, sincroniza exatamente as fases marcadas', () => {
    const sync = criarSeletorDeFases({ apenasDiscursos: true, apenasFrequencia: true });
    expect(sync(true)).toBe(true);
    expect(sync(false)).toBe(false);
  });
});
