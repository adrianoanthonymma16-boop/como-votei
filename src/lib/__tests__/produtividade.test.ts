import { calcularPontuacao } from '@/lib/produtividade';

describe('produtividade', () => {
  it('soma pesos corretamente', () => {
    expect(
      calcularPontuacao({ plApresentados: 2, plAprovados: 1, faltas: 1, votosSimNao: 10, discursos: 20 })
    ).toBeCloseTo(2 * 0.5 + 1 * 1 + 1 * -0.2 + 10 * 0.3 + 20 * 0.05, 5);
  });

  it('penaliza faltas', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 5, votosSimNao: 0, discursos: 0 })).toBe(
      -1
    );
  });

  it('retorna 0 sem atividade', () => {
    expect(calcularPontuacao({ plApresentados: 0, plAprovados: 0, faltas: 0, votosSimNao: 0, discursos: 0 })).toBe(0);
  });
});
