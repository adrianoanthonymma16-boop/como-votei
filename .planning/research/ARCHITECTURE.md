# Architecture Research — Despesas (Gastos) no Como Votei

**Domain:** Legislative-transparency brownfield (Next.js 14 + Prisma + Neon) adding the parliamentary-expenses (CEAP/CEAPS) feature
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH (source schemas verified **first-hand** against live official endpoints on 2026-10-09; integration patterns follow the mapped codebase; per-provider tier for search-derived items = MEDIUM, see Sources)

---

## Standard Architecture

### System Overview — target state (new components marked `★`)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OFFICIAL SOURCES (no auth, no key)                                         │
│  ★ Câmara: GET https://www.camara.leg.br/cotas/Ano-{ano}.json.zip          │
│      8.7 MB ZIP → { "dados": [ ~209k records ] } pretty JSON ~225 MB       │
│      full-year snapshot, regenerated daily ~06:29 GMT                      │
│  ★ Senado: GET adm.senado.gov.br/adm-dadosabertos/api/v1/                 │
│      senadores/despesas_ceaps/{ano}  → flat DespesaCeapsDto[] (~10 MB)     │
│      no pagination, daily update                                           │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ plain fetch (single request/house/year — NOT the rate-limit queue)
┌───────────────▼────────────────────────────────────────────────────────────┐
│ INGESTION (offline batch — GitHub Actions, existing flag-based phases)     │
│  .github/workflows/sync-camara.yml 03:00 UTC / sync-senado.yml 04:00 UTC   │
│    ★ new trailing steps: --apenas-despesas --ano=YYYY (loop 2024..2026)    │
│    ★ retention step at end of each despesas phase (3-year window DELETE)   │
│  scripts/sync-camara.ts · scripts/sync-senado.ts  ★ +apenasDespesas phase  │
│    │ uses                                                                 │
│  ★ bulk-download.ts   (download → unzipper.Parse → stream-json entry)     │
│    camara-adapter.ts  ★ fetchDespesas(ano)  → async generator of batches  │
│    senado-adapter.ts  ★ fetchDespesas(ano)  → async generator of batches  │
│    ★ camara-name-match.ts (pure: nome+partido+UF normalized → match key)  │
│    types.ts ★ DespesaNormalizada                                          │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ chunked raw SQL upsert (1000 rows, ON CONFLICT DO UPDATE)
┌───────────────▼────────────────────────────────────────────────────────────┐
│ PERSISTENCE — prisma/schema.prisma ★ model Despesa (snake_case @map)       │
│  despesas: idExterno unique (namespaced), parlamentarId FK (Cascade),      │
│  casa, data, ano, mes, categoria, fornecedor, cnpjCpf, documento,          │
│  valorLiquid Decimal(12,2), urlDocumento?, detalhe?                        │
│  @@index([parlamentarId, ano])  @@index([casa, ano])                       │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ reads only (CONTEXT.md invariant: UI never hits gov APIs)
┌───────────────▼────────────────────────────────────────────────────────────┐
│ API — src/app/api/parlamentares/[id]/despesas/route.ts ★                  │
│  zod querySchema {ano, page, limit, categoria} → 400/404 → Prisma          │
│  ★ resumo via prisma.groupBy(categoria)._sum(valorLiquid) per request      │
│  ★ page mode envelope identical to proposicoes route                       │
│  src/lib/despesas.ts ★ pure compute (totais, barras, formatação)           │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ JSON
┌───────────────▼────────────────────────────────────────────────────────────┐
│ UI — src/app/parlamentares/[id]/despesas/page.tsx ★ (server shell)         │
│  + components/DespesasTab.tsx ★ ('use client', fetch own API)              │
│  ★ registered in ParlamentarHeader: SecaoId 'despesas' + secoes + cores    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Talks to | File (★ = new, ~ = edited) |
|-----------|----------------|----------|----------------|
| Bulk source reader | Download 8.7 MB ZIP, stream-unzip, stream-parse the `dados` array one record at a time (constant memory) | Câmara URL only | ★ `src/lib/sync/bulk-download.ts` |
| Câmara despesa adapter | Raw record → `DespesaNormalizada` (parse string money/ISO dates), emit batches; never touches DB | bulk-download, types | ~ `src/lib/sync/camara-adapter.ts` (`fetchDespesas`) |
| Senado despesa adapter | CEAPS DTO → `DespesaNormalizada`; `codSenador` kept as idExterno key | adm API, types | ~ `src/lib/sync/senado-adapter.ts` (`fetchDespesas`) |
| Name-match helper | Pure normalization: `nomeParlamentar + siglaPartido + siglaUF` → match key; **returns null on ambiguity** (never invents) | nothing (pure) | ★ `src/lib/sync/camara-name-match.ts` |
| Normalized type | Single contract both houses must emit before persistence | — | ~ `src/lib/sync/types.ts` (`DespesaNormalizada`) |
| Sync phase (script) | Phase gating `--apenas-despesas`; preload `Map` (match key|idExterno → parlamentar.id); chunked raw upsert; retention DELETE; stats + unmatched log | adapters, Prisma | ~ `scripts/sync-camara.ts`, ~ `scripts/sync-senado.ts` |
| Workflow steps | Trailing steps after existing phases/guardrails: per-year loop + retry (3×), `workflow_dispatch` input `apenas-despesas` | scripts | ~ `.github/workflows/sync-{camara,senado}.yml` |
| Persistence model | Document-level row with official receipt link, indexed for `(parlamentarId, ano)` and `(casa, ano)` | Neon | ★ `prisma/schema.prisma` (`Despesa`) + migration |
| API route | Validate → count/page rows → groupBy resumo → JSON envelope | Prisma, `src/lib/despesas.ts` | ★ `src/app/api/parlamentares/[id]/despesas/route.ts` |
| Pure compute | Total anual, resumo por categoria, formatting (unit-tested) | nothing | ★ `src/lib/despesas.ts` + ★ `src/lib/__tests__/despesas.test.ts` |
| Server shell | Load parlamentar, `generateMetadata`, render header + tab | Prisma, header | ★ `src/app/parlamentares/[id]/despesas/page.tsx` |
| Client tab | Year selector, category bars, paginated list, receipt/source links, skeleton/error states | API route only | ★ `src/app/parlamentares/[id]/components/DespesasTab.tsx` |
| Header registration | Add `despesas` to `SecaoId`, `secoes`, `coresSecao` | — | ~ `.../components/ParlamentarHeader.tsx` |

---

## Recommended Project Structure

```text
src/
├── lib/
│   ├── sync/
│   │   ├── bulk-download.ts        ★ download+unzip+stream-json pipeline (Câmara)
│   │   ├── camara-name-match.ts    ★ pure name-match key builder (unit tested)
│   │   ├── camara-adapter.ts       ~ + fetchDespesas(ano): AsyncGenerator<DespesaNormalizada[]>
│   │   ├── senado-adapter.ts       ~ + fetchDespesas(ano): AsyncGenerator<DespesaNormalizada[]>
│   │   ├── types.ts                ~ + DespesaNormalizada
│   │   └── normalizer-factory.ts   (unchanged — adapters already exposed via getCamara/getSenado)
│   ├── despesas.ts                 ★ pure resumo/totais compute (API uses; Jest covers)
│   └── __tests__/despesas.test.ts  ★
├── app/
│   ├── api/parlamentares/[id]/despesas/route.ts   ★ (copy proposicoes/route.ts skeleton)
│   └── parlamentares/[id]/
│       ├── despesas/page.tsx                       ★ (copy proposicoes/page.tsx skeleton)
│       └── components/DespesasTab.tsx              ★ + ~ ParlamentarHeader.tsx (register tab)
scripts/
├── sync-camara.ts                  ~ + SyncOptions.apenasDespesas phase + retention
└── sync-senado.ts                  ~ + SyncOptions.apenasDespesas phase + retention
.github/workflows/
├── sync-camara.yml                 ~ + input + trailing "Sync despesas (3 anos)" steps
└── sync-senado.yml                 ~ + input + trailing "Sync despesas (3 anos)" steps
prisma/
└── schema.prisma                   ~ + model Despesa  → prisma migrate dev --name despesas
```

### Structure Rationale

- **`src/lib/sync/bulk-download.ts` as a separate module, not inside the adapter:** the ZIP/stream machinery is Câmara-specific plumbing with no normalization logic; keeping it out of the 618-line `camara-adapter.ts` avoids growing an already-oversized file (STRUCTURE.md "near-duplicate sync scripts" anti-pattern already flags adapter bloat).
- **Adapters stay DB-free (existing invariant):** they emit `DespesaNormalizada` carrying a *match key* (`nome|partido|UF` for Câmara, `idExterno` for Senado); the **script** owns all DB access and resolves keys via a preloaded `Map`. This matches how current phases resolve `voto.parlamentarIdExterno` — except the map is preloaded once instead of `findUnique` per record (see Anti-Pattern 2).
- **`src/lib/despesas.ts` separate from the route:** mirrors `dashboard.ts`/`produtividade.ts` — pure functions get Jest coverage without a database; the route stays thin.
- **API folder mirrors page folder** (`api/parlamentares/[id]/despesas` ↔ `parlamentares/[id]/despesas`) — the codebase's hard convention (STRUCTURE.md).

---

## Architectural Patterns

### Pattern 1: Flag-based phase integration (`--apenas-despesas`)

**What:** Add one boolean phase to the existing `SyncOptions` gating (`onlyFlags` array → `hasOnly` → `sync(flag)`), exactly like `--apenas-frequencia`.
**When:** Always — the question's premise is right: the `--apenas-*` mechanism is the codebase's extension point for ingestion, and it already drives both the scheduled loops and the `workflow_dispatch` inputs.
**Trade-offs:** reuses retry/migration/boilerplate of the existing workflows (+10 lines per script, +1 step per yml); a despesas failure cannot block the legislative phases because the new steps run **after** all existing sync steps *and* guardrails (GH Actions stops at the first failed step — ordering is the isolation mechanism).

```ts
// scripts/sync-camara.ts (~)
interface SyncOptions { /* ...existing... */ apenasDespesas?: boolean; }
const onlyFlags = [/*...existing...*/, options.apenasDespesas];
// phase block at the END, after proposições/frequência:
if (sync(options.apenasDespesas)) { await syncDespesasCamara(ano); await limparDespesasForaDaJanela('CAMARA'); }
// CLI: if (arg === '--apenas-despesas') options.apenasDespesas = true;
```

```yaml
# .github/workflows/sync-camara.yml (~) — AFTER the existing guardrail steps
- name: Sync despesas (3 anos)        # if: schedule
  run: |
    for ano in 2024 2025 2026; do
      npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-camara.ts --apenas-despesas --ano=$ano
    done
- name: Guardrail — despesas          # count > 0 + unmatched-rate threshold
```

**Workflow-dispatch:** add boolean input `apenas-despesas` and one `[ "$INPUT_DESPESAS" = "true" ] && ARGS="$ARGS --apenas-despesas"` line in the existing manual-args block.
**Vercel Cron (`/api/cron/sync-incremental`):** **no change** — it dispatches the two existing workflows, which now include the despesas phase. (A dedicated third workflow would also require editing that route — another argument for integration.)

### Pattern 2: Streaming bulk parse (never materialize 225 MB)

**What:** `fetch` the ZIP (8.7 MB — buffer it), pipe through `unzipper.Parse()` → entry `*.json` → `stream-json` `parser() → pick({filter:'dados'}) → streamArray()`, emitting one record at a time into a batch accumulator.
**When:** Always for the Câmara bulk file. GH Actions runners have 7 GB RAM and a full `JSON.parse` of the pretty-printed 225 MB file costs multiple GB of object graph — it *might* fit, it *will* be fragile; streaming makes it deterministic.
**Trade-offs:** two small runtime deps (`unzipper`, `stream-json` — both pure-JS, no native builds, active on npm) + type declarations must pass `tsc --noEmit`/`jest`/`next build`; slightly more code than `adm-zip`+`JSON.parse`. Acceptable — the alternative risks OOM at 03:00 UTC with no one watching.

```typescript
// src/lib/sync/bulk-download.ts (★) — constant-memory pipeline
const zip = await fetch(`https://www.camara.leg.br/cotas/Ano-${ano}.json.zip`).then(r => r.arrayBuffer());
const stream = Readable.from(Buffer.from(zip))
  .pipe(unzipper.Parse())
  .on('entry', (e) => e.path.endsWith('.json') ? e : e.autodrain());
for await (const rec of streamArray(chain([stream, parser({}), pick({ filter: 'dados' })])))
  yield rec.value;                       // CamaraAdapter batches these 1000-at-a-time
```

Senado needs no streaming: one flat ~10 MB JSON array per year — `fetch` + `res.json()` is fine.

### Pattern 3: Idempotent bulk upsert — raw `INSERT … ON CONFLICT DO UPDATE`

**What:** chunked parameterized raw SQL via `prisma.$executeRaw` (batches of 1000, per Prisma's own bulk-write guidance) keyed on the unique `id_externo`.
**When:** the despesas phase — always. The Câmara file is a **daily full-year snapshot**: every run sees all ~209k rows of the year; ~all are already present, a handful are new or corrected.
**Trade-offs considered (opinionated):**

| Strategy | Idempotent? | Refreshes corrected rows? | Daily DB churn | Verdict |
|----------|-------------|---------------------------|----------------|---------|
| Per-row `prisma.despesa.upsert()` (existing script style) | ✓ | ✓ | ✓ low | ✗ 600k round-trips/day — far too slow |
| `createMany({skipDuplicates:true})` | ✓ (insert-only) | ✗ corrections never land | ✓ low | fallback only — silently stale values |
| `deleteMany(casa, ano)` + `createMany` per year | ✓ | ✓ | ✗ ~200k dead tuples **every day** → bloat on a 500 MB free DB | reject |
| **raw `INSERT … ON CONFLICT (id_externo) DO UPDATE` in 1000-row batches** | ✓ | ✓ | ✓ low (only diffs update) | **choose** |

**Notes:** `ON CONFLICT DO UPDATE` does not exist in Prisma's client API (open feature request prisma#4134/#5437) → raw SQL is required; generate `id` client-side with `crypto.randomUUID()` (column is `String @id`, cuid vs uuid is cosmetic); Prisma `createMany` cannot be mixed with nested relations, so resolve `parlamentarId` before building the VALUES tuples (the preload `Map` does this).

```typescript
// scripts/sync-camara.ts despesas phase (~) — sketch
const idx = new Map<string, string>();            // matchKey → parlamentar.id (preloaded once)
for await (const batch of camara.fetchDespesas(ano)) {
  const rows = batch.map(d => ({ ...d, parlamentarId: idx.get(d.matchKey!) })).filter(r => r.parlamentarId);
  await upsertDespesasChunk(rows);                // 1000-row raw ON CONFLICT DO UPDATE
}
```

### Pattern 4: Câmara name-match vs Senado codSenador (mapping at the boundary)

**What:** the anti-corruption seam normalizes *how* each house identifies a parlamentar:
- **Senado:** `codSenador` (int64) **is** the `idExterno` already in `Parlamentar` → direct `Map.get(idExterno)`. (Verified: DTO field `codSenador: 475` style ids.)
- **Câmara:** bulk exposes only `numeroDeputadoID` (cota namespace — *different* from the dadosabertos id) → match on normalized `nomeParlamentar + siglaPartido + siglaUF`, per PROJECT.md Key Decision. Unmatched rows (e.g. `LID.GOV-CD`, `siglaUF=NA`, party change mid-year) are **counted, logged, and skipped — never guessed**.
**When:** always at adapter→script boundary; the pure `camara-name-match.ts` gets unit tests (accents, casing, party/UF mismatch → null).
**Trade-offs:** party changes over a year cause partial misses (a deputado who switched PT→PSDB only matches records whose snapshot party equals the *current* DB row). Acceptable for v1 + guardrail; a fallback second pass matching on name+UF alone *only when unique* can be added later.

### Pattern 5: Retention DELETE inside the despesas phase

**What:** after a **successful** ingest of the year, `prisma.despesa.deleteMany({ where: { casa, ano: { lt: ANO_LIMITE } } })` with `ANO_LIMITE = new Date().getFullYear() - 2` (keeps exactly 3 years: 2024-2026 in 2026, matching the workflows' hard-coded loop).
**When:** end of every despesas phase run; idempotent no-op daily, ~one year-bucket (~230k rows) actually deleted only at the January rollover.
**Trade-offs:** `@@index([casa, ano])` makes the row-locating scan index-only; a single `deleteMany` of ≤230k rows runs in seconds inside one transaction — chunking (10k/txn) is the fallback if lock time ever matters (community guidance: keep delete transactions short so autovacuum isn't blocked; Neon runs autovacuum for you). Deleting **before** ingest would create a data-loss window on a failed download → order is strictly **ingest → verify → delete**.

### Pattern 6: Read path — compute-on-read, no aggregate tables

**What:** `GET /api/parlamentares/[id]/despesas?ano=&page=` computes `groupBy(['categoria'], _sum(valorLiquid))` + `count()` per request; UI renders bars from `resumo`.
**When:** always — PROJECT.md explicitly puts "agregados pré-computados (ano×categoria)" **out of scope** ("a UI agrega a partir dos documentos").
**Trade-offs:** a `groupBy` over one parlamentar-year (~300-1500 rows, index-covered) is sub-ms; no cache invalidation problem; recompute cost is negligible until multi-parlamentar rankings arrive (future scope).

---

## Data Flow

### Write path (daily, offline)

```
03:00 UTC schedule / workflow_dispatch
   → sync-camara.yml step "Sync despesas (3 anos)"
   → scripts/sync-camara.ts --apenas-despesas --ano=2025
   → preload Map<matchKey, parlamentar.id>  (one findMany, ~513 rows)
   → camara.fetchDespesas(2025)
        fetch ZIP (8.7MB) → unzipper → stream-json pick 'dados'
        → per record: normalize money/date → matchKey → batch[1000]
   → script: Map lookup → rows with parlamentarId (unmatched++ logged)
   → prisma.$executeRaw INSERT … ON CONFLICT (id_externo) DO UPDATE  (×N chunks)
   → after year completes: deleteMany({casa:'CAMARA', ano:{lt: limiar}})   ← retention
   → stats banner (inseridos/atualizados/unmatched) → guardrail step (count>0, unmatched rate < threshold)
   → (04:00 UTC) sync-senado.yml same shape, direct codSenador map, adm API JSON
```

Direction: **source → adapter (normalize) → script (resolve+persist) → Postgres**. One-way; no read-path component ever points back at a government API.

### Read path (profile tab "Gastos")

```
Browser → GET /parlamentares/[id]/despesas
   server page.tsx: prisma.parlamentar.findUnique → header + <DespesasTab>   (shell only)
DespesasTab ('use client')
   → fetch('/api/parlamentares/[id]/despesas?ano=2025&page=1', {cache:'no-store'})
   → route.ts: zod safeParse → 400 | parlamentar check → 404
   → prisma.despesa.findMany({where:{parlamentarId, ano}, skip/take, orderBy data desc})
   → prisma.despesa.groupBy({by:['categoria'], where:{...}, _sum:{valorLiquid}, _count})
   → src/lib/despesas.ts pure compute (total, % participação, formatação)
   → JSON envelope { data, total, page, totalPages, perPage, resumo, anos }
   → tab renders: year selector · category bars · paginated rows
        row: data · categoria · fornecedor · valor
             ├─ link urlDocumento (comprovante PDF)  — only when source provides it
             └─ link "dado oficial" (source endpoint/page)
```

Direction: **Postgres → route → client tab**; the server shell does one direct Prisma read (existing convention), the interactive data goes through the JSON API (existing convention).

### Component boundaries (who may talk to whom)

| From \ To | Adapter | Script | Prisma | API route | Client tab |
|-----------|---------|--------|--------|-----------|------------|
| Bulk/API source | ✓ (only via `fetch`, outside rate-limit queue) | — | — | — | — |
| Adapter | — | emits `DespesaNormalizada` (async iterable, **no DB**) | ✗ | ✗ | ✗ |
| Script | ✓ | — | ✓ (only writer) | ✗ | ✗ |
| API route | ✗ | ✗ | ✓ (read-only) | — | serves |
| Client tab | ✗ | ✗ | ✗ | ✓ (its own route) | — |
| Server page shell | ✗ | ✗ | ✓ (parlamentar lookup only) | — | renders |

---

## Scaling Considerations

| Scale | Behavior / adjustment |
|-------|----------------------|
| Initial backfill (~670k rows: Câmara ≈209k/yr ×3 + Senado ≈24k/yr ×3; ≈+160 MB → 84+160 ≈ **244 of 500 MB** free tier) | Chunked upsert ≈670 statements ×1000 → minutes; do it per `--ano` run so a bulk outage only stalls one year; Neon cold-start handled by existing `connect_timeout/pool_timeout` workflow env |
| Daily incremental (~few thousand new/corrected rows) | Same pipeline, near-zero DB churn (ON CONFLICT updates only diffs); parse dominates runtime — still < 5 min/house |
| Retention rollover (January: ~230k-row DELETE) | Indexed `(casa, ano)` single statement, seconds; fallback → chunked 10k/txn loop |
| First bottleneck | **Not users** — it's the 225 MB parse and the 500 MB storage cap. Parse: streaming (Pattern 2). Storage: A-enxuta granularity already chosen (document-level ≈160 MB) + 3-year retention; if it grows, drop `detalhe` (Senado free text) or shorten window — *not* aggregate precompute (out of scope) |
| Second bottleneck | `groupBy` resumo per request if rankings/multi-parlamentar aggregation is ever added — then introduce read-time caching or materialized view (explicitly deferred by PROJECT.md) |

---

## Anti-Patterns

### 1. `JSON.parse` of the 225 MB expanded Câmara file
**Why wrong:** multi-GB object graph in a 7 GB runner at 03:00 UTC with no operator; GC pauses plus unzipped buffer ≈ OOM lottery.
**Instead:** Pattern 2 streaming pipeline (`unzipper` + `stream-json`), batch-emitting 1000 records at a time.

### 2. Per-record `findUnique`/`upsert` in a loop (copying the existing votos/discursos style)
**Why wrong:** 670k×2 queries per backfill; the existing phases got away with it because they iterate *per parlamentar* (513), despesas iterate *per document* (670k).
**Instead:** preload one `Map` (match key → `parlamentar.id`) + 1000-row raw upsert chunks.

### 3. Inventing name matches / silent drops
**Why wrong:** PROJECT.md Key Decision — never fabricate correspondence; a wrong match puts one MP's receipts on another's profile (integrity failure in a transparency product).
**Instead:** `camara-name-match.ts` returns null when name+party+UF don't resolve; script logs `unmatched` count and sample names; workflow **guardrail fails the job** if unmatched rate exceeds a threshold (>5% or count = 0).

### 4. `Float` / JS `number` for money
**Why wrong:** `valorLiquido` arrives as string `"1467"`; float rounding corrupts sums shown to citizens (and violates SQL money conventions).
**Instead:** `Decimal @db.Decimal(12,2)` in Prisma; parse with explicit rounding in the adapter; serialize in the API.

### 5. Running the despesas steps *before* the existing sync phases/guardrails
**Why wrong:** GH Actions stops at the first failed step — a bulk-file outage would block votações/discursos ingestion and their guardrails (the constraint says the bulk "pode falhar/estar indisponível").
**Instead:** trailing steps, after all existing phases and guardrails; re-run via `workflow_dispatch` with `apenas-despesas`.

### 6. Fetching expenses from government APIs in the read path / building aggregate tables
**Why wrong:** violates the CONTEXT.md invariant (read path = own Postgres only) and PROJECT.md puts precomputed aggregates out of scope.
**Instead:** Pattern 6 compute-on-read from indexed document rows.

---

## Integration Points

### External Services

| Service | Integration pattern | Verified facts / gotchas |
|---------|--------------------|--------------------------|
| Câmara `cotas/Ano-{ano}.json.zip` | plain `fetch` → buffer → `unzipper` (bypasses `HttpClient` rate queue — precedent: presenca HTML scrape at `camara-adapter.ts:547`; single request, 120 req/min not a concern) | 8.75 MB ZIP (2025), daily `Last-Modified` ~06:29 GMT, `ETag`+`accept-ranges` (conditional GET possible later); JSON wrapper is `{ "dados": [ … ] }` **not** a bare array; `valor*` are strings; `numeroDeputadoID` ≠ dadosabertos id; `idDocumento` is a global sequence (unique) |
| Senado `adm…/despesas_ceaps/{ano}` | plain `fetch` (or `senadoClient`) → `res.json()`; one request per year | Flat `DespesaCeapsDto[]`, 10.05 MB (2025), no pagination, `s-maxage=57600`, daily; `codSenador` = `idExterno`; **no receipt URL field in JSON or CSV** |
| GitHub Actions | extend existing workflows (no new workflow → cron dispatcher route untouched) | Retry loops & Neon cold-start migrate retry already in place; add `apenas-despesas` input mirroring the string-"true" comparison bugfix already applied |

### Internal Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|----------------|
| adapter ↔ script | async generator of `DespesaNormalizada[]` batches | adapter must never import Prisma (existing invariant) |
| script ↔ schema | raw SQL upsert + Prisma `deleteMany` | migration must land before first despesas run (`prisma migrate deploy` already runs in every workflow) |
| route ↔ `src/lib/despesas.ts` | pure function calls | Jest coverage without DB, mirroring `dashboard.ts` |
| tab ↔ API | `fetch` + `cache:'no-store'` + AbortController, skeleton/error states | identical to `DashboardTab`/`ProposicoesTab` conventions |
| header ↔ tab route | `SecaoId` union + `secoes` + `coresSecao` registration | forgetting this = tab exists but is invisible in nav |

---

## Build Order (phase-structure input for the roadmap)

```
(1) SCHEMA — prisma/schema.prisma: model Despesa + indexes + migration
        │  blocks everything below; API can be coded against it immediately
        ▼
(2) CONTRACTS & ADAPTERS (parallel-safe)
    types.ts DespesaNormalizada · camara-name-match.ts + tests ·
    bulk-download.ts · fetchDespesas() in both adapters + tests
        │
        ▼
(3) INGESTION — script phases + raw upsert helper + retention delete +
    workflow steps/inputs + guardrails   ←── needs (1)+(2); produces the data;
    run backfill (manual workflow_dispatch per ano) validates match rates
        │
        ▼
(4) API ROUTE — GET /api/parlamentares/[id]/despesas + src/lib/despesas.ts + tests
    needs (1); can be built in parallel with (3), verified against backfilled rows
        │
        ▼
(5) UI — despesas/page.tsx · DespesasTab.tsx · ParlamentarHeader registration
    needs (4); (4) and (2) never block each other
```

- **Hard dependencies:** (1)→(3), (1)→(4), (4)→(5), (2)→(3).
- **Parallel opportunities:** (2)∥(4) after (1); UI copy work can start from route contract before data lands.
- **Data-first option:** if the team prefers, (3) can ship before (4)/(5) — a phase flag + workflow steps deliver GAST-04/GAST-05 with zero user-visible surface, letting the backfill surface mapping problems early (fail fast on unmatched rates before UI is built).
- **Verification gate each phase:** `npx tsc --noEmit && npx next lint && npx jest && npx next build` (PROJECT.md constraint); deps `unzipper`/`stream-json` (+types) must be added in phase (2) and pass the same gate.

---

## Open Questions (flag for phase-level research)

1. **GAST-03 vs Senado:** CEAPS exposes **no** `urlDocumento` (verified JSON+CSV). Options: (a) render comprovante link only when the field exists (Câmara) and always render "dado oficial" for both; (b) locate a per-document Senado transparency URL (needs its own research); (c) product decision to show Senado "dado oficial" only. **UI/route design must tolerate `urlDocumento = null`.**
2. **Name-match success rate:** unknown until the first Câmara backfill — the guardrail threshold (suggested: fail if unmatched >5% or zero rows) needs tuning against real data.
3. **`detalhe` (Senado `detalhamento`) storage:** free-text up to ~1 KB × ~71k rows ≈ tens of MB — store, truncate, or drop? Budget says store only if the UI shows it.
4. **`idExterno` namespacing:** Câmara `idDocumento` (7-digit) and Senado `id` (7-digit) sequences can theoretically collide in a globally-unique column → prefix (`"CAMARA:7877589"`) or `@@unique([casa, idExterno])`. Decide at schema time (migration cost later).
5. **Year loop hard-coding** (`2024 2025 2026` in workflows) — pre-existing maintenance debt that the retention threshold (`currentYear - 2`) will eventually contradict in January 2027; keep both driven by one constant when touching the workflows.

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| Câmara ZIP size, daily freshness, `{dados:[...]}` wrapper, full field list, string money values, `numeroDeputadoID` namespace, `urlDocumento` PDF pattern | **First-hand probes 2026-10-09:** `curl -I`, range download + `funzip` of `https://www.camara.leg.br/cotas/Ano-2025.json.zip` | HIGH (primary source, verified in-session) |
| Senado CEAPS endpoint, flat DTO shape, field list, no receipt URL, cache headers, CSV parity, `codSenador` | **First-hand 2026-10-09:** `GET …/v3/api-docs` OpenAPI 3.1 + live JSON/CSV requests | HIGH (primary source, verified in-session) |
| `stream-json` `pick`+`streamArray` constant-memory pattern; `unzipper` streaming/autodrain semantics | Official npm package docs (npmjs.com/stream-json, npmjs.com/unzipper) | MEDIUM (verified official docs via search seam) |
| Prisma `createMany`/`skipDuplicates` semantics, no `upsertMany` (#4134/#5437), batch-of-1000 guidance, database-upsert criteria | Official prisma.io docs (CRUD, query optimization) | MEDIUM (verified official docs) |
| Retention delete: index-scan deletes fine ≤~230k rows; chunked transactions to bound locks; bloat/autovacuum considerations | pgsql-performance/pgsql-admin mailing lists, DBA StackExchange, SO (community) | MEDIUM (convergent community guidance, adapted to our scale) |
| Existing architecture facts (phase gating, workflow layout, tab recipe, invariants) | `.planning/codebase/{ARCHITECTURE,STRUCTURE,INTEGRATIONS}.md`, `scripts/sync-*.ts`, `.github/workflows/sync-*.yml`, `prisma/schema.prisma` | HIGH (in-repo, read directly) |

---
*Architecture research for: como-votei — módulo de despesas (GAST-01..06)*
*Researched: 2026-10-09*
