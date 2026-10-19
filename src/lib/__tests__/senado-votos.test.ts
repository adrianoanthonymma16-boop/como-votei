import { mapTipoVotoSenado } from '../sync/senado-adapter';

describe('mapTipoVotoSenado', () => {
  it('mapeia os votos nominais do Senado', () => {
    expect(mapTipoVotoSenado('Sim')).toBe('SIM');
    expect(mapTipoVotoSenado('Não')).toBe('NAO');
    expect(mapTipoVotoSenado('Abstenção')).toBe('ABSTENCAO');
  });

  it('separa voto sem direção divulgada de ausência', () => {
    expect(mapTipoVotoSenado('Votou')).toBe('VOTOU');
    expect(mapTipoVotoSenado('VO')).toBe('VOTOU');
  });

  it('mapeia articulação e obstrução', () => {
    expect(mapTipoVotoSenado('P-NRV')).toBe('ARTICULACAO');
    expect(mapTipoVotoSenado('OB')).toBe('OBSTRUCAO');
  });

  it('trata licença e missão antes de cair em ausente', () => {
    expect(mapTipoVotoSenado('L1')).toBe('LICENCA');
    expect(mapTipoVotoSenado('MIS')).toBe('MISSAO');
    expect(mapTipoVotoSenado('Missão')).toBe('MISSAO');
  });

  it('cai em AUSENTE para siglas desconhecidas', () => {
    expect(mapTipoVotoSenado('NCom')).toBe('AUSENTE');
    expect(mapTipoVotoSenado('')).toBe('AUSENTE');
  });
});
