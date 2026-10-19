/**
 * Fixtures são amostras reais de `localidadeDoGasto` da API de emendas do
 * Portal da Transparência (varredura de 2025, 120 registros).
 */

import {
  parseLocalidadeGasto,
  urlEmenda,
  totalizarEmendas,
  agruparPorFuncao,
  agruparPorLocalidade,
  valoresDaEmenda,
  type EmendaAgregavel,
} from '@/lib/emendas';

describe('parseLocalidadeGasto', () => {
  it('reconhece Nacional, Múltiplo e Exterior', () => {
    expect(parseLocalidadeGasto('Nacional')).toEqual({ tipo: 'NACIONAL', uf: null, municipio: null });
    expect(parseLocalidadeGasto('Múltiplo')).toEqual({ tipo: 'MULTIPLO', uf: null, municipio: null });
    expect(parseLocalidadeGasto('Exterior')).toEqual({ tipo: 'EXTERIOR', uf: null, municipio: null });
  });

  it('lê município - UF', () => {
    expect(parseLocalidadeGasto('POÁ - SP')).toEqual({ tipo: 'MUNICIPIO', uf: 'SP', municipio: 'POÁ' });
    expect(parseLocalidadeGasto('CRUZ DAS ALMAS - BA')).toEqual({
      tipo: 'MUNICIPIO',
      uf: 'BA',
      municipio: 'CRUZ DAS ALMAS',
    });
    expect(parseLocalidadeGasto('BOM PROGRESSO - RS')).toEqual({
      tipo: 'MUNICIPIO',
      uf: 'RS',
      municipio: 'BOM PROGRESSO',
    });
  });

  it('lê NOME DO ESTADO (UF) e resolve a sigla', () => {
    expect(parseLocalidadeGasto('MINAS GERAIS (UF)')).toEqual({ tipo: 'ESTADO', uf: 'MG', municipio: null });
    expect(parseLocalidadeGasto('SÃO PAULO (UF)')).toEqual({ tipo: 'ESTADO', uf: 'SP', municipio: null });
    expect(parseLocalidadeGasto('RIO GRANDE DO NORTE (UF)')).toEqual({
      tipo: 'ESTADO',
      uf: 'RN',
      municipio: null,
    });
  });

  it('não inventa UF inválida', () => {
    expect(parseLocalidadeGasto('POÁ - XX')).toEqual({ tipo: 'MUNICIPIO', uf: null, municipio: 'POÁ' });
    expect(parseLocalidadeGasto('TERRA DO NUNCA (UF)')).toEqual({
      tipo: 'DESCONHECIDO',
      uf: null,
      municipio: null,
    });
  });

  it('trata vazio e nulo como desconhecido', () => {
    expect(parseLocalidadeGasto(null)).toEqual({ tipo: 'DESCONHECIDO', uf: null, municipio: null });
    expect(parseLocalidadeGasto('   ')).toEqual({ tipo: 'DESCONHECIDO', uf: null, municipio: null });
    expect(parseLocalidadeGasto(undefined).tipo).toBe('DESCONHECIDO');
  });
});

const base: EmendaAgregavel[] = [
  { ano: 2025, funcao: 'Saúde', uf: 'SP', municipio: 'POÁ', localidadeTipo: 'MUNICIPIO', valorPago: 100, valorEmpenhado: 150, valorLiquidado: 100, valorRestoPago: 0 },
  { ano: 2025, funcao: 'Saúde', uf: 'SP', municipio: 'BAURU', localidadeTipo: 'MUNICIPIO', valorPago: 50.5, valorEmpenhado: 50.5, valorLiquidado: 0, valorRestoPago: 0 },
  { ano: 2025, funcao: 'Educação', uf: 'MG', municipio: null, localidadeTipo: 'ESTADO', valorPago: 25, valorEmpenhado: 25, valorLiquidado: 0, valorRestoPago: 0 },
  { ano: 2025, funcao: null, uf: null, municipio: null, localidadeTipo: 'NACIONAL', valorPago: 10, valorEmpenhado: 10, valorLiquidado: 0, valorRestoPago: 0 },
];

describe('totalizarEmendas', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(totalizarEmendas(base)).toEqual({
      quantidade: 4,
      pago: 185.5,
      empenhado: 235.5,
      liquidado: 100,
      restoPago: 0,
    });
  });

  it('lista vazia zera tudo', () => {
    expect(totalizarEmendas([]).quantidade).toBe(0);
    expect(totalizarEmendas([]).pago).toBe(0);
  });
});

describe('agruparPorFuncao', () => {
  it('ordena por pago desc e ignora função ausente', () => {
    const grupos = agruparPorFuncao(base);
    expect(grupos[0]).toEqual({ chave: 'Saúde', quantidade: 2, pago: 150.5, empenhado: 200.5 });
    expect(grupos[1].chave).toBe('Educação');
    expect(grupos).toHaveLength(2);
  });
});

describe('agruparPorLocalidade', () => {
  it('agrupa por UF e usa o tipo quando não há UF', () => {
    const grupos = agruparPorLocalidade(base);
    expect(grupos[0]).toEqual({ chave: 'SP', quantidade: 2, pago: 150.5, empenhado: 200.5 });
    expect(grupos.map((g) => g.chave)).toEqual(['SP', 'MG', 'NACIONAL']);
  });
});

describe('urlEmenda', () => {
  it('aponta para a página pública da emenda no Portal', () => {
    expect(urlEmenda('202542900005')).toBe(
      'https://portaldatransparencia.gov.br/emendas?codigoEmenda=202542900005'
    );
  });
});

describe('valoresDaEmenda', () => {
  it('converte strings pt-BR e Decimals', () => {
    expect(
      valoresDaEmenda({ valorPago: '1.234,56', valorEmpenhado: '8.000,00', valorLiquidado: '0,00' })
    ).toEqual({ valorPago: 1234.56, valorEmpenhado: 8000, valorLiquidado: 0, valorRestoPago: 0 });
  });

  it('aceita negativo com espaço, como a fonte publica', () => {
    expect(valoresDaEmenda({ valorPago: '- 37.729,24' }).valorPago).toBe(-37729.24);
  });

  it('aceita Decimal do Prisma (objeto com toString)', () => {
    const decimal = { toString: () => '1234.56' };
    expect(valoresDaEmenda({ valorPago: decimal }).valorPago).toBe(1234.56);
  });

  it('trata nulo/vazio como zero', () => {
    expect(valoresDaEmenda({ valorPago: null, valorEmpenhado: '' })).toEqual({
      valorPago: 0,
      valorEmpenhado: 0,
      valorLiquidado: 0,
      valorRestoPago: 0,
    });
  });
});
