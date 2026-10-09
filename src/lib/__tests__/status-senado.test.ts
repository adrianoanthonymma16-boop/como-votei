import { mapStatusProposicaoSenado } from '@/lib/sync/senado-adapter';

describe('mapStatusProposicaoSenado', () => {
  it('norma jurídica / sanção / promulgação → SANCIONADA', () => {
    expect(mapStatusProposicaoSenado('TRANSFORMADA EM NORMA JURÍDICA', 'Não')).toBe('SANCIONADA');
    expect(mapStatusProposicaoSenado('AGUARDANDO SANÇÃO', 'Sim')).toBe('SANCIONADA');
    expect(mapStatusProposicaoSenado('PROMULGADA', 'Não')).toBe('SANCIONADA');
  });

  it('veto → VETADA', () => {
    expect(mapStatusProposicaoSenado('VETADA PARCIALMENTE', 'Não')).toBe('VETADA');
    expect(mapStatusProposicaoSenado('AGUARDANDO APRECIAÇÃO DO VETO', 'Sim')).toBe('VETADA');
  });

  it('retirada pelo autor → RETIRADA', () => {
    expect(mapStatusProposicaoSenado('RETIRADA PELO AUTOR', 'Não')).toBe('RETIRADA');
  });

  it('aprovada remetida à Câmara → APROVADA_SENADO', () => {
    expect(mapStatusProposicaoSenado('APROVADA E REMETIDA À CÂMARA DOS DEPUTADOS', 'Não')).toBe(
      'APROVADA_SENADO'
    );
    expect(mapStatusProposicaoSenado('APROVADA PELO PLENÁRIO DO SENADO', 'Sim')).toBe(
      'APROVADA_SENADO'
    );
  });

  it('aprovada na Câmara (revisão) → APROVADA_CAMARA', () => {
    expect(mapStatusProposicaoSenado('APROVADA NA CÂMARA DOS DEPUTADOS', 'Não')).toBe(
      'APROVADA_CAMARA'
    );
  });

  it('rejeitada / arquivada / tramitação encerrada → ARQUIVADA', () => {
    expect(mapStatusProposicaoSenado('REJEITADA', 'Não')).toBe('ARQUIVADA');
    expect(mapStatusProposicaoSenado('ARQUIVADA AO FINAL DA LEGISLATURA', 'Não')).toBe('ARQUIVADA');
    expect(mapStatusProposicaoSenado('TRAMITAÇÃO ENCERRADA', 'Não')).toBe('ARQUIVADA');
    expect(mapStatusProposicaoSenado('PREJUDICADA', 'Não')).toBe('ARQUIVADA');
  });

  it('sem descrição: tramitando → EM_TRAMITACAO, senão APRESENTADA', () => {
    expect(mapStatusProposicaoSenado(undefined, 'Sim')).toBe('EM_TRAMITACAO');
    expect(mapStatusProposicaoSenado(undefined, 'Não')).toBe('APRESENTADA');
    expect(mapStatusProposicaoSenado('APRESENTADA EM PLENÁRIO', 'Sim')).toBe('APRESENTADA');
  });

  it('tramitando sem palavra terminal → EM_TRAMITACAO; encerrada sem palavra → ARQUIVADA', () => {
    expect(mapStatusProposicaoSenado('AGUARDANDO DESIGNAÇÃO DO RELATOR', 'Sim')).toBe(
      'EM_TRAMITACAO'
    );
    expect(mapStatusProposicaoSenado('ALGUMA SITUAÇÃO DESCONHECIDA', 'Não')).toBe('ARQUIVADA');
  });
});
