import {
  chaveCelula,
  montarRelatorio,
  statusCelula,
  variacaoPercentual,
  variacoesSuspeitas,
  type CelulaCobertura,
} from '../coverage';

describe('coverage', () => {
  describe('chaveCelula', () => {
    it('monta a chave estável por casa, ano e dataset', () => {
      expect(chaveCelula('CAMARA', 2025, 'votos')).toBe('CAMARA:2025:votos');
    });
  });

  describe('variacaoPercentual', () => {
    it('calcula a variação com uma casa decimal', () => {
      expect(variacaoPercentual(130, 100, 2025, 2026)).toBe(30);
      expect(variacaoPercentual(85, 100, 2025, 2026)).toBe(-15);
    });

    it('não compara o ano corrente (ano parcial)', () => {
      expect(variacaoPercentual(10, 100, 2026, 2026)).toBeNull();
    });

    it('não compara quando o ano anterior está zerado', () => {
      expect(variacaoPercentual(10, 0, 2025, 2026)).toBeNull();
      expect(variacaoPercentual(10, null, 2025, 2026)).toBeNull();
    });
  });

  describe('statusCelula', () => {
    it('marca ok quando há linhas', () => {
      expect(statusCelula(10, 'CAMARA:2025:votos', {}).status).toBe('ok');
    });

    it('marca lacuna quando está zerado e não há justificativa', () => {
      expect(statusCelula(0, 'SENADO:2024:votos', {}).status).toBe('lacuna');
    });

    it('marca documentada quando a fonte não publica e há motivo', () => {
      const resultado = statusCelula(0, 'SENADO:2024:votos', {
        'SENADO:2024:votos': 'fonte não publica',
      });
      expect(resultado.status).toBe('documentada');
      expect(resultado.motivo).toBe('fonte não publica');
    });
  });

  describe('montarRelatorio', () => {
    const celulas: CelulaCobertura[] = [
      { casa: 'CAMARA', ano: 2024, dataset: 'votos', total: 100 },
      { casa: 'CAMARA', ano: 2025, dataset: 'votos', total: 150 },
      { casa: 'SENADO', ano: 2024, dataset: 'votos', total: 0 },
    ];

    it('separa falhas de lacunas documentadas', () => {
      const relatorio = montarRelatorio(
        celulas,
        { 'SENADO:2024:votos': 'fonte não publica votações nominais em 2024' },
        2026,
        { 'CAMARA:2024:votos': 80 }
      );

      expect(relatorio.falhas).toHaveLength(0);
      expect(relatorio.documentadas).toHaveLength(1);
      expect(relatorio.documentadas[0].motivo).toContain('fonte não publica');
    });

    it('calcula a variação a partir do ano anterior', () => {
      const relatorio = montarRelatorio(celulas, {}, 2026, { 'CAMARA:2024:votos': 100 });
      const linha2025 = relatorio.linhas.find((l) => l.ano === 2025 && l.casa === 'CAMARA');
      expect(linha2025?.variacao).toBe(50);
    });

    it('reprova célula zerada sem documentação', () => {
      const relatorio = montarRelatorio([{ casa: 'SENADO', ano: 2025, dataset: 'votos', total: 0 }], {}, 2026);
      expect(relatorio.falhas).toHaveLength(1);
    });
  });

  describe('variacoesSuspeitas', () => {
    it('sinaliza apenas variações acima do limiar', () => {
      const linhas = [
        { casa: 'CAMARA' as const, ano: 2025, dataset: 'votos' as const, total: 100, status: 'ok' as const, variacao: 40 },
        { casa: 'CAMARA' as const, ano: 2025, dataset: 'discursos' as const, total: 100, status: 'ok' as const, variacao: -10 },
      ];
      expect(variacoesSuspeitas(linhas)).toHaveLength(1);
    });
  });
});
