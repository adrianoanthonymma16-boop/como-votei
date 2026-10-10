/**
 * Testes da retenção DELETE (GRAY-02)
 * Verifica WHERE casa + ano NOT IN (ANOS_JANELA)
 */

import { PrismaClient, Casa } from '@prisma/client';
import { ANOS_JANELA } from '@/lib/despesas';

const prisma = new PrismaClient();

describe('Retention DELETE', () => {
  const currentYear = new Date().getUTCFullYear();
  const anosJanela = [currentYear, currentYear - 1, currentYear - 2];
  const anoForaJanela = currentYear - 3;

  let testPrefix: string;

  beforeAll(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: 'RETENTION_TEST_' } },
    });
  });

  beforeEach(() => {
    testPrefix = `RETENTION_TEST_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  });

  beforeEach(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: testPrefix } },
    });
  });

  afterEach(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: testPrefix } },
    });
  });

  afterAll(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: 'RETENTION_TEST_' } },
    });
    await prisma.$disconnect();
  });

  it('should delete records outside ANOS_JANELA for CAMARA', async () => {
    const inWindow = anosJanela.map((ano, i) => ({
      idExterno: `${testPrefix}CAMARA_IN_${ano}_${i}`,
      casa: 'CAMARA' as Casa,
      ano,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }));

    const outOfWindow = [{
      idExterno: `${testPrefix}CAMARA_OUT_${anoForaJanela}`,
      casa: 'CAMARA' as Casa,
      ano: anoForaJanela,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }];

    await prisma.despesa.createMany({ data: [...inWindow, ...outOfWindow] });

    const beforeIn = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}CAMARA_IN_` } },
    });
    const beforeOut = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}CAMARA_OUT_` } },
    });

    expect(beforeIn).toBe(anosJanela.length);
    expect(beforeOut).toBe(1);

    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "despesas" WHERE "casa" = $1::"Casa" AND "ano" NOT IN ($2, $3, $4)`,
      'CAMARA',
      anosJanela[0],
      anosJanela[1],
      anosJanela[2]
    );

    expect(Number(deleted)).toBe(1);

    const afterOut = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}CAMARA_OUT_` } },
    });

    expect(afterOut).toBe(0);
  });

  it('should delete records outside ANOS_JANELA for SENADO', async () => {
    const inWindow = anosJanela.map((ano, i) => ({
      idExterno: `${testPrefix}SENADO_IN_${ano}_${i}`,
      casa: 'SENADO' as Casa,
      ano,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }));

    const outOfWindow = [{
      idExterno: `${testPrefix}SENADO_OUT_${anoForaJanela}`,
      casa: 'SENADO' as Casa,
      ano: anoForaJanela,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }];

    await prisma.despesa.createMany({ data: [...inWindow, ...outOfWindow] });

    const beforeIn = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}SENADO_IN_` } },
    });
    const beforeOut = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}SENADO_OUT_` } },
    });

    expect(beforeIn).toBe(anosJanela.length);
    expect(beforeOut).toBe(1);

    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "despesas" WHERE "casa" = $1::"Casa" AND "ano" NOT IN ($2, $3, $4)`,
      'SENADO',
      anosJanela[0],
      anosJanela[1],
      anosJanela[2]
    );

    expect(Number(deleted)).toBe(1);

    const afterOut = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${testPrefix}SENADO_OUT_` } },
    });

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

    await prisma.$executeRawUnsafe(
      `DELETE FROM "despesas" WHERE "casa" = $1::"Casa" AND "ano" NOT IN ($2, $3, $4)`,
      'SENADO',
      anosJanela[0],
      anosJanela[1],
      anosJanela[2]
    );

    const crossRecord = await prisma.despesa.findUnique({
      where: { idExterno: `${testPrefix}CAMARA_CROSS_2020` },
    });

    expect(crossRecord).not.toBeNull();
  });

  it('should use ANOS_JANELA as single source of truth', () => {
    const expected = [currentYear, currentYear - 1, currentYear - 2];
    expect(ANOS_JANELA).toEqual(expected);
    expect(ANOS_JANELA).toHaveLength(3);
  });

  it('should handle empty result (nothing to delete)', async () => {
    // Clean up any existing test records first
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: `${testPrefix}EMPTY_` } },
    });

    // Create only records inside the window
    const inWindow = anosJanela.map((ano, i) => ({
      idExterno: `${testPrefix}EMPTY_IN_${ano}_${i}`,
      casa: 'CAMARA' as Casa,
      ano,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }));

    await prisma.despesa.createMany({ data: inWindow });

    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "despesas" WHERE "casa" = $1::"Casa" AND "ano" NOT IN ($2, $3, $4)`,
      'CAMARA',
      anosJanela[0],
      anosJanela[1],
      anosJanela[2]
    );

    expect(Number(deleted)).toBe(0);
  });
});

afterAll(async () => {
  await prisma.despesa.deleteMany({
    where: { idExterno: { startsWith: 'RETENTION_TEST_' } },
  });
  await prisma.$disconnect();
});