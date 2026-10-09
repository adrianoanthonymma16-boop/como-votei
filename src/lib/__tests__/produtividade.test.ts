import {
  calcularPontuacao,
  contadoresDeGrupos,
  filtroStatusAprovada,
  grupoDoTipo,
  resumoProdutividade,
  somarContagem,
  PESO_APRESENTACAO,
  PESO_APROVACAO,
  FATOR_COAUTORIA,
  type ContadoresProdutividade,
} from '@/lib/produtividade';

describe('filtroStatusAprovada', () => {
  it("aprovada=true filtra IN no conjunto oficial", () => {
    expect(filtroStatusAprovada('true')).toEqual({
      in: ['APROVADA_CAMARA', 'APROVADA_SENADO', 'SANCIONADA'],
    });
  });

  it("aprovada=false filtra NOT IN no mesmo conjunto", () => {
    expect(filtroStatusAprovada('false')).toEqual({
      notIn: ['APROVADA_CAMARA', 'APROVADA_SENADO', 'SANCIONADA'],
    });
  });

  it('sem filtro retorna undefined', () => {
    expect(filtroStatusAprovada(undefined)).toBeUndefined();
  });
});

describe('grupoDoTipo', () => {
  it('mapeia siglas da Câmara', () => {
    expect(grupoDoTipo('PL')).toBe('PL');
    expect(grupoDoTipo('PLP')).toBe('PLP');
    expect(grupoDoTipo('PEC')).toBe('PEC');
    expect(grupoDoTipo('MPV')).toBe('PL');
    expect(grupoDoTipo('PLV')).toBe('PL');
    expect(grupoDoTipo('PDL')).toBe('PDL_PRC');
    expect(grupoDoTipo('PRC')).toBe('PDL_PRC');
    expect(grupoDoTipo('REQ')).toBe('REQ');
    expect(grupoDoTipo('RIC')).toBe('REQ');
    expect(grupoDoTipo('INC')).toBe('INC');
  });

  it('mapeia siglas do Senado', () => {
    expect(grupoDoTipo('PLS')).toBe('PL');
    expect(grupoDoTipo('PLC')).toBe('PL');
    expect(grupoDoTipo('PDS')).toBe('PDL_PRC');
    expect(grupoDoTipo('PRS')).toBe('PDL_PRC');
    expect(grupoDoTipo('RQS')).toBe('REQ');
    expect(grupoDoTipo('R.S')).toBe('REQ');
    expect(grupoDoTipo('SUG')).toBe('INC');
  });

  it('sigla desconhecida ou vazia cai em OUTRO', () => {
    expect(grupoDoTipo('XYZ')).toBe('OUTRO');
    expect(grupoDoTipo('')).toBe('OUTRO');
    expect(grupoDoTipo(undefined)).toBe('OUTRO');
  });
});

describe('pesos por tipo', () => {
  it('PEC vale mais que PLP, que vale mais que PL (apresentação e aprovação)', () => {
    expect(PESO_APRESENTACAO.PEC).toBeGreaterThan(PESO_APRESENTACAO.PLP);
    expect(PESO_APRESENTACAO.PLP).toBeGreaterThan(PESO_APRESENTACAO.PL);
    expect(PESO_APROVACAO.PEC).toBeGreaterThan(PESO_APROVACAO.PLP);
    expect(PESO_APROVACAO.PLP).toBeGreaterThan(PESO_APROVACAO.PL);
  });

  it('PL mantém a escala histórica (0,05 apresentação / 1 aprovação)', () => {
    expect(PESO_APRESENTACAO.PL).toBe(0.05);
    expect(PESO_APROVACAO.PL).toBe(1);
  });

  it('REQ aprovado vale menos que um voto SIM/NÃO acumulado? Não — mas volume de REQ não domina PL aprovado', () => {
    // 10 REQs aprovados devem valer menos que 1 PL aprovado
    expect(10 * (PESO_APRESENTACAO.REQ + PESO_APROVACAO.REQ)).toBeLessThan(
      PESO_APRESENTACAO.PL + PESO_APROVACAO.PL
    );
  });
});

describe('contadoresDeGrupos', () => {
  it('agrega por grupo, separando principal/coautoria e aprovadas', () => {
    const contadores = contadoresDeGrupos([
      { tipo: 'PL', autorPrincipal: true, status: 'EM_TRAMITACAO' },
      { tipo: 'PL', autorPrincipal: true, status: 'SANCIONADA' },
      { tipo: 'PEC', autorPrincipal: false, status: 'EM_TRAMITACAO' },
      { tipo: 'REQ', autorPrincipal: true, status: 'APROVADA_CAMARA' },
    ]);

    expect(contadores.apresentadosPrincipal.PL).toBe(2);
    expect(contadores.aprovados.PL).toBe(1);
    expect(contadores.apresentadosCoautoria.PEC).toBe(1);
    // REQ aprovada de autor principal conta apresentação + aprovação
    expect(contadores.apresentadosPrincipal.REQ).toBe(1);
    expect(contadores.aprovados.REQ).toBe(1);
  });

  it('coautoria aprovada NÃO conta como aprovação (só apresentação)', () => {
    const contadores = contadoresDeGrupos([
      { tipo: 'PL', autorPrincipal: false, status: 'SANCIONADA' },
    ]);
    expect(contadores.apresentadosCoautoria.PL).toBe(1);
    expect(contadores.aprovados.PL ?? 0).toBe(0);
  });
});

describe('resumoProdutividade', () => {
  it('soma apresentação (principal + coautoria) e aprovações', () => {
    expect(
      resumoProdutividade({
        apresentadosPrincipal: { PL: 2, PEC: 1 },
        apresentadosCoautoria: { REQ: 3 },
        aprovados: { PL: 1 },
      })
    ).toEqual({ apresentadas: 6, aprovadas: 1 });
  });

  it('vazio retorna zeros', () => {
    expect(resumoProdutividade({})).toEqual({ apresentadas: 0, aprovadas: 0 });
  });

  it('somarContagem soma valores do mapa', () => {
    expect(somarContagem({ PL: 2, PEC: 1 })).toBe(3);
    expect(somarContagem({})).toBe(0);
    expect(somarContagem(undefined)).toBe(0);
  });
});

describe('calcularPontuacao (nova métrica por tipo)', () => {
  const zerados = (): ContadoresProdutividade => ({
    apresentadosPrincipal: {},
    apresentadosCoautoria: {},
    aprovados: {},
    faltas: 0,
    votosSimNao: 0,
    discursos: 0,
  });

  it('retorna 0 sem atividade', () => {
    expect(calcularPontuacao(zerados())).toBe(0);
  });

  it('penaliza faltas', () => {
    expect(calcularPontuacao({ ...zerados(), faltas: 5 })).toBe(-0.1);
  });

  it('PL aprovado de autor principal = 0,05 + 1', () => {
    const c = zerados();
    c.apresentadosPrincipal = { PL: 1 };
    c.aprovados = { PL: 1 };
    expect(calcularPontuacao(c)).toBeCloseTo(1.05, 5);
  });

  it('coautoria vale metade da apresentação', () => {
    const principal = calcularPontuacao({ ...zerados(), apresentadosPrincipal: { PL: 1 } });
    const coaut = calcularPontuacao({ ...zerados(), apresentadosCoautoria: { PL: 1 } });
    expect(coaut).toBeCloseTo(principal * FATOR_COAUTORIA, 5);
    expect(FATOR_COAUTORIA).toBe(0.5);
  });

  it('PEC aprovada domina o ranking (reflete rito de 3/5 em dois turnos)', () => {
    const pec = zerados();
    pec.apresentadosPrincipal = { PEC: 1 };
    pec.aprovados = { PEC: 1 };
    const pl = zerados();
    pl.apresentadosPrincipal = { PL: 1 };
    pl.aprovados = { PL: 1 };
    expect(calcularPontuacao(pec)).toBeGreaterThan(calcularPontuacao(pl));
  });

  it('soma pesos corretamente num caso misto', () => {
    const c: ContadoresProdutividade = {
      apresentadosPrincipal: { PL: 2, REQ: 3 },
      apresentadosCoautoria: { PEC: 1 },
      aprovados: { PL: 1 },
      faltas: 1,
      votosSimNao: 10,
      discursos: 20,
    };
    const esperado =
      2 * PESO_APRESENTACAO.PL +
      3 * PESO_APRESENTACAO.REQ +
      1 * PESO_APRESENTACAO.PEC * FATOR_COAUTORIA +
      1 * PESO_APROVACAO.PL +
      1 * -0.02 +
      10 * 0.03 +
      20 * 0.005;
    expect(calcularPontuacao(c)).toBeCloseTo(esperado, 5);
  });
});
