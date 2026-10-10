/**
 * Testes do pipeline de streaming (yauzl + stream-json)
 * Verifica emissão de chunks e transformação de registros
 */

import { Readable } from 'stream';
import { chain } from 'stream-chain';
const streamArray = require('stream-json/streamers/stream-array');
import { derivarIdExternoDespesa } from '@/lib/sync/despesa-id';
import { parseBRL, parseDataFonte } from '@/lib/despesas';
import { camaraNameMatch, DiretorioParlamentares } from '@/lib/sync/camara-name-match';
import { DespesaNormalizada } from '@/lib/sync/types';

// Mock do diretório
const mockDiretorio: DiretorioParlamentares = {
  porIdExterno: {
    '98057': 'parl-1',
    '62881': 'parl-2',
    '160558': 'parl-3',
    '73604': 'parl-4',
  },
  porNomeUf: {
    'lafayette de andrada|mg': ['parl-1'],
    'danilo forte|ce': ['parl-2'],
    'paulo freire costa|sp': ['parl-3'],
    'rui falcao|sp': ['parl-4'],
  },
  partidosPorId: {
    'parl-1': 'PL',
    'parl-2': 'PP',
    'parl-3': 'PL',
    'parl-4': 'PT',
  },
};

// Import the transformRecord function logic (copied from script for testing)
function transformRecord(raw: Record<string, unknown>, diretorio: DiretorioParlamentares): DespesaNormalizada | null {
  try {
    const idExterno = derivarIdExternoDespesa('CAMARA', raw);

    const valor = parseBRL(raw.valorLiquido);
    const valorGlosa = parseBRL(raw.valorGlosa);
    const data = parseDataFonte(raw.dataEmissao);

    let mes = 0;
    if (data) {
      mes = data.getUTCMonth() + 1;
    } else if (typeof raw.mes === 'number' && raw.mes >= 1 && raw.mes <= 12) {
      mes = raw.mes;
    } else if (typeof raw.mes === 'string') {
      const parsedMes = parseInt(raw.mes, 10);
      if (!isNaN(parsedMes) && parsedMes >= 1 && parsedMes <= 12) {
        mes = parsedMes;
      }
    }

    const ano = typeof raw.ano === 'number' ? raw.ano : (typeof raw.ano === 'string' ? parseInt(raw.ano, 10) : new Date().getUTCFullYear());

    const categoria = String(raw.descricao || raw.numeroSubCota || '');
    const fornecedor = String(raw.fornecedor || '');
    const cpfCnpj = raw.cnpjCPF ? String(raw.cnpjCPF).trim() : undefined;
    const tipoDocumento = String(raw.tipoDocumento || '0');
    const numeroDocumento = String(raw.numero || '');
    const documento = `${tipoDocumento}-${numeroDocumento}`;
    const urlDocumento = raw.urlDocumento ? String(raw.urlDocumento) : undefined;
    const nomeParlamentarRaw = String(raw.nomeParlamentar || '');

    const entrada = {
      idDeputado: raw.idDeputado as number | string | undefined,
      nomeParlamentar: String(raw.nomeParlamentar || ''),
      uf: String(raw.siglaUF || ''),
      partidoSigla: raw.siglaPartido ? String(raw.siglaPartido) : undefined,
    };

    const match = camaraNameMatch(entrada, diretorio);
    const parlamentarIdExterno = match ? String(entrada.idDeputado) : undefined;

    return {
      idExterno,
      parlamentarIdExterno,
      nomeParlamentarRaw,
      casa: 'CAMARA',
      ano,
      mes,
      data: data || undefined,
      categoria,
      fornecedor,
      cpfCnpj,
      documento,
      valor: valor || '0',
      valorGlosa: valorGlosa ?? undefined,
      urlDocumento: urlDocumento ?? undefined,
    };
  } catch (err) {
    console.warn(`Erro ao transformar registro:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

describe('Streaming pipeline - transformRecord', () => {
  it('should transform a normal Câmara record with all fields', () => {
    const raw = {
      nomeParlamentar: 'Danilo Forte',
      cpf: '12133728368',
      idDeputado: 62881,
      siglaUF: 'CE',
      siglaPartido: 'PP',
      numeroSubCota: 1,
      descricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
      fornecedor: 'ALARES',
      cnpjCPF: '633.560.420/0018-0 ',
      numero: '5771570',
      tipoDocumento: '0',
      dataEmissao: '2025-02-28T00:00:00',
      valorDocumento: '104.58',
      valorGlosa: '0',
      valorLiquido: '104.58',
      mes: 2,
      ano: 2025,
      idDocumento: 7883485,
      urlDocumento: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2227/2025/7883485.pdf',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.idExterno).toMatch(/^CAMARA:7883485:[a-f0-9]{16}$/);
    expect(result!.parlamentarIdExterno).toBe('62881');
    expect(result!.nomeParlamentarRaw).toBe('Danilo Forte');
    expect(result!.casa).toBe('CAMARA');
    expect(result!.ano).toBe(2025);
    expect(result!.mes).toBe(2);
    expect(result!.data).toBeInstanceOf(Date);
    expect(result!.categoria).toBe('MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR');
    expect(result!.fornecedor).toBe('ALARES');
    expect(result!.cpfCnpj).toBe('633.560.420/0018-0');
    expect(result!.documento).toBe('0-5771570');
    expect(result!.valor).toBe('104.58');
    expect(result!.valorGlosa).toBe('0');
    expect(result!.urlDocumento).toBe('https://www.camara.leg.br/cota-parlamentar/documentos/publ/2227/2025/7883485.pdf');
  });

  it('should handle idDocumento=0 sentinel with empty dataEmissao', () => {
    const raw = {
      nomeParlamentar: 'Danilo Forte',
      idDeputado: 62881,
      siglaUF: 'CE',
      siglaPartido: 'PP',
      numeroSubCota: 10,
      descricao: 'TELEFONIA',
      fornecedor: 'CELULAR FUNCIONAL',
      cnpjCPF: '000.000.000/0000-1 ',
      numero: '7894035',
      tipoDocumento: '0',
      dataEmissao: '',
      valorDocumento: '224.65',
      valorGlosa: '0',
      valorLiquido: '224.65',
      mes: 1,
      ano: 2025,
      idDocumento: 0,
      urlDocumento: '',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.idExterno).toMatch(/^CAMARA:0:[a-f0-9]{16}$/);
    expect(result!.data).toBeUndefined();
    expect(result!.mes).toBe(1);
  });

  it('should handle negative valorLiquido (estorno)', () => {
    const raw = {
      nomeParlamentar: 'Danilo Forte',
      idDeputado: 62881,
      siglaUF: 'CE',
      siglaPartido: 'PP',
      numeroSubCota: 998,
      descricao: 'PASSAGEM AÉREA - SIGEPA',
      fornecedor: 'TAM',
      cnpjCPF: '020.128.620/0016-0 ',
      numero: '9572215776490',
      tipoDocumento: '0',
      dataEmissao: '2025-01-16T12:00:00',
      valorDocumento: '-1967.57',
      valorGlosa: '0',
      valorLiquido: '-1967.57',
      mes: 1,
      ano: 2025,
      idDocumento: 302649,
      urlDocumento: '',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.valor).toBe('-1967.57');
    expect(result!.valorGlosa).toBe('0');
  });

  it('should handle subcota-split: same idDocumento different content', () => {
    const raw1 = {
      nomeParlamentar: 'Lafayette de Andrada',
      idDeputado: 98057,
      siglaUF: 'MG',
      siglaPartido: 'PL',
      numeroSubCota: 1,
      descricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
      fornecedor: 'CLARO NEXTEL TELECOMUNICAÇÕES S.A',
      cnpjCPF: '669.702.290/0210-0 ',
      numero: '2501952681880',
      tipoDocumento: '0',
      dataEmissao: '2025-01-21T00:00:00',
      valorDocumento: '705.92',
      valorGlosa: '0',
      valorLiquido: '309.68',
      mes: 1,
      ano: 2025,
      idDocumento: 7869356,
      urlDocumento: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/3420/2025/7869356.pdf',
    };

    const raw2 = {
      ...raw1,
      numeroSubCota: 10,
      descricao: 'TELEFONIA',
      valorLiquido: '396.24',
      urlDocumento: '',
    };

    const result1 = transformRecord(raw1, mockDiretorio);
    const result2 = transformRecord(raw2, mockDiretorio);

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.idExterno).not.toBe(result2!.idExterno);
  });

  it('should handle leadership row (LID.GOV-CD) with no match', () => {
    const raw = {
      nomeParlamentar: 'LID.GOV-CD',
      cpf: '',
      idDeputado: 2812,
      siglaUF: 'NA',
      siglaPartido: '',
      numeroSubCota: 1,
      descricao: 'MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR',
      fornecedor: 'AMORETTO CAFES EXPRESSO LTDA',
      cnpjCPF: '085.324.290/0013-1 ',
      numero: '1984',
      tipoDocumento: '0',
      dataEmissao: '2025-02-07T00:00:00',
      valorDocumento: '1467',
      valorGlosa: '0',
      valorLiquido: '1467',
      mes: 2,
      ano: 2025,
      idDocumento: 7877589,
      urlDocumento: 'https://www.camara.leg.br/cota-parlamentar/documentos/publ/2812/2025/7877589.pdf',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.parlamentarIdExterno).toBeUndefined();
    expect(result!.nomeParlamentarRaw).toBe('LID.GOV-CD');
  });

  it('should handle empty dataEmissao with idDocumento>0', () => {
    const raw = {
      nomeParlamentar: 'Rui Falcão',
      idDeputado: 73604,
      siglaUF: 'SP',
      siglaPartido: 'PT',
      numeroSubCota: 40,
      descricao: 'COMPLEMENTAÇÃO DO AUXÍLIO-MORADIA',
      fornecedor: 'COMPLEMENTAÇÃO DO AUXÍLIO-MORADIA',
      cnpjCPF: '005.303.520/0015-9 ',
      numero: '',
      tipoDocumento: '1',
      dataEmissao: '',
      valorDocumento: '1247',
      valorLiquido: '-1247',
      mes: 1,
      ano: 2025,
      idDocumento: 4243,
      urlDocumento: '',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.data).toBeUndefined();
    expect(result!.mes).toBe(1);
    expect(result!.valor).toBe('-1247');
  });

  it('should fall back to raw.mes when dataEmissao is invalid', () => {
    const raw = {
      nomeParlamentar: 'Teste',
      idDeputado: 99999,
      siglaUF: 'SP',
      siglaPartido: 'PT',
      numeroSubCota: 1,
      descricao: 'TESTE',
      fornecedor: 'FORNECEDOR',
      cnpjCPF: '123.456.789/0001-00',
      numero: '123',
      tipoDocumento: '0',
      dataEmissao: 'invalid-date',
      valorDocumento: '100',
      valorGlosa: '0',
      valorLiquido: '100',
      mes: 6,
      ano: 2025,
      idDocumento: 999999,
      urlDocumento: '',
    };

    const result = transformRecord(raw, mockDiretorio);

    expect(result).not.toBeNull();
    expect(result!.mes).toBe(6);
  });
});

describe('Streaming pipeline - chunk emission mock', () => {
  jest.setTimeout(15000);
  it('should emit individual objects through streamArray', async () => {
    const testData = [
      { id: 1, nome: 'Teste 1' },
      { id: 2, nome: 'Teste 2' },
      { id: 3, nome: 'Teste 3' },
    ];

    const jsonString = JSON.stringify(testData);
    const emitted: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        Readable.from(jsonString),
        streamArray.withParser(),
      ]);

      pipeline.on('data', (chunk) => {
        emitted.push(chunk.value);
      });
      pipeline.on('end', resolve);
      pipeline.on('error', reject);
    });

    expect(emitted).toHaveLength(3);
    expect(emitted[0]).toEqual({ id: 1, nome: 'Teste 1' });
    expect(emitted[1]).toEqual({ id: 2, nome: 'Teste 2' });
    expect(emitted[2]).toEqual({ id: 3, nome: 'Teste 3' });
  });

  it('should process batches of 1000 records', async () => {
    const records = Array.from({ length: 2500 }, (_, i) => ({ id: i, value: `item-${i}` }));
    const jsonString = JSON.stringify(records);
    const batches: unknown[][] = [];
    let currentBatch: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        Readable.from(jsonString),
        streamArray.withParser(),
        (chunk: { key: number; value: unknown }) => {
          currentBatch.push(chunk.value);
          if (currentBatch.length >= 1000) {
            batches.push([...currentBatch]);
            currentBatch = [];
          }
        },
      ]);

      pipeline.on('end', () => {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
        }
        resolve();
      });
      pipeline.on('error', reject);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
        }
        resolve();
      }, 5000);
    });

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(1000);
    expect(batches[1]).toHaveLength(1000);
    expect(batches[2]).toHaveLength(500);
  });
});