import { parseSyncArgs, criarSeletorDeFases, aplicarFaixa, descreverFaixa } from '../sync-comum';

describe('parseSyncArgs', () => {
  it('retorna objeto vazio sem argumentos', () => {
    expect(parseSyncArgs([])).toEqual({});
  });

  it('lê --ano e ignora valores não numéricos na cauda', () => {
    expect(parseSyncArgs(['--ano=2025'])).toEqual({ ano: 2025 });
  });

  it('lê --offset, --limite e --bulk', () => {
    expect(parseSyncArgs(['--offset=100', '--limite=50', '--bulk'])).toEqual({
      offset: 100,
      limite: 50,
      bulk: true,
    });
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

describe('aplicarFaixa', () => {
  const lista = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it('sem offset/limite devolve a lista inteira', () => {
    expect(aplicarFaixa(lista, {})).toEqual(lista);
  });

  it('aplica apenas o offset', () => {
    expect(aplicarFaixa(lista, { offset: 7 })).toEqual([7, 8, 9]);
  });

  it('aplica apenas o limite', () => {
    expect(aplicarFaixa(lista, { limite: 3 })).toEqual([0, 1, 2]);
  });

  it('aplica offset + limite', () => {
    expect(aplicarFaixa(lista, { offset: 2, limite: 3 })).toEqual([2, 3, 4]);
  });

  it('offset além do fim devolve lista vazia', () => {
    expect(aplicarFaixa(lista, { offset: 100 })).toEqual([]);
  });

  it('ignora offset/limite negativos ou inválidos', () => {
    expect(aplicarFaixa(lista, { offset: -5, limite: -1 })).toEqual(lista);
    expect(aplicarFaixa(lista, { offset: NaN, limite: NaN })).toEqual(lista);
  });

  it('não muta a lista original', () => {
    const copia = [...lista];
    aplicarFaixa(lista, { offset: 2, limite: 2 });
    expect(lista).toEqual(copia);
  });
});

describe('descreverFaixa', () => {
  it('mostra só a contagem quando não há faixa', () => {
    expect(descreverFaixa(513, 513, {})).toBe('513/513');
  });

  it('mostra offset e limite quando informados', () => {
    expect(descreverFaixa(513, 100, { offset: 200, limite: 100 })).toBe('100/513 (offset 200, limite 100)');
  });

  it('usa infinito quando só o offset é informado', () => {
    expect(descreverFaixa(513, 313, { offset: 200 })).toBe('313/513 (offset 200, limite ∞)');
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
