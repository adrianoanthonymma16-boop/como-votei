import {
  construirDiretorioPorNome,
  matchAutorEmenda,
  type AliasesEmenda,
} from '@/lib/emendas-match';

const parlamentares = [
  { id: 'p1', nome: 'Rodrigo da Zaeli' },
  { id: 'p2', nome: 'Cuiabá' },
  { id: 'p3', nome: 'Ismael Alexandrino' },
  { id: 'p4', nome: 'João Cury' },
];

const diretorio = construirDiretorioPorNome(parlamentares);

describe('construirDiretorioPorNome', () => {
  it('normaliza o nome e agrupa ids', () => {
    expect(diretorio.porNome['RODRIGO DA ZAELI']).toEqual(['p1']);
  });

  it('mantém os dois ids quando o nome se repete', () => {
    const dup = construirDiretorioPorNome([
      { id: 'a', nome: 'José Silva' },
      { id: 'b', nome: 'JOSE SILVA' },
    ]);
    expect(dup.porNome['JOSE SILVA']).toEqual(['a', 'b']);
  });
});

describe('matchAutorEmenda', () => {
  it('casa exatamente, ignorando acento e caixa', () => {
    expect(matchAutorEmenda('RODRIGO DA ZAELI', diretorio)).toBe('p1');
    expect(matchAutorEmenda('Rodrigo da Zaeli', diretorio)).toBe('p1');
  });

  it('devolve null quando não há match', () => {
    expect(matchAutorEmenda('FULANO DE TAL', diretorio)).toBeNull();
    expect(matchAutorEmenda('', diretorio)).toBeNull();
    expect(matchAutorEmenda(null, diretorio)).toBeNull();
  });

  it('devolve null quando o nome é ambíguo (nunca chuta)', () => {
    const ambiguo = construirDiretorioPorNome([
      { id: 'a', nome: 'José Silva' },
      { id: 'b', nome: 'JOSE SILVA' },
    ]);
    expect(matchAutorEmenda('José Silva', ambiguo)).toBeNull();
  });

  it('usa alias curado quando o nome da fonte diverge', () => {
    const aliases: AliasesEmenda = { 'DR ISMAEL ALEXANDRINO': 'ISMAEL ALEXANDRINO' };
    expect(matchAutorEmenda('DR ISMAEL ALEXANDRINO', diretorio, aliases)).toBe('p3');
    expect(matchAutorEmenda('JOAO CURY NETO', diretorio, { 'JOAO CURY NETO': 'JOAO CURY' })).toBe('p4');
  });

  it('descarta o sufixo entre parênteses do nomeAutor', () => {
    // Amostra real: "RODRIGO DA ZAELI (EX-PARLAMENTAR ABILIO BRUNINI, ...)"
    expect(
      matchAutorEmenda('RODRIGO DA ZAELI (EX-PARLAMENTAR ABILIO BRUNINI, NOS TERMOS ART. 78)', diretorio)
    ).toBe('p1');
  });
});
