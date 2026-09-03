import { calcularPontuacao } from '@/lib/produtividade';

describe('produtividade', () => {
  it('soma pesos corretamente', () => {
    expect(
      calcularPontuacao({ plApresentados: 2, plAprovados: 1, faltas: 1, votosSimNao: 10, discursos: 20 })
    ).toBeCloseTo(2 * 1 + 1 * 0.1 + 1 * -0.02 + 10 * 0.03 + 20 * 0.005, 5);
  });

  it('penaliza faltas', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 5, votosSimNao: 0, discursos: 0 })).toBe(
      -0.1
    );
  });

  it('retorna 0 sem atividade', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 0, votosSimNao: 0, discursos: 0 })).toBe(0);
  });

  it('PL tem peso maior que outros (enfase)', () => {
    const soPL = calcularPontuacao({ plApresentados: 1, plAprovados: 0, faltas: 0, votosSimNao: 0, discursos: 0 });
    const soVoto = calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 0, votosSimNao: 1, discursos: 0 });
    expect(soPL).toBeGreaterThan(soVoto * 10);
  });
});
