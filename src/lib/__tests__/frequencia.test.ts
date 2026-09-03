import { somarFrequencias } from '../frequencia';

describe('somarFrequencias (dados oficiais)', () => {
  it('soma presenças e faltas de vários anos', () => {
    const total = somarFrequencias([
      { ano: 2024, totalSessoes: 100, presencas: 90, faltasJustificadas: 7, faltasInjustificadas: 3 },
      { ano: 2023, totalSessoes: 100, presencas: 80, faltasJustificadas: 10, faltasInjustificadas: 10 },
    ]);
    expect(total).toEqual({
      totalSessoes: 200,
      presencas: 170,
      faltasJustificadas: 17,
      faltasInjustificadas: 13,
      taxaPresenca: 85,
    });
  });

  it('recalcula a taxa sobre o somatório (não herda média)', () => {
    const total = somarFrequencias([
      { ano: 2024, totalSessoes: 10, presencas: 10, faltasJustificadas: 0, faltasInjustificadas: 0 },
      { ano: 2023, totalSessoes: 90, presencas: 0, faltasJustificadas: 45, faltasInjustificadas: 45 },
    ]);
    // 10/100 = 10%, não a média de 100% e 0%
    expect(total?.taxaPresenca).toBe(10);
  });

  it('retorna null sem registros oficiais (sem estimativa)', () => {
    expect(somarFrequencias([])).toBeNull();
  });

  it('taxa 0 quando total de sessões é 0', () => {
    const total = somarFrequencias([
      { ano: 2024, totalSessoes: 0, presencas: 0, faltasJustificadas: 0, faltasInjustificadas: 0 },
    ]);
    expect(total?.taxaPresenca).toBe(0);
  });

  it('arredonda a taxa em 1 casa decimal', () => {
    const total = somarFrequencias([
      { ano: 2024, totalSessoes: 3, presencas: 2, faltasJustificadas: 1, faltasInjustificadas: 0 },
    ]);
    expect(total?.taxaPresenca).toBeCloseTo(66.7, 1);
  });
});
