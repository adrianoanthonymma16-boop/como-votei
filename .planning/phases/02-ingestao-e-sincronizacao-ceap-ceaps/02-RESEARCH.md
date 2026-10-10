# Phase 2: Ingestão e Sincronização (CEAP/CEAPS) - Research

**Researched:** 2026-10-10
**Domain:** Streaming bulk ingestion, idempotent upsert, retention, sync resilience for legislative expense data
**Confidence:** HIGH (all contracts locked in Phase 1, codebase patterns established, official sources probed)

<phase_goal>
Ingerir as despesas dos últimos 3 anos (2024–2026) das duas casas no banco, usando os contratos congelados na Fase 1: model `Despesa` (Decimal(14,2), `idExterno` namespaced S6), `parseBRL`, `parseDataFonte`, `ANOS_JANELA`, `camaraNameMatch` Option A (id-first + fallback), `DespesaNormalizada`. Entregar scripts de sync resilientes (streaming `yauzl@3.4.0` + `stream-json@2.1.0`), upsert idempotente batched 1000, retenção DELETE pós-upsert (janela 3 anos), sanity gates, fix do gatilho duplicado 03:00 UTC (OPS-01).
</phase_goal>

<source_contracts_locked>
## Phase 1 Contracts (DO NOT REDECIDE)

| Contract | Location | Key Detail |
|----------|----------|------------|
| `Despesa` model | `prisma/schema.prisma` | `Decimal(14,2)`, `@@unique(idExterno)`, índices `(parlamentarId, ano, data)` + `(casa, ano)` |
| `idExterno` S6 | `src/lib/sync/despesa-id.ts` | `CAMARA:{idDocumento}:{sha256[:16]}` / `SENADO:{id}` |
| `parseBRL` | `src/lib/despesas.ts` | string-only, signed, nunca `parseFloat`, `Decimal(14,2)` |
| `parseDataFonte` | `src/lib/despesas.ts` | UTC-midnight, nullable, typo-safe (ex: `0202-07-04` → year 202) |
| `ANOS_JANELA` | `src/lib/despesas.ts` | `[current, current-1, current-2]` via UTC clock IIFE |
| `camaraNameMatch` Option A | `src/lib/sync/camara-name-match.ts` | id-first (`idDeputado`→`porIdExterno`) + fallback nome+UF exato, `metodo` audit, ambiguidade→`null` |
| `DespesaNormalizada` | `src/lib/sync/types.ts` | 14 campos, string decimals, zero Prisma imports |
| Fixtures | `.planning/phases/01-.../01-fixtures-fonte.json` | 20 registros reais rotulados (subcota-split, estorno, idDocumento=0, leader row, Senado) |
</source_contracts_locked>

<source_analysis>
## Official Sources (re-verified 2026-10-10)

### Câmara dos Deputados — CEAP
- **Endpoint:** `https://www.camara.leg.br/cotas/Ano-{ano}.json.zip`
- **Formato:** ZIP contendo JSON array (~225 MB para 2025, 209.080 registros)
- **Atualização:** Diária (snapshot oficial), histórico desde 2008
- **Campos-chave:** `idDocumento`, `idDeputado`, `nomeParlamentar`, `siglaUF`, `siglaPartido`, `valorLiquido`, `valorGlosa`, `valorDocumento`, `dataEmissao`, `urlDocumento`, `numeroSubCota`, `descricao`, `fornecedor`, `cnpjCPF`, `tipoDocumento`
- **Edge cases conhecidos (do 01-RESEARCH):**
  - `idDocumento` **não é único**: 14.541/10.319/46 colisões/ano (split subcotas, estornos, ajustes)
  - `idDocumento=0` sentinelas: 7.841/9.780/2.063 por ano (TELEFONIA sem data/URL)
  - `dataEmissao` vazia em ~10k/8k/2k linhas/ano → `parseDataFonte` retorna `null`
  - `urlDocumento` vazia em estornos/linhas sem PDF
  - `valorLiquido` signed string (ex: `"-1967.57"`) — `parseBRL` preserva sinal
  - `idDeputado` **presente em 100% das linhas** = `Parlamentar.idExterno` (match direto)

### Senado Federal — CEAPS
- **Endpoint:** `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}`
- **Formato:** JSON array direto (~10 MB/ano, ~23k registros 2025), sem paginação
- **Campos-chave:** `id`, `codSenador`, `nomeSenador`, `tipoDespesa`, `valorReembolsado` (number, signed), `data`, `fornecedor`, `cpfCnpj`, `detalhamento`
- **Edge cases:**
  - **Nunca tem `urlDocumento`** (0/3 anos) — `DespesaNormalizada.urlDocumento?` continua optional
  - `valorReembolsado` é JSON number (ex: `-1541.7`) — `parseBRL` aceita number
  - `data` pode ter typo year (`0202-07-04` → year 202) — `parseDataFonte` trata sem explodir
  - `cpfCnpj` mascarado (`457.***.***-00`) — string pass-through
  - `codSenador` = `Parlamentar.idExterno` para 100% dos 81 senadores (match direto)

### Volume & Storage
| Fonte | 2024 | 2025 | 2026 | Total 3 anos | Est. MB (A enxuta) |
|-------|------|------|------|--------------|-------------------|
| Câmara | ~249k | ~209k | ~114k | ~572k | ~120 MB |
| Senado | ~21k | ~24k | ~15k | ~60k | ~15 MB |
| **Total** | | | | **~632k** | **~135 MB** |

**Budget check:** Neon 0.5 GB free, 84 MB usados → +135 MB = 219 MB (44% usado) — **OK**.
</source_analysis>

<implementation_approach>
## Implementation Approach

### Scripts Architecture (GRAY-01 → A: Novos scripts independentes)
```
scripts/
├── sync-despesas-camara.ts    # --ano=YYYY [--apenas-despesas]
├── sync-despesas-senado.ts    # --ano=YYYY [--apenas-despesas]
```
- Seguem padrão `backfill-*.ts` (scripts independentes, flags `--apenas-*`)
- Reutilizam `src/lib/prisma.ts`, `src/lib/sync/http-client.ts`, `src/lib/sync/despesa-id.ts`, `src/lib/despesas.ts`, `src/lib/sync/camara-name-match.ts`
- **Não usam `NormalizerFactory`** — chamam adapters direto (Phase 2 scripts são entry points, não library)

### Streaming Parser (GRAY-06)
```typescript
// Câmara: yauzl unzip streaming → stream-json parse
import yauzl from 'yauzl';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { chain } from 'stream-chain';

const pipeline = chain([
  yauzl.fromUrl(zipUrl),           // streaming download + unzip
  streamArray(),                    // emite objetos individuais
  // transform: filtrar campos, derivar idExterno, parseBRL, parseDataFonte, name-match
]);
```
- `yauzl@3.4.0` (unzip streaming, evita carregar ZIP inteiro)
- `stream-json@2.1.0` (pin CJS — v3.x é ESM-only, quebra `ts-node` CommonJS)
- **Chunk 1000 objetos** para upsert batch (memória constante ~50 MB)

### Upsert Batch 1000 (GRAY-05)
```sql
INSERT INTO "Despesa" ("idExterno", "parlamentarId", "ano", "mes", "data", "categoria", "fornecedor", "cpfCnpj", "documento", "valor", "valorGlosa", "urlDocumento", "casa", "nomeParlamentarRaw", "importedAt")
VALUES ... (1000 rows)
ON CONFLICT ("idExterno") DO UPDATE SET
  "parlamentarId" = EXCLUDED."parlamentarId",
  "ano" = EXCLUDED."ano",
  "mes" = EXCLUDED."mes",
  "data" = EXCLUDED."data",
  "categoria" = EXCLUDED."categoria",
  "fornecedor" = EXCLUDED."fornecedor",
  "cpfCnpj" = EXCLUDED."cpfCnpj",
  "documento" = EXCLUDED."documento",
  "valor" = EXCLUDED."valor",
  "valorGlosa" = EXCLUDED."valorGlosa",
  "urlDocumento" = EXCLUDED."urlDocumento",
  "casa" = EXCLUDED."casa",
  "nomeParlamentarRaw" = EXCLUDED."nomeParlamentarRaw",
  "importedAt" = EXCLUDED."importedAt";
```
- 1000 rows × 15 cols ≈ 15k params (safe < 65.535 limit)
- `ON CONFLICT (idExterno)` usa a chave natural S6 única global
- `importedAt` sempre atualizado → suporta retenção/reconciliação (D-04)

### Retention DELETE (GRAY-02)
```typescript
// Após upsert bem-sucedido (pode ser na mesma transação se caber, ou step separado)
await prisma.$executeRaw`
  DELETE FROM "Despesa"
  WHERE "casa" = ${casa}
  AND "ano" NOT IN (${ANOS_JANELA[0]}, ${ANOS_JANELA[1]}, ${ANOS_JANELA[2]})
`;
```
- Executado **após upsert bem-sucedido** (mesma transação se caber, ou step separado pós-commit)
- Índices `(casa, ano)` tornam DELETE barato
- `ANOS_JANELA` = `[current, current-1, current-2]` (fonte única para import + retenção)

### Advisory Lock (GRAY-12)
```typescript
// Início de cada script
await prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('sync-despesas-camara'))`);
// ou 'sync-despesas-senado'
```
- Barato, atômico, nível transação (libera no commit/rollback)
- Impede double-ingestão: Vercel Cron + manual + GH dispatch simultâneos

### Sanity Gates (GRAY-10)
```typescript
// Executados APÓS upsert + retenção, antes de exit 0
const gates = [
  // 1. Match rate ≥ 99%
  async () => {
    const total = await prisma.despesa.count({ where: { casa: 'CAMARA', ano: { in: ANOS_JANELA } } });
    const matched = await prisma.despesa.count({ where: { casa: 'CAMARA', ano: { in: ANOS_JANELA }, parlamentarId: { not: null } } });
    return matched / total >= 0.99;
  },
  // 2. Total rows range
  async () => {
    const camara = await prisma.despesa.count({ where: { casa: 'CAMARA', ano: { in: ANOS_JANELA } } });
    const senado = await prisma.despesa.count({ where: { casa: 'SENADO', ano: { in: ANOS_JANELA } } });
    return camara >= 100_000 && camara <= 250_000 && senado >= 10_000 && senado <= 30_000;
  },
  // 3. Soma valores ±3σ
  async () => {
    const agg = await prisma.despesa.groupBy({
      by: ['casa', 'ano'],
      _sum: { valor: true, valorGlosa: true },
      where: { ano: { in: ANOS_JANELA } }
    });
    // Comparar com baseline histórico ±3σ (hardcoded ou lido de tabela de controle)
    return true; // placeholder
  },
  // 4. Zero duplicate idExterno (upsert garante, mas gate explícito audita)
  async () => {
    const dupes = await prisma.$queryRaw`SELECT "idExterno", COUNT(*) FROM "Despesa" WHERE "ano" IN (${ANOS_JANELA}) GROUP BY "idExterno" HAVING COUNT(*) > 1`;
    return dupes.length === 0;
  },
  // 5. Unmatched rate ≤ 1%
  async () => {
    const total = await prisma.despesa.count({ where: { ano: { in: ANOS_JANELA } } });
    const unmatched = await prisma.despesa.count({ where: { ano: { in: ANOS_JANELA }, parlamentarId: null } });
    return unmatched / total <= 0.01;
  }
];
for (const gate of gates) {
  if (!(await gate())) {
    console.error('SANITY GATE FAILED');
    process.exit(1);
  }
}
```

### Fix 03:00 UTC (OPS-01 - GRAY-03)
**Arquivo:** `.github/workflows/sync-camara.yml`
```yaml
# REMOVER:
# schedule:
#   - cron: '0 3 * * *'
# MANTER apenas:
on:
  workflow_dispatch:
```
- `sync-senado.yml` já roda às 04:00 e não tem gatilho duplicado
- Vercel Cron (`vercel.json`: `0 3 * * *` → `/api/cron/sync-incremental?casa=ambas`) já despacha `workflow_dispatch` para ambos
- `CRON_SECRET` já protege o endpoint

### Backfill Strategy (GRAY-09)
```typescript
// Loop único fonte de verdade: ANOS_JANELA
for (const ano of ANOS_JANELA) {
  await ingestYear(ano);  // Câmara + Senado
}
// Execuções diárias (schedule) tocam apenas ano corrente (ANOS_JANELA[0])
```

### Error Handling (GRAY-04)
```typescript
try {
  await ingestYear(ano);
} catch (err) {
  if (isIntegrityError(err)) { // schema mismatch, duplicate idExterno inesperado, match rate < 99%, soma valores fora sanity
    console.error('INTEGRITY ERROR:', err);
    process.exit(1); // fail-fast
  }
  if (isTransientError(err)) { // 429, timeout, 5xx, ECONNRESET
    console.warn('TRANSIENT ERROR, will retry:', err.message);
    // HttpClient já faz retry/backoff/429; se esgotou tentativas, log warning e continua
    // Mas NÃO exit 1 — log no summary final
  }
  throw err; // outros erros: fail
}
// Summary final sempre impresso:
console.log(JSON.stringify({ ingested, updated, deleted, matched, unmatched, errors, warnings }));
```

### Fixtures para Testes
- Reutilizar `.planning/phases/01-.../01-fixtures-fonte.json` (20 registros rotulados)
- Copiar para `src/lib/__tests__/fixtures/fontes.json` (já feito na Fase 1)
- Testes unitários: `despesa-id.test.ts` (colisão zero), `parse-brl.test.ts`, `datas-despesa.test.ts`, `camara-name-match.test.ts` (já Fase 1)
- **Novos testes Phase 2:** integração upsert+retention, sanity gates, streaming parser mock

### Pacotes Novos
**NENHUM** — stack locked (Phase 1): `yauzl@3.4.0`, `stream-json@2.1.0` já em `package.json`

### Storage Impact
- Estimado: ~135 MB (632k docs × ~214 bytes/row A enxuta)
- Neon 0.5 GB: 84 MB atuais + 135 MB = 219 MB (44%) — **OK**

### Risk Mitigations
| Risk | Mitigation |
|------|------------|
| Bulk Câmara indisponível | Retry/backoff no HttpClient; job falha ruidosamente; re-run manual via workflow_dispatch |
| OOM streaming | Chunk 1000 + streaming unzip/parse; memória constante ~50 MB |
| Duplicate idExterno | S6 provado 0 colisões em 556k linhas; `@@unique` + upsert garante |
| Match rate drop | Gate ≥99% falha job; alerta visível no GH Actions |
| Gatilho duplicado | Fix OPS-01 remove schedule GH Actions |
| Senado sem urlDocumento | `urlDocumento?` optional; UI mostra "Não disponível" (GAST-03/07) |
| Leader rows Câmara | `parlamentarId=null` gravado; UI filtra `parlamentarId != null` |
</implementation_approach>

<testing_strategy>
## Testing Strategy

### Unit Tests (existing + new)
| Test File | Coverage | Phase |
|-----------|----------|-------|
| `despesa-id.test.ts` | Colisão zero S6 + estorno + leader row | 1 |
| `parse-brl.test.ts` | 28 boundary cases + source scan | 1 |
| `datas-despesa.test.ts` | UTC-midnight, typo year, nullable | 1 |
| `camara-name-match.test.ts` | Option A id-first, fallback, ambiguidade | 1 |
| **`despesas-sync.test.ts`** (new) | Streaming parser mock, upsert batch, retention DELETE, sanity gates | 2 |

### Integration Tests
- `scripts/sync-despesas-camara.ts` com fixture 2025 (mock HTTP) → verifica upsert + retention + gates
- `scripts/sync-despesas-senado.ts` com fixture 2025 → verifica match direto, valor signed, sem urlDocumento

### E2E (Phase 4)
- Playwright: aba "Gastos" carrega → total, barras, lista, links, estados
</testing_strategy>

<references>
## References

- Fase 1 RESEARCH: `.planning/phases/01-.../01-RESEARCH.md` (S6 evidence, money/date probes, name-match stats)
- Fixtures: `.planning/phases/01-.../01-fixtures-fonte.json` (20 registros reais)
- Stack: `.planning/research/STACK.md` (yauzl 3.4.0, stream-json 2.1.0, batch 1000)
- Pitfalls: `.planning/research/PITFALLS.md` (money, key, name-match, year constant)
- Codebase maps: STACK, ARCHITECTURE, INTEGRATIONS, CONVENTIONS, CONCERNS
- Fixtures: `.planning/phases/01-.../01-fixtures-fonte.json` (20 rotulados)
</references>

---

*Phase: 2-Ingestão e Sincronização (CEAP/CEAPS)*
*Research completed: 2026-10-10*
*All contracts locked from Phase 1*