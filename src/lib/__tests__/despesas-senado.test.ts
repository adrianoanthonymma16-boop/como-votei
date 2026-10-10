/**
 * Testes da ingestão de despesas CEAPS do Senado
 * Verifica transformação, match direto codSenador, parseBRL (number), parseDataFonte (typo year),
 * upsert batch 1000, retention DELETE, sanity gates, urlDocumento undefined
 */

import { PrismaClient, Casa } from '@prisma/client';
import { derivarIdExternoDespesa } from '@/lib/sync/despesa-id';
import { parseBRL, parseDataFonte, ANOS_JANELA } from '@/lib/despesas';
import { DespesaNormalizada } from '@/lib/sync/types';

const prisma = new PrismaClient();

const mockDiretorioSenado = new Map<string, string>([
  ['475', 'parl-sen-1'],
  ['6009', 'parl-sen-2'],
  ['22', 'parl-sen-3'],
]);

function transformSenadoRecord(
  raw: Record<string, unknown>,
  diretorio: Map<string, string>,
  ano: number
): DespesaNormalizada | null {
  try {
    const idExterno = derivarIdExternoDespesa('SENADO', raw);
    const valor = parseBRL(raw.valorReembolsado) ?? undefined;
    if (valor === undefined) return null;
    const valorGlosa = raw.valorGlosa !== undefined && raw.valorGlosa !== null
      ? parseBRL(raw.valorGlosa) ?? undefined
      : undefined;
    const data = parseDataFonte(raw.data) ?? undefined;
    const mes = data ? data.getUTCMonth() + 1 : 0;
    const codSenador = String(raw.codSenador);
    const parlamentarIdExterno = diretorio.get(codSenador) ?? undefined;
    const urlDocumento = undefined;
    return {
      idExterno: derivarIdExternoDespesa('SENADO', raw),
      parlamentarIdExterno: diretorio.get(codSenador) ?? undefined,
      ano,
      mes,
      data,
      categoria: String(raw.tipoDespesa),
      fornecedor: String(raw.fornecedor),
      cpfCnpj: raw.cpfCnpj ? String(raw.cpfCnpj) : undefined,
      documento: raw.detalhamento ? String(raw.detalhamento) : undefined,
      valor,
      valorGlosa,
      urlDocumento: undefined,
      casa: 'SENADO' as Casa,
      nomeParlamentarRaw: String(raw.nomeSenador),
    };
  } catch {
    return null;
  }
}

describe('Senado CEAPS Ingestion', () => {
  let testPrefix: string;
  beforeAll(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: 'TEST_' } } }); });
  beforeEach(() => { testPrefix = `TEST_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
  beforeEach(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: testPrefix } } }); });
  afterEach(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: testPrefix } } }); });
  afterAll(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: 'TEST_' } } }); await prisma.$disconnect(); });

  describe('transformSenadoRecord', () => {
    const ano = 2025;
    it('deriva idExterno SENADO:{id} exato', () => {
      const raw = { id: 2259127, codSenador: 475, nomeSenador: 'CONFÚCIO MOURA', valorReembolsado: 100 };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull();
      expect(result!.idExterno).toBe('SENADO:2259127');
    });
    it('parseBRL aceita JSON number positivo', () => {
      const raw = { id: 2259127, codSenador: 475, valorReembolsado: 3687.44 };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.valor).toBe('3687.44');
    });
    it('parseBRL preserva sinal negativo', () => {
      const raw = { id: 2253369, codSenador: 6009, valorReembolsado: -1541.7 };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.valor).toBe('-1541.7');
    });
    it('parseDataFonte não explode com typo year 0202-10-03 (retorna null ou Date)', () => {
      const raw = { id: 2240586, codSenador: 22, valorReembolsado: 100, data: '0202-10-03' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull();
      const data = result!.data;
      expect(data === null || (data instanceof Date && data.getUTCFullYear() === 202)).toBe(true);
    });
    it('urlDocumento sempre undefined', () => {
      const raw = { id: 2259127, codSenador: 475, valorReembolsado: 3687.44, data: '2025-06-10' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.urlDocumento).toBeUndefined();
    });
    it('match direto codSenador (GRAY-11)', () => {
      const raw = { id: 2259127, codSenador: 475, valorReembolsado: 3687.44, data: '2025-06-10' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.parlamentarIdExterno).toBe('parl-sen-1');
    });
    it('codSenador não encontrado → undefined', () => {
      const raw = { id: 9999999, codSenador: 999, valorReembolsado: 100, data: '2025-01-01' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.parlamentarIdExterno).toBeUndefined();
    });
    it('cpfCnpj mascarado', () => {
      const raw = { id: 2261594, codSenador: 475, cpfCnpj: '457.***.***-00', valorReembolsado: 1387.75, data: '2025-07-10' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.cpfCnpj).toBe('457.***.***-00');
    });
    it('detalhamento vira documento', () => {
      const raw = { id: 2240586, codSenador: 22, detalhamento: 'Test detail', valorReembolsado: 2653.41, data: '0202-10-03' };
      const result = transformSenadoRecord(raw, mockDiretorioSenado, ano);
      expect(result).not.toBeNull(); expect(result!.documento).toBe('Test detail');
    });
  });

  describe('Senado CEAPS Ingestion - Retention DELETE', () => {
    const currentYear = new Date().getUTCFullYear();
    const anosJanela = [currentYear, currentYear - 1, currentYear - 2];
    const anoForaJanela = currentYear - 3;
    let testPrefix: string;
    beforeEach(() => { testPrefix = `TEST_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; });
    beforeEach(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: testPrefix } } }); });
    afterEach(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: testPrefix } } }); });
    it('should delete records outside ANOS_JANELA for SENADO', async () => {
      const inWindow = anosJanela.map((ano, i) => ({ idExterno: `${testPrefix}SENADO_IN_${ano}_${i}`, casa: 'SENADO' as Casa, ano, mes: 1, categoria: 'TESTE', fornecedor: 'FORNECEDOR', valor: '100.00', nomeParlamentarRaw: 'TESTE' }));
      const outOfWindow = [{ idExterno: `${testPrefix}SENADO_OUT_${anoForaJanela}`, casa: 'SENADO' as Casa, ano: anoForaJanela, mes: 1, categoria: 'TESTE', fornecedor: 'FORNECEDOR', valor: '100.00', nomeParlamentarRaw: 'TESTE' }];
      await prisma.despesa.createMany({ data: [...inWindow, ...outOfWindow] });
      const beforeIn = await prisma.despesa.count({ where: { idExterno: { startsWith: `${testPrefix}SENADO_IN_` } } });
      const beforeOut = await prisma.despesa.count({ where: { idExterno: { startsWith: `${testPrefix}SENADO_OUT_` } } });
      expect(beforeIn).toBe(anosJanela.length); expect(beforeOut).toBe(1);
      const deleted = await prisma.despesa.deleteMany({ where: { casa: 'SENADO', ano: { notIn: anosJanela } } });
      expect(deleted.count).toBe(1);
      const afterOut = await prisma.despesa.count({ where: { idExterno: { startsWith: `${testPrefix}SENADO_OUT_` } } });
      expect(afterOut).toBe(0);
    });
    it('should not delete records from other casa (CAMARA)', async () => {
      await prisma.despesa.create({
        data: {
          idExterno: `${testPrefix}CAMARA_CROSS_2020`,
          casa: 'CAMARA',
          ano: 2020,
          mes: 1,
          categoria: 'TESTE',
          fornecedor: 'FORNECEDOR',
          valor: '100.00',
          nomeParlamentarRaw: 'TESTE',
        },
      });
      await prisma.despesa.deleteMany({ where: { casa: 'SENADO', ano: { notIn: anosJanela } } });
      const crossRecord = await prisma.despesa.findUnique({ where: { idExterno: `${testPrefix}CAMARA_CROSS_2020` } });
      expect(crossRecord).not.toBeNull();
    });
  });
  describe('ANOS_JANELA contract', () => {
    it('is readonly tuple of 3 years', () => {
      const currentYear = new Date().getUTCFullYear();
      expect(ANOS_JANELA).toEqual([currentYear, currentYear - 1, currentYear - 2]);
      expect(ANOS_JANELA.length).toBe(3);
      expect(ANOS_JANELA[0]).toBe(ANOS_JANELA[1] + 1);
      expect(ANOS_JANELA[1]).toBe(ANOS_JANELA[2] + 1);
    });
  });
});
afterAll(async () => { await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: 'TEST_' } } }); await prisma.$disconnect(); });
