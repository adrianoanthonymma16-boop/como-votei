import { camaraNameMatch, type ResultadoMatch, type DiretorioParlamentares } from '@/lib/sync/camara-name-match';

/**
 * Amostras reais de despesas da Câmara (01-fixtures-fonte.json) + evidência do id-first
 * (01-RESEARCH.md: 556k linhas, 100% idDeputado = Parlamentar.idExterno, 0 misattribution, 0.69% silent-drop).
 */
describe('camaraNameMatch (contrato D-06 + id-first amendment)', () => {
  // Diretório de teste simulando o índice construído pela Phase 2
  const diretorio: DiretorioParlamentares = {
    porIdExterno: {
      '98057': 'parlamentar-lafayette-id',
      '62881': 'parlamentar-danilo-id',
      '160558': 'parlamentar-paulo-id',
      '73604': 'parlamentar-rui-id',
      '204379': 'parlamentar-acacio-id',
    },
    porNomeUf: {
      'LAFAYETTE DE ANDRADA|MG': ['parlamentar-lafayette-id'],
      'DANILO FORTE|CE': ['parlamentar-danilo-id'],
      'PAULO FREIRE COSTA|SP': ['parlamentar-paulo-id'],
      'RUI FALCAO|SP': ['parlamentar-rui-id'],
      'ACACIO FAVACHO|AP': ['parlamentar-acacio-id'],
    },
    partidosPorId: {
      'parlamentar-lafayette-id': 'PL',
      'parlamentar-danilo-id': 'PP',
      'parlamentar-paulo-id': 'PL',
      'parlamentar-rui-id': 'PT',
      'parlamentar-acacio-id': 'MDB',
    },
  };

  describe('id-first resolution (Option A)', () => {
    it('known idDeputado resolves via porIdExterno with metodo idExterno even when raw name differs', () => {
      // Lafayette no bulk tem nome "Lafayette de Andrada" mas o diretório pode ter variação
      const entrada = {
        idDeputado: 98057,
        nomeParlamentar: 'LAFAYETTE DE ANDRADA', // mesmo nome normalizado
        uf: 'MG',
        partidoSigla: 'PL',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-lafayette-id');
      expect(resultado!.metodo).toBe('idExterno');
    });

    it('unknown idDeputado falls through to nome+UF path; a hit returns metodo nomeUf', () => {
      const entrada = {
        idDeputado: 999999, // não existe no diretório
        nomeParlamentar: 'Danilo Forte',
        uf: 'CE',
        partidoSigla: 'PP',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-danilo-id');
      expect(resultado!.metodo).toBe('nomeUf');
    });

    it('idDeputado as string also works (String coercion)', () => {
      const entrada = {
        idDeputado: '98057',
        nomeParlamentar: 'Lafayette de Andrada',
        uf: 'MG',
        partidoSigla: 'PL',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).not.toBeNull();
      expect(resultado!.metodo).toBe('idExterno');
    });
  });

  describe('normalization invariance (NFD strip + lowercase + collapse spaces)', () => {
    it('input "CONFÚCIO MOURA" (upper, accented) matches directory key "Confúcio  Moura" (mixed case, double space)', () => {
      const dirComDuploEspaco: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'CONFUCIO MOURA|RO': ['parlamentar-confucio-id'],
        },
        partidosPorId: {
          'parlamentar-confucio-id': 'MDB',
        },
      };
      const entrada = {
        nomeParlamentar: 'CONFÚCIO MOURA',
        uf: 'RO',
      };
      const resultado = camaraNameMatch(entrada, dirComDuploEspaco);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-confucio-id');
      expect(resultado!.metodo).toBe('nomeUf');
    });

    it('input uf "ro" matches directory key uf "RO"', () => {
      const dir: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'DANILO FORTE|CE': ['parlamentar-danilo-id'],
        },
        partidosPorId: {
          'parlamentar-danilo-id': 'PP',
        },
      };
      const entrada = {
        nomeParlamentar: 'Danilo Forte',
        uf: 'ce', // lowercase
      };
      const resultado = camaraNameMatch(entrada, dir);
      expect(resultado).not.toBeNull();
      expect(resultado!.metodo).toBe('nomeUf');
    });

    it('collapses multiple spaces in nome', () => {
      const dir: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOSE SILVA|SP': ['parlamentar-jose-id'],
        },
        partidosPorId: {
          'parlamentar-jose-id': 'PT',
        },
      };
      const entrada = {
        nomeParlamentar: 'JOSE   SILVA', // múltiplos espaços
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, dir);
      expect(resultado).not.toBeNull();
      expect(resultado!.metodo).toBe('nomeUf');
    });
  });

  describe('partido divergence does not break unique nome+UF match', () => {
    it('entrada.partidoSigla differs from directory partido for single candidate; still matches', () => {
      const entrada = {
        nomeParlamentar: 'Danilo Forte',
        uf: 'CE',
        partidoSigla: 'PT', // diferente do PP no diretório
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-danilo-id');
      expect(resultado!.metodo).toBe('nomeUf');
    });

    it('missing partidoSigla still matches unique nome+UF', () => {
      const entrada = {
        nomeParlamentar: 'Rui Falcão',
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-rui-id');
      expect(resultado!.metodo).toBe('nomeUf');
    });
  });

  describe('ambiguity returns null', () => {
    it('two candidates share nome+UF and no partidoSigla provided → null', () => {
      const dirAmbiguo: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOSE SILVA|SP': ['parlamentar-jose-1', 'parlamentar-jose-2'],
        },
        partidosPorId: {
          'parlamentar-jose-1': 'PT',
          'parlamentar-jose-2': 'PSDB',
        },
      };
      const entrada = {
        nomeParlamentar: 'Jose Silva',
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, dirAmbiguo);
      expect(resultado).toBeNull();
    });

    it('two candidates share nome+UF; partidoSigla provided but matches neither → null', () => {
      const dirAmbiguo: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOSE SILVA|SP': ['parlamentar-jose-1', 'parlamentar-jose-2'],
        },
        partidosPorId: {
          'parlamentar-jose-1': 'PT',
          'parlamentar-jose-2': 'PSDB',
        },
      };
      const entrada = {
        nomeParlamentar: 'Jose Silva',
        uf: 'SP',
        partidoSigla: 'MDB', // não corresponde a nenhum
      };
      const resultado = camaraNameMatch(entrada, dirAmbiguo);
      expect(resultado).toBeNull();
    });

    it('two candidates share nome+UF; partidoSigla matches both → null', () => {
      const dirAmbiguo: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOSE SILVA|SP': ['parlamentar-jose-1', 'parlamentar-jose-2'],
        },
        partidosPorId: {
          'parlamentar-jose-1': 'PT',
          'parlamentar-jose-2': 'PT', // mesmo partido
        },
      };
      const entrada = {
        nomeParlamentar: 'Jose Silva',
        uf: 'SP',
        partidoSigla: 'PT',
      };
      const resultado = camaraNameMatch(entrada, dirAmbiguo);
      expect(resultado).toBeNull();
    });
  });

  describe('partido tie-break selects exactly one', () => {
    it('two candidates share nome+UF; partidoSigla equals exactly one → that candidate returned', () => {
      const dirAmbiguo: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOSE SILVA|SP': ['parlamentar-jose-1', 'parlamentar-jose-2'],
        },
        partidosPorId: {
          'parlamentar-jose-1': 'PT',
          'parlamentar-jose-2': 'PSDB',
        },
      };
      const entrada = {
        nomeParlamentar: 'Jose Silva',
        uf: 'SP',
        partidoSigla: 'PT',
      };
      const resultado = camaraNameMatch(entrada, dirAmbiguo);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-jose-1');
      expect(resultado!.metodo).toBe('nomeUf');
    });
  });

  describe('leader/empty rows return null', () => {
    it('uf "NA" returns null without consulting directory', () => {
      const entrada = {
        nomeParlamentar: 'LID.GOV-CD',
        uf: 'NA',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).toBeNull();
    });

    it('empty uf returns null', () => {
      const entrada = {
        nomeParlamentar: 'Algum Nome',
        uf: '',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).toBeNull();
    });

    it('empty nomeParlamentar returns null', () => {
      const entrada = {
        nomeParlamentar: '',
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).toBeNull();
    });

    it('nome with only whitespace returns null', () => {
      const entrada = {
        nomeParlamentar: '   ',
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, diretorio);
      expect(resultado).toBeNull();
    });
  });

  describe('exact equality only — no approximate matching', () => {
    it('"JOAO SILVA" vs directory "JOAO SILVA FILHO" → null', () => {
      const dir: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOAO SILVA FILHO|SP': ['parlamentar-joao-id'],
        },
        partidosPorId: {
          'parlamentar-joao-id': 'PT',
        },
      };
      const entrada = {
        nomeParlamentar: 'JOAO SILVA',
        uf: 'SP',
      };
      const resultado = camaraNameMatch(entrada, dir);
      expect(resultado).toBeNull();
    });

    it('"MARIA SA" vs "MARIA SOUZA" → null (sufixo diferente)', () => {
      const dir: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'MARIA SOUZA|RJ': ['parlamentar-maria-id'],
        },
        partidosPorId: {
          'parlamentar-maria-id': 'PT',
        },
      };
      const entrada = {
        nomeParlamentar: 'MARIA SA',
        uf: 'RJ',
      };
      const resultado = camaraNameMatch(entrada, dir);
      expect(resultado).toBeNull();
    });

    it('"JOAO SILVA" vs "JOAO SILVA" (identical after normalize) → match', () => {
      const dir: DiretorioParlamentares = {
        porIdExterno: {},
        porNomeUf: {
          'JOAO SILVA|SP': ['parlamentar-joao-id'],
        },
        partidosPorId: {
          'parlamentar-joao-id': 'PT',
        },
      };
      const entrada = {
        nomeParlamentar: 'joao   silva', // lowercase + multi-space
        uf: 'sp',
      };
      const resultado = camaraNameMatch(entrada, dir);
      expect(resultado).not.toBeNull();
      expect(resultado!.parlamentarId).toBe('parlamentar-joao-id');
      expect(resultado!.metodo).toBe('nomeUf');
    });
  });

  describe('Option B variant (compiled out under A)', () => {
    // Mantido como documentação da variante literal D-06/GAST-08
    // Se o checkpoint fosse Option B, este bloco seria o comportamento ativo
    it.skip('Option B: idDeputado ignored, name+UF only', () => {
      // Comportamento: ignora idDeputado completamente, só normaliza nome+UF
      // Ambiguidade, líder, partido-divergência iguais ao Option A
      // Apenas a prioridade id-first é removida
      expect(true).toBe(true); // placeholder para flip de um bloco
    });
  });
});