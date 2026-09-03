import { mapStatusProposicao } from '../sync/camara-adapter';

/**
 * Amostras reais de `statusProposicao.descricaoSituacao` da API da Câmara
 * (100 proposições 2022/2024) + estados oficiais de /referencias/situacoesProposicao.
 */
describe('mapStatusProposicao (conceitos oficiais da Câmara)', () => {
  it('retorna APRESENTADA sem status', () => {
    expect(mapStatusProposicao(undefined)).toBe('APRESENTADA');
  });

  it('mapeia estados terminais de aprovação', () => {
    expect(mapStatusProposicao('Transformado em Norma Jurídica')).toBe('SANCIONADA');
    expect(mapStatusProposicao('Aguardando Sanção')).toBe('SANCIONADA');
    expect(mapStatusProposicao('Aguardando Remessa à Sanção')).toBe('SANCIONADA');
    expect(mapStatusProposicao('Aguardando Promulgação')).toBe('SANCIONADA');
  });

  it('mapeia veto', () => {
    expect(mapStatusProposicao('Vetado totalmente')).toBe('VETADA');
    expect(mapStatusProposicao('Aguardando Apreciação do Veto')).toBe('VETADA');
  });

  it('mapeia aprovação na Câmara aguardando Senado', () => {
    expect(mapStatusProposicao('Aguardando Apreciação pelo Senado Federal')).toBe('APROVADA_CAMARA');
    expect(mapStatusProposicao('Enviada ao Senado Federal')).toBe('APROVADA_CAMARA');
  });

  it('mapeia arquivamento e retirada (amostra real)', () => {
    expect(mapStatusProposicao('Arquivada')).toBe('ARQUIVADA');
    expect(mapStatusProposicao('Enviada ao Arquivo')).toBe('ARQUIVADA');
    expect(mapStatusProposicao('Retirado pelo(a) Autor(a)')).toBe('RETIRADA');
    expect(mapStatusProposicao('Perdeu a Eficácia')).toBe('ARQUIVADA');
    expect(mapStatusProposicao('Prejudicialidade')).toBe('ARQUIVADA');
    expect(mapStatusProposicao('Devolvida ao(à) Autor(a)')).toBe('ARQUIVADA');
  });

  it('mantém tramitação para estados intermediários (amostra real)', () => {
    expect(mapStatusProposicao('Aguardando Despacho do Presidente da Câmara dos Deputados (Chancela)')).toBe(
      'EM_TRAMITACAO'
    );
    expect(mapStatusProposicao('Tramitando em Conjunto')).toBe('EM_TRAMITACAO');
    expect(mapStatusProposicao('Aguardando Parecer')).toBe('EM_TRAMITACAO');
    expect(mapStatusProposicao('Pronta para Pauta')).toBe('EM_TRAMITACAO');
    expect(mapStatusProposicao('Aguardando Designação de Relator(a)')).toBe('EM_TRAMITACAO');
  });
});
