import { calcularPontuacao, filtroStatusAprovada } from '@/lib/produtividade';

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

describe('produtividade', () => {
  it('soma pesos corretamente', () => {
    expect(
      calcularPontuacao({ plApresentados: 2, plAprovados: 1, faltas: 1, votosSimNao: 10, discursos: 20 })
    ).toBeCloseTo(2 * 0.05 + 1 * 1 + 1 * -0.02 + 10 * 0.03 + 20 * 0.005, 5);
  });

  it('penaliza faltas', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 5, votosSimNao: 0, discursos: 0 })).toBe(
      -0.1
    );
  });

  it('retorna 0 sem atividade', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 0, votosSimNao: 0, discursos: 0 })).toBe(0);
  });

  it('PL aprovado tem peso maior que PL apresentado e voto', () => {
    const plAprov = calcularPontuacao({ plApresentados: 0, plAprovados: 1, faltas: 0, votosSimNao: 0, discursos: 0 });
    const plApres = calcularPontuacao({ plApresentados: 1, plAprovados: 0, faltas: 0, votosSimNao: 0, discursos: 0 });
    const soVoto = calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 0, votosSimNao: 1, discursos: 0 });
    expect(plAprov).toBeGreaterThan(plApres);
    expect(plApres).toBeGreaterThan(soVoto);
  });
});
