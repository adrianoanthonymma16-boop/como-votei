import {
  urlBulk,
  idDeUri,
  interpretarAutoria,
  normalizarVotacaoBulk,
  normalizarTipoVotoBulk,
} from '../camara-bulk';

describe('urlBulk', () => {
  it('monta a URL do conjunto para o ano', () => {
    expect(urlBulk('proposicoes', 2025)).toBe(
      'https://dadosabertos.camara.leg.br/arquivos/proposicoes/json/proposicoes-2025.json'
    );
  });
});

describe('idDeUri', () => {
  it('extrai o último segmento da URI', () => {
    expect(idDeUri('https://dadosabertos.camara.leg.br/api/v2/proposicoes/13496')).toBe('13496');
    expect(idDeUri('https://dadosabertos.camara.leg.br/api/v2/deputados/204379')).toBe('204379');
  });

  it('tolera barra final', () => {
    expect(idDeUri('https://x/api/v2/orgaos/78/')).toBe('78');
  });

  it('devolve undefined para string vazia', () => {
    expect(idDeUri('')).toBeUndefined();
  });
});

describe('interpretarAutoria', () => {
  it('marca proponente=1 como principal', () => {
    expect(
      interpretarAutoria({
        idProposicao: 1,
        uriAutor: 'https://dadosabertos.camara.leg.br/api/v2/deputados/204379',
        ordemAssinatura: '2',
        proponente: '1',
      })
    ).toEqual({ idProposicao: 1, autorIdExterno: '204379', principal: true });
  });

  it('marca ordemAssinatura=1 como principal', () => {
    expect(
      interpretarAutoria({
        idProposicao: 2,
        uriAutor: 'https://dadosabertos.camara.leg.br/api/v2/deputados/123',
        ordemAssinatura: '1',
      })
    ).toEqual({ idProposicao: 2, autorIdExterno: '123', principal: true });
  });

  it('coautor comum não é principal', () => {
    expect(
      interpretarAutoria({
        idProposicao: 3,
        uriAutor: 'https://dadosabertos.camara.leg.br/api/v2/deputados/999',
        ordemAssinatura: '5',
        proponente: '0',
      })
    ).toEqual({ idProposicao: 3, autorIdExterno: '999', principal: false });
  });
});

describe('normalizarVotacaoBulk', () => {
  it('converte aprovação 1 em APROVADA', () => {
    const v = normalizarVotacaoBulk({
      id: '2458405-38',
      data: '2025-02-04',
      siglaOrgao: 'PLEN',
      descricao: 'Aprovado o projeto de lei sobre saúde pública.',
      aprovacao: 1,
    });
    expect(v.casa).toBe('CAMARA');
    expect(v.resultado).toBe('APROVADA');
    expect(v.data).toBeInstanceOf(Date);
    // Classificação de tema vem de `extrairTemaPrincipal` (coberta em temas.test).
    expect(typeof v.tema).toBe('string');
  });

  it('converte aprovação 0 em REJEITADA', () => {
    const v = normalizarVotacaoBulk({
      id: 'x',
      data: '2025-01-01',
      siglaOrgao: 'PLEN',
      descricao: 'Rejeitado.',
      aprovacao: 0,
    });
    expect(v.resultado).toBe('REJEITADA');
  });

  it('sem aprovação deixa resultado indefinido', () => {
    const v = normalizarVotacaoBulk({
      id: 'y',
      data: '2025-01-01',
      siglaOrgao: 'PLEN',
      descricao: 'Votação simbólica.',
    });
    expect(v.resultado).toBeUndefined();
  });
});

describe('normalizarTipoVotoBulk', () => {
  it('mapeia os votos oficiais da Câmara', () => {
    expect(normalizarTipoVotoBulk('Sim')).toBe('SIM');
    expect(normalizarTipoVotoBulk('Não')).toBe('NAO');
    expect(normalizarTipoVotoBulk('Abstenção')).toBe('ABSTENCAO');
    expect(normalizarTipoVotoBulk('Obstrução')).toBe('OBSTRUCAO');
    expect(normalizarTipoVotoBulk('Art. 17')).toBe('ARTICULACAO');
  });

  it('é case-insensitive e tolera espaços', () => {
    expect(normalizarTipoVotoBulk('  sim ')).toBe('SIM');
    expect(normalizarTipoVotoBulk('NAO')).toBe('NAO');
  });

  it('devolve undefined para voto desconhecido', () => {
    expect(normalizarTipoVotoBulk('Votou')).toBeUndefined();
    expect(normalizarTipoVotoBulk('')).toBeUndefined();
  });
});
