/**
 * Testes da coleta de lixo (retenção) — src/lib/gc.ts.
 *
 * - Unit (sempre roda): construirCorte e os predicados de ESPEC_GC (puros).
 * - Integração (guard hasDb): contagem read-only e o caminho de DELETE real,
 *   este último dentro de uma transação que SEMPRE sofre rollback — nenhum
 *   dado de produção é removido pelos testes.
 */

import { PrismaClient } from '@prisma/client';
import {
  construirCorte,
  contarForaDaJanela,
  especDaTabela,
  ESPEC_GC,
  executarGc,
} from '@/lib/gc';

describe('construirCorte (puro)', () => {
  it('usa o menor ano como corte e 1º de janeiro UTC', () => {
    const corte = construirCorte([2026, 2025, 2024]);
    expect(corte.anoCorte).toBe(2024);
    expect(corte.dataCorte.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(corte.anos).toEqual([2026, 2025, 2024]);
  });

  it('não muta nem compartilha o array de entrada', () => {
    const anos = [2026, 2025, 2024];
    const corte = construirCorte(anos);
    expect(corte.anos).not.toBe(anos);
    anos.push(2023);
    expect(corte.anos).toEqual([2026, 2025, 2024]);
  });

  it('funciona com janela de um único ano', () => {
    expect(construirCorte([2030]).anoCorte).toBe(2030);
  });

  it('lança com janela vazia', () => {
    expect(() => construirCorte([])).toThrow(/vazia/);
  });

  it('default (ANOS_JANELA) corta em anoCorrente - 2', () => {
    const anoCorrente = new Date().getUTCFullYear();
    expect(construirCorte().anoCorte).toBe(anoCorrente - 2);
  });
});

describe('ESPEC_GC — predicados', () => {
  const corte = construirCorte([2026, 2025, 2024]);

  it('cobre exatamente as tabelas esperadas, filhos antes dos pais', () => {
    expect(ESPEC_GC.map((e) => e.tabela)).toEqual([
      'votos',
      'votacoes',
      'tramitacoes',
      'proposicoes',
      'discursos',
      'frequencias',
      'despesas',
    ]);
  });

  it('tabelas com data usam dataCorte', () => {
    for (const tabela of ['votacoes', 'discursos'] as const) {
      const espec = ESPEC_GC.find((e) => e.tabela === tabela);
      expect(espec?.foraDaJanela(corte).params).toEqual([corte.dataCorte]);
    }
  });

  it('tabelas com ano usam anoCorte', () => {
    for (const tabela of ['proposicoes', 'frequencias', 'despesas'] as const) {
      const espec = ESPEC_GC.find((e) => e.tabela === tabela);
      expect(espec?.foraDaJanela(corte).params).toEqual([corte.anoCorte]);
    }
  });

  it('proposições cortam pelo campo "ano", não por data_apresentacao', () => {
    const espec = ESPEC_GC.find((e) => e.tabela === 'proposicoes');
    expect(espec?.foraDaJanela(corte).sql).not.toContain('data_apresentacao');
    expect(espec?.foraDaJanela(corte).sql).toContain('"ano"');
  });

  it('filhos filtram pela tabela pai (votos→votacoes, tramitacoes→proposicoes)', () => {
    expect(ESPEC_GC.find((e) => e.tabela === 'votos')?.foraDaJanela(corte).sql).toContain('votacoes');
    expect(ESPEC_GC.find((e) => e.tabela === 'tramitacoes')?.foraDaJanela(corte).sql).toContain(
      'proposicoes'
    );
  });

  it('nunca inclui partido/uf/parlamentar', () => {
    const tabelas = ESPEC_GC.map((e) => e.tabela);
    expect(tabelas).not.toContain('parlamentares');
    expect(tabelas).not.toContain('partidos');
    expect(tabelas).not.toContain('ufs');
  });

  it('especDaTabela devolve a especificação e lança para tabela desconhecida', () => {
    expect(especDaTabela('despesas').tabela).toBe('despesas');
    expect(() => especDaTabela('parlamentares')).toThrow(/não coberta/);
  });
});

const prisma = new PrismaClient();
const hasDb = Boolean(process.env.DATABASE_URL);

(hasDb ? describe : describe.skip)('executarGc (integração)', () => {
  const corte = construirCorte();
  const sufixo = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // Prefixo exclusivo: NÃO pode começar com "TEST_" — despesas-*.test.ts
  // apagam `idExterno startsWith 'TEST_'` no beforeAll/afterAll e apagariam
  // estas fixtures em execução concorrente da suíte.
  const idVotacaoFora = `GCTEST_VOT_OUT_${sufixo}`;
  const idVotacaoDentro = `GCTEST_VOT_IN_${sufixo}`;
  const idDespesaFora = `GCTEST_DESP_OUT_${sufixo}`;

  beforeAll(async () => {
    await prisma.votacao.createMany({
      data: [
        {
          idExterno: idVotacaoFora,
          casa: 'CAMARA',
          legislatura: 53,
          numero: 1,
          data: new Date(Date.UTC(corte.anoCorte - 5, 0, 1)),
          descricao: 'TEST GC votacao fora da janela',
        },
        {
          idExterno: idVotacaoDentro,
          casa: 'CAMARA',
          legislatura: 57,
          numero: 2,
          data: new Date(),
          descricao: 'TEST GC votacao dentro da janela',
        },
      ],
    });
    await prisma.despesa.createMany({
      data: [
        {
          idExterno: idDespesaFora,
          casa: 'CAMARA',
          ano: corte.anoCorte - 5,
          mes: 1,
          categoria: 'TESTE',
          fornecedor: 'TESTE',
          valor: '1.00',
          nomeParlamentarRaw: 'TESTE',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.votacao.deleteMany({ where: { idExterno: { startsWith: 'GCTEST_' } } });
    await prisma.despesa.deleteMany({ where: { idExterno: { startsWith: 'GCTEST_' } } });
    await prisma.$disconnect();
  });

  it('contarForaDaJanela conta as linhas fora e ignora as de dentro', async () => {
    const itens = await contarForaDaJanela(prisma, corte);
    const votacoes = itens.find((i) => i.tabela === 'votacoes');
    const despesas = itens.find((i) => i.tabela === 'despesas');
    expect(votacoes?.registros).toBeGreaterThanOrEqual(1);
    expect(despesas?.registros).toBeGreaterThanOrEqual(1);
    expect(await prisma.votacao.count({ where: { idExterno: idVotacaoDentro } })).toBe(1);
  });

  it('dry-run (default) não apaga nada', async () => {
    const resultado = await executarGc(prisma);
    expect(resultado.dryRun).toBe(true);
    expect(resultado.total).toBeGreaterThanOrEqual(2);
    expect(await prisma.votacao.count({ where: { idExterno: idVotacaoFora } })).toBe(1);
  });

  it('apply remove fora da janela e preserva dentro (rollback garantido)', async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          const resultado = await executarGc(tx, { dryRun: false, lote: 1000 });
          expect(resultado.dryRun).toBe(false);
          expect(resultado.total).toBeGreaterThanOrEqual(2);
          expect(await tx.votacao.count({ where: { idExterno: idVotacaoFora } })).toBe(0);
          expect(await tx.votacao.count({ where: { idExterno: idVotacaoDentro } })).toBe(1);
          expect(await tx.despesa.count({ where: { idExterno: idDespesaFora } })).toBe(0);
          throw new Error('ROLLBACK_GC_TEST');
        },
        { timeout: 30000 }
      )
    ).rejects.toThrow('ROLLBACK_GC_TEST');

    // Rollback: o banco não mudou.
    expect(await prisma.votacao.count({ where: { idExterno: idVotacaoFora } })).toBe(1);
    expect(await prisma.votacao.count({ where: { idExterno: idVotacaoDentro } })).toBe(1);
  });
});
