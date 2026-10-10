/**
 * Script de sincronização de despesas da Câmara dos Deputados (CEAP)
 * Executa via GitHub Actions (diário) ou manualmente
 * 
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-despesas-camara.ts --ano=YYYY --apenas-despesas
 * Variáveis de ambiente necessárias: DATABASE_URL
 * 
 * Flags:
 *   --ano=YYYY        (opcional, default: ANOS_JANELA loop)
 *   --apenas-despesas (obrigatório per GRAY-01)
 */

import { PrismaClient, Casa } from '@prisma/client';
import { camaraClient } from '../src/lib/sync/http-client';
import { derivarIdExternoDespesa } from '../src/lib/sync/despesa-id';
import { parseBRL, parseDataFonte, ANOS_JANELA } from '../src/lib/despesas';
import { camaraNameMatch, DiretorioParlamentares, EntradaMatch } from '../src/lib/sync/camara-name-match';
import { DespesaNormalizada } from '../src/lib/sync/types';
import { chain } from 'stream-chain';
import yauzl from 'yauzl';
import streamArray from '../src/lib/stream-json/streamers/stream-array.js';
import { Readable } from 'stream';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

interface SyncOptions {
  ano?: number;
  apenasDespesas?: boolean;
  debug?: boolean;
}

const BATCH_SIZE = 1000;
const ZIP_URL_TEMPLATE = 'https://www.camara.leg.br/cotas/Ano-{ano}.json.zip';

/**
 * RandomAccessReader para streaming de ZIP via HTTP com Range requests
 * Permite que yauzl leia o ZIP sem baixar tudo na memória
 */
class HttpRandomAccessReader extends EventEmitter {
  private url: string;
  private size: number;
  private fetchCache: Map<string, Uint8Array> = new Map();

  constructor(url: string) {
    super();
    this.url = url;
    this.size = 0;
  }

  async init(): Promise<void> {
    const response = await fetch(this.url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`HEAD request failed: ${response.status}`);
    }
    const contentLength = response.headers.get('content-length');
    if (!contentLength) {
      throw new Error('Content-Length header missing');
    }
    this.size = parseInt(contentLength, 10);
  }

  getSize(): number {
    return this.size;
  }

  // Required by RandomAccessReader interface
  _readStreamForRange(start: number, end: number): Readable {
    // Not used in our implementation, but required by interface
    const mockStream = new Readable({
      read() {
        this.push(null);
      },
    });
    return mockStream;
  }

  createReadStream(options: { start: number; end: number }): Readable {
    const { start, end } = options;
    const url = this.url;
    const stream = new Readable({
      async read() {
        try {
          const response = await fetch(url, {
            headers: { Range: `bytes=${start}-${end}` },
          });
          if (!response.ok && response.status !== 206) {
            this.destroy(new Error(`Range request failed: ${response.status}`));
            return;
          }
          const arrayBuffer = await response.arrayBuffer();
          this.push(Buffer.from(arrayBuffer));
          this.push(null);
        } catch (err) {
          this.destroy(err instanceof Error ? err : new Error(String(err)));
        }
      },
    });
    return stream;
  }

  read(buffer: Buffer, offset: number, length: number, position: number, callback: (err: Error | null) => void): void {
    this.readAsync(buffer, offset, length, position)
      .then(() => callback(null))
      .catch(callback);
  }

  private async readAsync(buffer: Buffer, offset: number, length: number, position: number): Promise<void> {
    const end = position + length - 1;
    const rangeKey = `${position}-${end}`;
    
    let chunk = this.fetchCache.get(rangeKey);
    if (!chunk) {
      const response = await fetch(this.url, {
        headers: { Range: `bytes=${position}-${end}` },
      });
      if (!response.ok && response.status !== 206) {
        throw new Error(`Range request failed: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      chunk = new Uint8Array(arrayBuffer);
      this.fetchCache.set(rangeKey, chunk);
    }
    
    buffer.set(chunk, offset);
  }

  close(callback: (err: Error | null) => void): void {
    this.fetchCache.clear();
    callback(null);
  }
}

async function buildDiretorio(): Promise<DiretorioParlamentares> {
  const parlamentares = await prisma.parlamentar.findMany({
    where: { casa: Casa.CAMARA },
    select: { id: true, idExterno: true, nome: true, uf: { select: { sigla: true } }, partido: { select: { sigla: true } } },
  });

  const porIdExterno: Record<string, string> = {};
  const porNomeUf: Record<string, string[]> = {};
  const partidosPorId: Record<string, string> = {};

  function normalizarNome(nome: string): string {
    return String(nome || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizarUf(uf: string): string {
    return String(uf || '').trim().toUpperCase();
  }

  for (const p of parlamentares) {
    porIdExterno[p.idExterno] = p.id;
    partidosPorId[p.id] = p.partido?.sigla || '';

    const nomeNorm = normalizarNome(p.nome);
    const ufNorm = normalizarUf(p.uf?.sigla || '');
    if (nomeNorm && ufNorm) {
      const chave = `${nomeNorm}|${ufNorm}`;
      if (!porNomeUf[chave]) porNomeUf[chave] = [];
      porNomeUf[chave].push(p.id);
    }
  }

  return { porIdExterno, porNomeUf, partidosPorId };
}

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

    const entrada: EntradaMatch = {
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
    console.warn(`⚠️  Erro ao transformar registro (idDocumento=${raw.idDocumento}):`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function upsertBatch(batch: DespesaNormalizada[]): Promise<{ inserted: number; updated: number }> {
  if (batch.length === 0) return { inserted: 0, updated: 0 };

  // Resolve parlamentarId from parlamentarIdExterno
  const recordsWithIds = await Promise.all(batch.map(async (d) => {
    let parlamentarId: string | null = null;
    if (d.parlamentarIdExterno) {
      const parl = await prisma.parlamentar.findUnique({
        where: { idExterno: d.parlamentarIdExterno },
        select: { id: true },
      });
      parlamentarId = parl?.id ?? null;
    }
    return { ...d, parlamentarId };
  }));

  const values: string[] = [];
  const params: unknown[] = [];

  for (const d of recordsWithIds) {
    const idx = params.length;
    values.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12}, $${idx + 13}, $${idx + 14}, $${idx + 15})`);
    
    params.push(
      d.idExterno,
      d.parlamentarId,
      d.ano,
      d.mes,
      d.data ?? null,
      d.categoria,
      d.fornecedor,
      d.cpfCnpj ?? null,
      d.documento ?? null,
      parseFloat(d.valor),
      d.valorGlosa ? parseFloat(d.valorGlosa) : null,
      d.urlDocumento ?? null,
      d.casa,
      d.nomeParlamentarRaw,
      new Date()
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

  const result = await prisma.$executeRawUnsafe(sql, ...params);
  return { inserted: 0, updated: Number(result) };
}

async function runRetention(casa: 'CAMARA' | 'SENADO'): Promise<number> {
  const anos = [...ANOS_JANELA] as number[];
  const result = await prisma.$executeRawUnsafe(
    `DELETE FROM "despesas" WHERE "casa" = $1 AND "ano" NOT IN ($2, $3, $4)`,
    casa,
    anos[0],
    anos[1],
    anos[2]
  );
  return Number(result);
}

async function runSanityGates(casa: 'CAMARA' | 'SENADO', anosJanela: readonly [number, number, number]): Promise<{ name: string; passed: boolean; details: string }[]> {
  const anos = [...anosJanela] as number[];
  const gates: { name: string; passed: boolean; details: string }[] = [];

  // Gate 1: Match rate ≥ 99%
  try {
    const total = await prisma.despesa.count({ where: { casa, ano: { in: anos } } });
    const matched = await prisma.despesa.count({ where: { casa, ano: { in: anos }, parlamentarId: { not: null } } });
    const rate = total > 0 ? matched / total : 1;
    gates.push({
      name: 'match-rate-ge-99',
      passed: rate >= 0.99,
      details: `matched=${matched}/${total} (${(rate * 100).toFixed(2)}%)`,
    });
  } catch (err) {
    gates.push({ name: 'match-rate-ge-99', passed: false, details: `error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Gate 2: Total rows range
  try {
    const count = await prisma.despesa.count({ where: { casa, ano: { in: anos } } });
    const min = casa === 'CAMARA' ? 100_000 : 10_000;
    const max = casa === 'CAMARA' ? 250_000 : 30_000;
    gates.push({
      name: 'rows-in-range',
      passed: count >= min && count <= max,
      details: `count=${count} (expected ${min}-${max})`,
    });
  } catch (err) {
    gates.push({ name: 'rows-in-range', passed: false, details: `error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Gate 3: Soma valores ±3σ
  try {
    const agg = await prisma.despesa.groupBy({
      by: ['ano'],
      _sum: { valor: true, valorGlosa: true },
      where: { casa, ano: { in: anos } },
    });
    const baselines: Record<string, { mean: number; sigma: number }> = {
      'CAMARA': { mean: 1_000_000_000, sigma: 200_000_000 },
      'SENADO': { mean: 50_000_000, sigma: 15_000_000 },
    };
    const baseline = baselines[casa];
    let passed = true;
    let details = '';
    for (const a of agg) {
      const sumValor = Number(a._sum.valor || 0);
      const sumGlosa = Number(a._sum.valorGlosa || 0);
      const total = sumValor + sumGlosa;
      const diff = Math.abs(total - baseline.mean);
      if (diff > 3 * baseline.sigma) passed = false;
      details += `ano=${a.ano} sum=${total} (baseline=${baseline.mean}±${3 * baseline.sigma}); `;
    }
    gates.push({ name: 'sum-within-3sigma', passed, details });
  } catch (err) {
    gates.push({ name: 'sum-within-3sigma', passed: false, details: `error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Gate 4: Zero duplicate idExterno
  try {
    const dupes = await prisma.$queryRawUnsafe(
      `SELECT "id_externo", COUNT(*) as cnt FROM "despesas" WHERE "casa" = $1 AND "ano" IN ($2, $3, $4) GROUP BY "id_externo" HAVING COUNT(*) > 1`,
      casa,
      anos[0],
      anos[1],
      anos[2]
    );
    const dupeCount = Array.isArray(dupes) ? dupes.length : 0;
    gates.push({
      name: 'zero-duplicate-idexterno',
      passed: dupeCount === 0,
      details: `duplicates=${dupeCount}`,
    });
  } catch (err) {
    gates.push({ name: 'zero-duplicate-idexterno', passed: false, details: `error: ${err instanceof Error ? err.message : String(err)}` });
  }

  // Gate 5: Unmatched rate ≤ 1%
  try {
    const total = await prisma.despesa.count({ where: { casa, ano: { in: anos } } });
    const unmatched = await prisma.despesa.count({ where: { casa, ano: { in: anos }, parlamentarId: null } });
    const rate = total > 0 ? unmatched / total : 0;
    gates.push({
      name: 'unmatched-rate-le-1',
      passed: rate <= 0.01,
      details: `unmatched=${unmatched}/${total} (${(rate * 100).toFixed(2)}%)`,
    });
  } catch (err) {
    gates.push({ name: 'unmatched-rate-le-1', passed: false, details: `error: ${err instanceof Error ? err.message : String(err)}` });
  }

  return gates;
}

async function ingestYear(ano: number, diretorio: DiretorioParlamentares): Promise<{
  ingested: number;
  updated: number;
  errors: number;
  warnings: number;
  matched: number;
  unmatched: number;
}> {
  const zipUrl = ZIP_URL_TEMPLATE.replace('{ano}', String(ano));
  console.log(`\n📦 Baixando e processando ${zipUrl}...`);

  let ingested = 0;
  let updated = 0;
  let errors = 0;
  let warnings = 0;
  let matched = 0;
  let unmatched = 0;

  // Create HTTP RandomAccessReader for streaming
  const reader = new HttpRandomAccessReader(zipUrl);
  await reader.init();
  console.log(`  ZIP size: ${(reader.getSize() / 1024 / 1024).toFixed(1)} MB`);

  return new Promise((resolve, reject) => {
    const batch: DespesaNormalizada[] = [];

    yauzl.fromRandomAccessReader(reader, reader.getSize(), { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      if (!zipfile) {
        reject(new Error('Failed to open zip file'));
        return;
      }

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (entry.fileName.endsWith('.json')) {
          zipfile.openReadStream(entry, { decodeFileData: true }, (err, readStream) => {
            if (err) {
              errors++;
              console.warn('⚠️  Erro ao abrir stream do entry:', err.message);
              zipfile.readEntry();
              return;
            }

            const pipeline = chain([
              readStream as Readable,
              streamArray(),
            ]);

            pipeline.on('data', (chunk) => {
              try {
                const raw = chunk.value;
                const normalized = transformRecord(raw, diretorio);
                if (normalized) {
                  if (normalized.parlamentarIdExterno) matched++; else unmatched++;
                  batch.push(normalized);
                  if (batch.length >= BATCH_SIZE) {
                    pipeline.pause();
                    upsertBatch(batch)
                      .then(({ updated: upd }) => {
                        ingested += batch.length;
                        updated += upd;
                        batch.length = 0;
                        pipeline.resume();
                      })
                      .catch((err) => {
                        errors++;
                        console.error('❌ Erro no upsert batch:', err);
                        batch.length = 0;
                        pipeline.resume();
                      });
                  }
                } else {
                  warnings++;
                }
              } catch (err) {
                errors++;
                console.warn('⚠️  Erro ao processar chunk:', err instanceof Error ? err.message : String(err));
              }
            });

            pipeline.on('end', () => {
              zipfile.readEntry();
            });

            pipeline.on('error', (err) => {
              errors++;
              console.warn('⚠️  Erro no pipeline:', err.message);
              zipfile.readEntry();
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', async () => {
        if (batch.length > 0) {
          try {
            const { updated: upd } = await upsertBatch(batch);
            ingested += batch.length;
            updated += upd;
            batch.length = 0;
          } catch (err) {
            errors++;
            console.error('❌ Erro no upsert final:', err);
          }
        }
        resolve({ ingested, updated, errors, warnings, matched, unmatched });
      });

      zipfile.on('error', (err) => {
        reject(err);
      });
    });
  });
}

async function syncDespesasCamara(options: SyncOptions = {}) {
  const startTime = Date.now();
  const anos = options.ano ? [options.ano] : [...ANOS_JANELA];
  const apenasDespesas = options.apenasDespesas === true;

  if (!apenasDespesas) {
    console.error('❌ Flag --apenas-despesas é obrigatória (GRAY-01)');
    process.exit(1);
  }

  console.log(`\n🏛️  INICIANDO SYNC DESPESAS CÂMARA - Anos: ${anos.join(', ')}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  let totalIngested = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalMatched = 0;
  let totalUnmatched = 0;
  let totalDeleted = 0;

  try {
    // 1. Advisory lock (GRAY-12)
    console.log('\n🔒 Adquirindo advisory lock...');
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('sync-despesas-camara'))`);
    console.log('✅ Lock adquirido');

    // 2. Build diretório
    console.log('\n📋 Construindo diretório de parlamentares...');
    const diretorio = await buildDiretorio();
    console.log(`✅ Diretório: ${Object.keys(diretorio.porIdExterno).length} parlamentares`);

    // 3. Loop anos (GRAY-09)
    for (const ano of anos) {
      console.log(`\n⏰ Processando ano ${ano}...`);
      const result = await ingestYear(ano, diretorio);
      totalIngested += result.ingested;
      totalUpdated += result.updated;
      totalErrors += result.errors;
      totalWarnings += result.warnings;
      totalMatched += result.matched;
      totalUnmatched += result.unmatched;
      console.log(`✅ Ano ${ano}: ingested=${result.ingested}, updated=${result.updated}, matched=${result.matched}, unmatched=${result.unmatched}, errors=${result.errors}, warnings=${result.warnings}`);
    }

    // 4. Retention DELETE (GRAY-02)
    console.log('\n🗑️  Executando retenção (DELETE anos fora da janela)...');
    totalDeleted = await runRetention('CAMARA');
    console.log(`✅ ${totalDeleted} registros removidos`);

    // 5. Sanity Gates (GRAY-10)
    console.log('\n🛡️  Executando sanity gates...');
    const gates = await runSanityGates('CAMARA', ANOS_JANELA);
    let allPassed = true;
    for (const gate of gates) {
      const status = gate.passed ? '✅' : '❌';
      console.log(`  ${status} ${gate.name}: ${gate.details}`);
      if (!gate.passed) allPassed = false;
    }

    if (!allPassed) {
      console.error('\n❌ SANITY GATES FALHARAM');
      process.exit(1);
    }
    console.log('✅ Todos os sanity gates passaram');

  } catch (error) {
    const err = error as Error;
    console.error('\n❌ ERRO NO SYNC DESPESAS CÂMARA:', err);

    // Fail-fast em erros de integridade
    const isIntegrity = err.message.includes('duplicate key') ||
                        err.message.includes('constraint') ||
                        err.message.includes('SANITY') ||
                        err.message.includes('integrity');

    if (isIntegrity) {
      console.error('💥 ERRO DE INTEGRIDADE - Fail-fast');
      process.exit(1);
    }

    // Erros transitórios: log warning, continua mas summary final
    console.warn('⚠️  Erro transitório - será reportado no summary');
    totalErrors++;
  } finally {
    // Summary final SEMPRE impresso
    const tempoTotal = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const summary = {
      ingested: totalIngested,
      updated: totalUpdated,
      deleted: totalDeleted,
      matched: totalMatched,
      unmatched: totalUnmatched,
      errors: totalErrors,
      warnings: totalWarnings,
      tempoMinutos: Number(tempoTotal),
    };
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO FINAL');
    console.log('='.repeat(60));
    console.log(JSON.stringify(summary, null, 2));
    await prisma.$disconnect();
  }
}

// CLI
const args = process.argv.slice(2);
const options: SyncOptions = {};

for (const arg of args) {
  if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1], 10);
  if (arg === '--apenas-despesas') options.apenasDespesas = true;
  if (arg === '--debug') options.debug = true;
}

syncDespesasCamara(options);