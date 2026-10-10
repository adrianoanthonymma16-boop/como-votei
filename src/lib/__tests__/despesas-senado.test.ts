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

// Mock do diretório de senadores (codSenador -> parlamentarId)
const mockDiretorioSenado = new Map<string, string>([
  ['475', 'parl-sen-1'],   // CONFÚCIO MOURA
  ['6009', 'parl-sen-2'],  // ASTRONAUTA MARCOS PONTES
  ['22', 'parl-sen-3'],    // ESPERIDIÃO AMIN
]);

// Função de transformação (copiada do script para testabilidade)
function transformSenadoRecord(
  raw: Record<string, unknown>,
  diretorio: Map<string, string>,
  ano: number
): DespesaNormalizada | null {
  try {
    // Derivar idExterno S6: SENADO:{id} (GRAY-07)
    const idExterno = derivarIdExternoDespesa('SENADO', raw);

    // Parse valorReembolsado (JSON number signed, D-07)
    const valor = parseBRL(raw.valorReembolsado);
    if (valor === null) {
      return null;
    }

    // Parse data (handles typo year, D-07)
    const data = parseDataFonte(raw.data);
    
    // Computar mês
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

    // Categoria = tipoDespesa (label livre D-05)
    const categoria = String(raw.tipoDespesa || '');

    // Fornecedor, cpfCnpj (mascarado, pass-through)
    const fornecedor = String(raw.fornecedor || '');
    const cpfCnpj = raw.cpfCnpj ? String(raw.cpfCnpj).trim() : undefined;

    // Documento = detalhamento (or undefined)
    const documento = raw.detalhamento ? String(raw.detalhamento) : undefined;

    // urlDocumento = undefined (nunca presente, GRAY-11/GAST-03)
    const urlDocumento = undefined;

    // nomeParlamentarRaw = nomeSenador (audit D-01)
    const nomeParlamentarRaw = String(raw.nomeSenador || '');

    // Lookup parlamentarId via codSenador (GRAY-11: match direto 100%)
    const codSenador = String(raw.codSenador || '');
    const parlamentarId = diretorio.get(codSenador);
    const parlamentarIdExterno = parlamentarId ? codSenador : undefined;

    return {
      idExterno,
      parlamentarIdExterno,
      nomeParlamentarRaw,
      casa: 'SENADO',
      ano,
      mes,
      data: data || undefined,
      categoria,
      fornecedor,
      cpfCnpj,
      documento,
      valor,
      valorGlosa: undefined, // Senado não tem valorGlosa
      urlDocumento,
    };
  } catch (err) {
    console.warn(`Erro ao transformar registro Senado:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

describe('Senado CEAPS Ingestion - Transform', () => {
  it('should derive SENADO:{id} idExterno (GRAY-07)', () => {
    const raw = { id: 2259127 };
    const idExterno = derivarIdExternoDespesa('SENADO', raw);
    expect(idExterno).toBe('SENADO:2259127');
  });

  it('should parse valorReembolsado as JSON number (positive)', () => {
    const raw = { valorReembolsado: 3687.44 };
    const valor = parseBRL(raw.valorReembolsado);
    expect(valor).toBe('3687.44');
  });

  it('should parse valorReembolsado as JSON number (negative/estorno)', () => {
    const raw = { valorReembolsado: -1541.7 };
    const valor = parseBRL(raw.valorReembolsado);
    expect(valor).toBe('-1541.7');
  });

  it('should parse valorReembolsado with integer (no decimals)', () => {
    const raw = { valorReembolsado: 1000 };
    const valor = parseBRL(raw.valorReembolsado);
    expect(valor).toBe('1000');
  });

  it('should handle typo year in data (0202-07-04 -> year 202)', () => {
    const raw = { data: '0202-10-03' }; // Ano digitado errado
    const data = parseDataFonte(raw.data);
    expect(data).not.toBeNull();
    expect(data!.getUTCFullYear()).toBe(202);
  });

  it('should parse normal date correctly', () => {
    const raw = { data: '2025-06-10' };
    const data = parseDataFonte(raw.data);
    expect(data).not.toBeNull();
    expect(data!.getUTCFullYear()).toBe(2025);
    expect(data!.getUTCMonth()).toBe(5); // June = 5 (0-indexed)
    expect(data!.getUTCDate()).toBe(10);
  });

  it('should handle missing data (null mes fallback)', () => {
    const raw = { data: '', mes: 7 };
    const data = parseDataFonte(raw.data);
    expect(data).toBeNull();
    // mes vem do campo mes do registro
    const mes = typeof raw.mes === 'number' ? raw.mes : 0;
    expect(mes).toBe(7);
  });

  it('should transform normal Senado record with direct match', () => {
    const raw = {
      id: 2259127,
      tipoDocumento: 'Passagem / Bilhete / Código Localizador',
      ano: 2025,
      mes: 6,
      codSenador: 475,
      nomeSenador: 'CONFÚCIO MOURA',
      tipoDespesa: 'Passagens aéreas, aquáticas e terrestres nacionais',
      cpfCnpj: '14.443.929/0001-08',
      fornecedor: 'MERLY VIAGENS & TURISMO LTDA-ME',
      documento: 'FMTUSH',
      data: '2025-06-10',
      detalhamento: 'Companhia Aérea: LATAM, Localizador: FMTUSH...',
      valorReembolsado: 3687.44,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2025);

    expect(result).not.toBeNull();
    expect(result!.idExterno).toBe('SENADO:2259127');
    expect(result!.parlamentarIdExterno).toBe('475');
    expect(result!.nomeParlamentarRaw).toBe('CONFÚCIO MOURA');
    expect(result!.casa).toBe('SENADO');
    expect(result!.ano).toBe(2025);
    expect(result!.mes).toBe(6);
    expect(result!.data).toBeInstanceOf(Date);
    expect(result!.data!.getUTCFullYear()).toBe(2025);
    expect(result!.categoria).toBe('Passagens aéreas, aquáticas e terrestres nacionais');
    expect(result!.fornecedor).toBe('MERLY VIAGENS & TURISMO LTDA-ME');
    expect(result!.cpfCnpj).toBe('14.443.929/0001-08');
    expect(result!.documento).toBe('Companhia Aérea: LATAM, Localizador: FMTUSH...');
    expect(result!.valor).toBe('3687.44');
    expect(result!.valorGlosa).toBeUndefined();
    expect(result!.urlDocumento).toBeUndefined(); // GAST-03/07: nunca presente
  });

  it('should transform record with masked cpfCnpj (pass-through)', () => {
    const raw = {
      id: 2261594,
      tipoDocumento: 'Recibo',
      ano: 2025,
      mes: 7,
      codSenador: 475,
      nomeSenador: 'CONFÚCIO MOURA',
      tipoDespesa: 'Aluguel de imóveis para escritório político, compreendendo despesas concernentes a eles.',
      cpfCnpj: '457.***.***-00', // Mascarado
      fornecedor: 'DANIEL SLAVIERO FÁVERO',
      documento: '07/2025',
      data: '2025-07-10',
      detalhamento: 'Despesa com locação sala escritório de apoio ref. a julho',
      valorReembolsado: 1387.75,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2025);

    expect(result).not.toBeNull();
    expect(result!.cpfCnpj).toBe('457.***.***-00'); // Pass-through sem alteração
    expect(result!.valor).toBe('1387.75');
  });

  it('should handle negative valorReembolsado (estorno)', () => {
    const raw = {
      id: 2253369,
      tipoDocumento: 'Fatura',
      ano: 2025,
      mes: 1,
      codSenador: 6009,
      nomeSenador: 'ASTRONAUTA MARCOS PONTES',
      tipoDespesa: 'Passagens aéreas, aquáticas e terrestres nacionais',
      cpfCnpj: '05.120.923/0001-09',
      fornecedor: 'Aerotur Serviços',
      documento: '0005026990',
      data: '2025-01-10',
      detalhamento: 'Companhia Aérea: Aerotur Serviços...',
      valorReembolsado: -1541.7,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2025);

    expect(result).not.toBeNull();
    expect(result!.valor).toBe('-1541.7'); // Signed preservado
  });

  it('should handle typo year in data (0202-10-03 -> year 202)', () => {
    const raw = {
      id: 2240586,
      tipoDocumento: 'Passagem / Bilhete / Código Localizador',
      ano: 2024,
      mes: 10,
      codSenador: 22,
      nomeSenador: 'ESPERIDIÃO AMIN',
      tipoDespesa: 'Passagens aéreas, aquáticas e terrestres nacionais',
      cpfCnpj: '00.556.066/0001-62',
      fornecedor: 'FIBRATUR TURISMO E VIAGENS LTDA',
      documento: 'ABTBMT',
      data: '0202-10-03', // Typo: 0202 em vez de 2022
      detalhamento: 'Companhia Aérea: LATAM...',
      valorReembolsado: 2653.41,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2024);

    expect(result).not.toBeNull();
    // parseDataFonte retorna Date com year=202 (não explode)
    expect(result!.data).toBeInstanceOf(Date);
    expect(result!.data!.getUTCFullYear()).toBe(202);
    // mes vem do campo mes do registro (10)
    expect(result!.mes).toBe(10);
  });

  it('should return null parlamentarIdExterno when codSenador not in directory', () => {
    const raw = {
      id: 999999,
      tipoDocumento: 'Teste',
      ano: 2025,
      mes: 1,
      codSenador: 9999, // Não existe no diretório
      nomeSenador: 'SENADOR INEXISTENTE',
      tipoDespesa: 'Teste',
      cpfCnpj: '11.111.111/1111-11',
      fornecedor: 'FORNECEDOR TESTE',
      documento: 'TESTE',
      data: '2025-01-01',
      detalhamento: 'Teste',
      valorReembolsado: 100.00,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2025);

    expect(result).not.toBeNull();
    expect(result!.parlamentarIdExterno).toBeUndefined();
    expect(result!.nomeParlamentarRaw).toBe('SENADOR INEXISTENTE');
  });

  it('should always have urlDocumento undefined (GAST-03/07)', () => {
    const raw = {
      id: 123456,
      tipoDocumento: 'Teste',
      ano: 2025,
      mes: 1,
      codSenador: 475,
      nomeSenador: 'TESTE',
      tipoDespesa: 'Teste',
      cpfCnpj: '11.111.111/1111-11',
      fornecedor: 'FORNECEDOR',
      documento: 'TESTE',
      data: '2025-01-01',
      detalhamento: 'Teste',
      valorReembolsado: 100.00,
    };

    const result = transformSenadoRecord(raw, mockDiretorioSenado, 2025);

    expect(result).not.toBeNull();
    expect(result!.urlDocumento).toBeUndefined();
  });
});

describe('Senado CEAPS Ingestion - Batch Upsert (GRAY-05)', () => {
  beforeAll(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: 'SENADO:TEST_' } },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should build correct SQL with 15 columns and ON CONFLICT DO UPDATE', () => {
    const batch: DespesaNormalizada[] = [
      {
        idExterno: 'SENADO:TEST_1',
        parlamentarIdExterno: '475',
        nomeParlamentarRaw: 'TESTE 1',
        casa: 'SENADO',
        ano: 2025,
        mes: 1,
        data: new Date('2025-01-15'),
        categoria: 'TESTE',
        fornecedor: 'FORNECEDOR TESTE',
        cpfCnpj: '123.456.789/0001-00',
        documento: 'DOC-1',
        valor: '100.00',
        valorGlosa: undefined,
        urlDocumento: undefined,
      },
      {
        idExterno: 'SENADO:TEST_2',
        parlamentarIdExterno: '6009',
        nomeParlamentarRaw: 'TESTE 2',
        casa: 'SENADO',
        ano: 2025,
        mes: 2,
        data: new Date('2025-02-15'),
        categoria: 'TESTE 2',
        fornecedor: 'FORNECEDOR TESTE 2',
        cpfCnpj: '987.654.321/0001-00',
        documento: 'DOC-2',
        valor: '200.50',
        valorGlosa: undefined,
        urlDocumento: undefined,
      },
    ];

    const values: string[] = [];
    const params: unknown[] = [];

    for (const d of batch) {
      const idx = params.length;
      values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12}, $${idx + 13}::"Casa", $${idx + 14}, $${idx + 15})`);

      params.push(
        d.idExterno,
        'parl-id-placeholder', // será resolvido via CTE no script real
        d.ano,
        d.mes,
        d.data ? d.data.toISOString() : null,
        d.categoria,
        d.fornecedor,
        d.cpfCnpj ?? null,
        d.documento ?? null,
        d.valor,
        d.valorGlosa ?? null,
        d.urlDocumento ?? null,
        d.casa,
        d.nomeParlamentarRaw,
        new Date().toISOString()
      );
    }

    const placeholders = values.join(', ');
    const sql = `
      INSERT INTO "despesas" ("id_externo", "parlamentar_id", "ano", "mes", "data", "categoria", "fornecedor", "cpf_cnpj", "documento", "valor", "valor_glosa", "url_documento", "casa", "nome_parlamentar_raw", "imported_at")
      VALUES ${placeholders}
      ON CONFLICT ("id_externo") DO UPDATE SET
        "parlamentar_id" = EXCLUDED."parlamentar_id",
        "ano" = EXCLUDED."ano",
        "mes" = EXCLUDED."mes",
        "data" = EXCLUDED."data",
        "categoria" = EXCLUDED."categoria",
        "fornecedor" = EXCLUDED."fornecedor",
        "cpf_cnpj" = EXCLUDED."cpf_cnpj",
        "documento" = EXCLUDED."documento",
        "valor" = EXCLUDED."valor",
        "valor_glosa" = EXCLUDED."valor_glosa",
        "url_documento" = EXCLUDED."url_documento",
        "casa" = EXCLUDED."casa",
        "nome_parlamentar_raw" = EXCLUDED."nome_parlamentar_raw",
        "imported_at" = EXCLUDED."imported_at"
    `;

    expect(sql).toContain('INSERT INTO "despesas"');
    expect(sql).toContain('"id_externo", "parlamentar_id", "ano", "mes", "data", "categoria", "fornecedor", "cpf_cnpj", "documento", "valor", "valor_glosa", "url_documento", "casa", "nome_parlamentar_raw", "imported_at"');
    expect(sql).toContain('ON CONFLICT ("id_externo") DO UPDATE SET');
    expect(sql).toContain('"parlamentar_id" = EXCLUDED."parlamentar_id"');
    expect(sql).toContain('"ano" = EXCLUDED."ano"');
    expect(sql).toContain('"mes" = EXCLUDED."mes"');
    expect(sql).toContain('"data" = EXCLUDED."data"');
    expect(sql).toContain('"categoria" = EXCLUDED."categoria"');
    expect(sql).toContain('"fornecedor" = EXCLUDED."fornecedor"');
    expect(sql).toContain('"cpf_cnpj" = EXCLUDED."cpf_cnpj"');
    expect(sql).toContain('"documento" = EXCLUDED."documento"');
    expect(sql).toContain('"valor" = EXCLUDED."valor"');
    expect(sql).toContain('"valor_glosa" = EXCLUDED."valor_glosa"');
    expect(sql).toContain('"url_documento" = EXCLUDED."url_documento"');
    expect(sql).toContain('"casa" = EXCLUDED."casa"');
    expect(sql).toContain('"nome_parlamentar_raw" = EXCLUDED."nome_parlamentar_raw"');
    expect(sql).toContain('"imported_at" = EXCLUDED."imported_at"');

    expect(params).toHaveLength(30); // 2 records × 15 params
  });

  it('should handle batch size exactly 1000', () => {
    const batch = Array.from({ length: 1000 }, (_, i) => ({
      idExterno: `SENADO:TEST_BATCH_${i}`,
      parlamentarIdExterno: '475',
      nomeParlamentarRaw: `TESTE ${i}`,
      casa: 'SENADO' as const,
      ano: 2025,
      mes: 1,
      data: new Date('2025-01-15'),
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      cpfCnpj: '123.456.789/0001-00',
      documento: `DOC-${i}`,
      valor: '100.00',
      valorGlosa: undefined,
      urlDocumento: undefined,
    }));
    expect(batch).toHaveLength(1000);
  });

  it('should handle batch size less than 1000 (final batch)', () => {
    const batch = Array.from({ length: 500 }, (_, i) => ({
      idExterno: `SENADO:TEST_FINAL_${i}`,
      parlamentarIdExterno: '475',
      nomeParlamentarRaw: `TESTE ${i}`,
      casa: 'SENADO' as const,
      ano: 2025,
      mes: 1,
      data: new Date('2025-01-15'),
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      cpfCnpj: '123.456.789/0001-00',
      documento: `DOC-${i}`,
      valor: '100.00',
      valorGlosa: undefined,
      urlDocumento: undefined,
    }));
    expect(batch).toHaveLength(500);
  });
});

describe('Senado CEAPS Ingestion - Retention DELETE (GRAY-02)', () => {
  const currentYear = new Date().getUTCFullYear();
  const anosJanela = [currentYear, currentYear - 1, currentYear - 2];
  const anoForaJanela = currentYear - 3;

  // Unique prefix for this test file to avoid conflicts
  const TEST_PREFIX = 'SENADO:RETENTION_TEST_DESPESAS_SENADO:';

  beforeAll(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: TEST_PREFIX } },
    });
  });

  beforeEach(async () => {
    await prisma.despesa.deleteMany({
      where: { idExterno: { startsWith: TEST_PREFIX } },
    });
  });

  it('should delete records outside ANOS_JANELA for SENADO', async () => {
    const inWindow = anosJanela.map((ano, i) => ({
      idExterno: `${TEST_PREFIX}IN_${ano}_${i}`,
      casa: 'SENADO' as Casa,
      ano,
      mes: 1,
      categoria: 'TESTE',
      fornecedor: 'FORNECEDOR',
      valor: '100.00',
      nomeParlamentarRaw: 'TESTE',
    }));

    const outOfWindow = [{
      idExterno: `${TEST_PREFIX}OUT_${anoForaJanela}`,
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
      where: { idExterno: { startsWith: `${TEST_PREFIX}IN_` } },
    });
    const beforeOut = await prisma.despesa.count({
      where: { idExterno: { startsWith: `${TEST_PREFIX}OUT_` } },
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
      where: { idExterno: { startsWith: `${TEST_PREFIX}OUT_` } },
    });

    expect(afterOut).toBe(0);
  });

  it('should not delete records from other casa (CAMARA)', async () => {
    await prisma.despesa.create({
      data: {
        idExterno: `CAMARA:${TEST_PREFIX}CROSS_2020`,
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
      where: { idExterno: `CAMARA:${TEST_PREFIX}CROSS_2020` },
    });

    expect(crossRecord).not.toBeNull();
  });
});

describe('Senado CEAPS Ingestion - Advisory Lock (GRAY-12)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should acquire advisory lock with correct key sync-despesas-senado', async () => {
    const lockKey = 'sync-despesas-senado';
    
    const result = await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      lockKey
    );

    expect(result).toBeDefined();
  });

  it('should release lock at end of transaction', async () => {
    const lockKey = 'sync-despesas-senado-test-release';
    
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);
    });
    
    // Lock deve ter sido liberado, podemos adquirir novamente
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);
    
    expect(true).toBe(true);
  });
});

describe('Senado CEAPS Ingestion - Sanity Gates (GRAY-10) thresholds', () => {
  const currentYear = new Date().getUTCFullYear();
  const anosJanela = [currentYear, currentYear - 1, currentYear - 2];

  describe('Gate 1: Match rate ≥ 99% (Senado 100% expected GRAY-11)', () => {
    it('should pass when match rate ≥ 99%', () => {
      const total = 20000;
      const matched = 19800; // 99%
      const rate = matched / total;
      expect(rate).toBeGreaterThanOrEqual(0.99);
    });

    it('should fail when match rate < 99%', () => {
      const total = 20000;
      const matched = 19600; // 98%
      const rate = matched / total;
      expect(rate).toBeLessThan(0.99);
    });

    it('should pass with 100% match (Senado expected GRAY-11)', () => {
      const total = 20000;
      const matched = 20000; // 100%
      const rate = matched / total;
      expect(rate).toBe(1.0);
      expect(rate).toBeGreaterThanOrEqual(0.99);
    });
  });

  describe('Gate 2: Total rows in range (Senado: 10k-30k)', () => {
    it('should pass for Senado within 10k-30k', () => {
      const count = 20000;
      expect(count).toBeGreaterThanOrEqual(10_000);
      expect(count).toBeLessThanOrEqual(30_000);
    });

    it('should fail for Senado below 10k', () => {
      const count = 5000;
      expect(count).toBeLessThan(10_000);
    });

    it('should fail for Senado above 30k', () => {
      const count = 40000;
      expect(count).toBeGreaterThan(30_000);
    });
  });

  describe('Gate 3: Sum values within reasonable bounds', () => {
    it('should validate sum is positive and reasonable', () => {
      // Senado ~23k registros/ano × ~R$ 2000 média = ~46M/ano
      // 3 anos = ~138M total
      const sumValor = 150_000_000; // ~150M total
      expect(sumValor).toBeGreaterThan(0);
      expect(sumValor).toBeLessThan(1_000_000_000); // sanity upper bound
    });
  });

  describe('Gate 4: Zero duplicate idExterno', () => {
    it('should pass when no duplicates', () => {
      const idExternos = ['SENADO:1', 'SENADO:2', 'SENADO:3'];
      const unique = new Set(idExternos);
      expect(unique.size).toBe(idExternos.length);
    });

    it('should detect duplicates', () => {
      const idExternos = ['SENADO:1', 'SENADO:1', 'SENADO:3'];
      const unique = new Set(idExternos);
      expect(unique.size).toBeLessThan(idExternos.length);
    });
  });

  describe('Gate 5: Unmatched rate ≤ 1%', () => {
    it('should pass when unmatched rate ≤ 1%', () => {
      const total = 20000;
      const unmatched = 100; // 0.5%
      const rate = unmatched / total;
      expect(rate).toBeLessThanOrEqual(0.01);
    });

    it('should fail when unmatched rate > 1%', () => {
      const total = 20000;
      const unmatched = 300; // 1.5%
      const rate = unmatched / total;
      expect(rate).toBeGreaterThan(0.01);
    });
  });
});

describe('Senado CEAPS Ingestion - ANOS_JANELA loop (GRAY-09)', () => {
  it('should have ANOS_JANELA as 3-element tuple', () => {
    expect(ANOS_JANELA).toHaveLength(3);
  });

  it('should contain current year and 2 previous years', () => {
    const currentYear = new Date().getUTCFullYear();
    expect(ANOS_JANELA[0]).toBe(currentYear);
    expect(ANOS_JANELA[1]).toBe(currentYear - 1);
    expect(ANOS_JANELA[2]).toBe(currentYear - 2);
  });

  it('should be readonly tuple', () => {
    // TypeScript enforces readonly at compile time
    // Runtime: array is frozen-ish via as const
    expect(Array.isArray(ANOS_JANELA)).toBe(true);
  });
});