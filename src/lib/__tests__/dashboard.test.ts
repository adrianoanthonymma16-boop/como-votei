import {
  mode,
  isPresenca,
  computeFrequencia,
  computeAlinhamento,
  computeAtividadeMensal,
  computeTemas,
} from '@/lib/dashboard';

describe('mode', () => {
  it('retorna o valor mais frequente', () => {
    expect(mode(['SIM', 'NAO', 'SIM', 'ABSTENCAO', 'SIM'])).toBe('SIM');
  });

  it('retorna undefined para lista vazia', () => {
    expect(mode([])).toBe(undefined);
  });
});

describe('isPresenca', () => {
  it('considera votos nominais como presença', () => {
    expect(isPresenca('SIM')).toBe(true);
    expect(isPresenca('NAO')).toBe(true);
    expect(isPresenca('ABSTENCAO')).toBe(true);
  });

  it('não considera ausência como presença', () => {
    expect(isPresenca('AUSENTE')).toBe(false);
    expect(isPresenca('LICENCA')).toBe(false);
  });
});

describe('computeFrequencia', () => {
  it('calcula presença e taxas corretamente', () => {
    const votos = [
      { tipo: 'SIM', data: new Date(2024, 0, 10) },
      { tipo: 'NAO', data: new Date(2024, 0, 11) },
      { tipo: 'AUSENTE', data: new Date(2024, 0, 12) },
      { tipo: 'LICENCA', data: new Date(2024, 0, 13) },
    ];
    const result = computeFrequencia(votos);
    expect(result.totalSessoes).toBe(4);
    expect(result.presencas).toBe(2);
    expect(result.faltasJustificadas).toBe(1);
    expect(result.faltasInjustificadas).toBe(1);
    expect(result.taxaPresenca).toBe(50);
  });

  it('retorna zero quando não há votos', () => {
    const result = computeFrequencia([]);
    expect(result.totalSessoes).toBe(0);
    expect(result.taxaPresenca).toBe(0);
  });

  it('não ultrapassa 100% quando há vários votos no mesmo dia', () => {
    const votos = [
      { tipo: 'SIM', data: new Date(2024, 0, 10) },
      { tipo: 'NAO', data: new Date(2024, 0, 10) },
      { tipo: 'ABSTENCAO', data: new Date(2024, 0, 10) },
      { tipo: 'SIM', data: new Date(2024, 0, 10) },
    ];
    const result = computeFrequencia(votos);
    expect(result.totalSessoes).toBe(1);
    expect(result.presencas).toBe(1);
    expect(result.taxaPresenca).toBe(100);
  });
});

describe('computeAlinhamento', () => {
  it('calcula alinhamento com a maioria do partido', () => {
    const meusVotos = [
      { votacaoId: 'v1', tipo: 'SIM' },
      { votacaoId: 'v2', tipo: 'NAO' },
    ];
    const votosPartido = [
      // v1: maioria SIM
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'eu' },
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'colega' },
      { votacaoId: 'v1', tipo: 'NAO', parlamentarId: 'colega2' },
      // v2: maioria NAO
      { votacaoId: 'v2', tipo: 'NAO', parlamentarId: 'eu' },
      { votacaoId: 'v2', tipo: 'NAO', parlamentarId: 'colega' },
      { votacaoId: 'v2', tipo: 'SIM', parlamentarId: 'colega2' },
    ];
    const result = computeAlinhamento(meusVotos, votosPartido, 'eu');
    expect(result.totalVotacoes).toBe(2);
    expect(result.votosAlinhados).toBe(2);
    expect(result.percentualAlinhamento).toBe(100);
  });

  it('ignora votos de ausência no cálculo de alinhamento', () => {
    const meusVotos = [
      { votacaoId: 'v1', tipo: 'SIM' },
      { votacaoId: 'v2', tipo: 'AUSENTE' },
    ];
    const votosPartido = [
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'eu' },
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'colega' },
    ];
    const result = computeAlinhamento(meusVotos, votosPartido, 'eu');
    expect(result.totalVotacoes).toBe(1);
    expect(result.votosAlinhados).toBe(1);
  });

  it('calcula ranking dentro do partido', () => {
    const meusVotos = [
      { votacaoId: 'v1', tipo: 'NAO' },
      { votacaoId: 'v2', tipo: 'SIM' },
    ];
    const votosPartido = [
      { votacaoId: 'v1', tipo: 'NAO', parlamentarId: 'eu' },
      { votacaoId: 'v2', tipo: 'SIM', parlamentarId: 'eu' },
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'colega' },
      { votacaoId: 'v2', tipo: 'SIM', parlamentarId: 'colega' },
      { votacaoId: 'v1', tipo: 'SIM', parlamentarId: 'colega2' },
      { votacaoId: 'v2', tipo: 'SIM', parlamentarId: 'colega2' },
    ];
    const result = computeAlinhamento(meusVotos, votosPartido, 'eu');
    // eu: v1 NAO (maioria SIM) → não alinhado; v2 SIM → alinhado = 50%
    // colega e colega2: 100%
    expect(result.totalVotacoes).toBe(2);
    expect(result.votosAlinhados).toBe(1);
    expect(result.percentualAlinhamento).toBe(50);
    expect(result.totalPartido).toBe(3);
    expect(result.rankingPartido).toBe(3);
  });
});

describe('computeAtividadeMensal', () => {
  it('agrega votações, discursos e proposições por mês', () => {
    const votos = [
      { votacaoId: 'v1', tipo: 'SIM', data: new Date(2024, 0, 5) },
      { votacaoId: 'v2', tipo: 'NAO', data: new Date(2024, 0, 6) },
      { votacaoId: 'v3', tipo: 'SIM', data: new Date(2024, 1, 6) },
    ];
    const discursos = [{ data: new Date(2024, 0, 10) }];
    const proposicoes = [{ data: new Date(2024, 2, 10) }];

    const meses = computeAtividadeMensal(votos, discursos, proposicoes);
    expect(meses).toHaveLength(12);
    expect(meses[0]).toEqual({ mes: '01', votações: 2, discursos: 1, proposicoes: 0 });
    expect(meses[1]).toEqual({ mes: '02', votações: 1, discursos: 0, proposicoes: 0 });
    expect(meses[2]).toEqual({ mes: '03', votações: 0, discursos: 0, proposicoes: 1 });
  });

  it('não conta a mesma votação duas vezes', () => {
    const votos = [
      { votacaoId: 'v1', tipo: 'SIM', data: new Date(2024, 0, 5) },
      { votacaoId: 'v1', tipo: 'SIM', data: new Date(2024, 0, 5) },
    ];
    const meses = computeAtividadeMensal(votos, [], []);
    expect(meses[0].votações).toBe(1);
  });
});

describe('computeTemas', () => {
  it('agrega temas com contagem por tipo', () => {
    const votacoes = [{ tema: 'Economia' }, { tema: 'Economia' }, { tema: null }];
    const discursos = [{ tema: 'Saúde' }];
    const proposicoes = [{ tema: 'Economia' }];

    const temas = computeTemas(votacoes, discursos, proposicoes);
    const economia = temas.find((t) => t.tema === 'Economia');
    expect(economia).toBeDefined();
    expect(economia!.votações).toBe(2);
    expect(economia!.discursos).toBe(0);
    expect(economia!.proposicoes).toBe(1);
    expect(economia!.total).toBe(3);
  });

  it('usa "Sem tema" para valores nulos', () => {
    const temas = computeTemas([{ tema: null }], [], []);
    expect(temas[0].tema).toBe('Sem tema');
  });

  it('ordena por total decrescente', () => {
    const temas = computeTemas(
      [{ tema: 'A' }, { tema: 'B' }, { tema: 'B' }],
      [],
      []
    );
    expect(temas[0].tema).toBe('B');
  });
});
