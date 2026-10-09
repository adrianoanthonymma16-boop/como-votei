# Stack Research

**Domain:** Bulk government open-data ingestion + serving (Brazilian parliamentary expenses) for an existing Next.js 14 / Prisma / Neon app
**Researched:** 2026-10-09
**Confidence:** HIGH (versions & source formats verified against npm registry and live government endpoints) / MEDIUM (library-choice patterns per source hierarchy)

## Context (why this stack, not a new one)

Brownfield app in production: Next.js 14.2 App Router + TypeScript ~5.4 + Prisma ^5.12 + Vercel Postgres (Neon free) + Tailwind, synced by GitHub Actions (`sync-camara.yml` 03:00 UTC, `sync-senado.yml` 04:00 UTC) running `ts-node --compiler-options '{"module":"CommonJS"}' scripts/*.ts`. **No stack changes are permitted** — everything below slots into this established toolchain. Two constraints shape every choice: 100% free tier (Neon 0.5 GB storage, Vercel Hobby, GH Actions free minutes) and the existing CommonJS ts-node script runner.

Both expense sources were downloaded and inspected directly today (2026-10-09) — sizes and schemas below are measured, not estimated:

| Source | Endpoint | Size | Shape |
|---------|----------|------|-------|
| Câmara CEAP bulk | `https://www.camara.leg.br/cotas/Ano-2025.json.zip` | 8.75 MB zip → **225 MB JSON**, daily-updated, HTTP Range OK | `{ "dados": [ ... ] }`, single entry `Ano-2025.json`; money fields `valorDocumento`/`valorGlosa`/`valorLiquido` are **strings**; receipt `urlDocumento` present per record |
| Senado CEAPS | `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}` | **10 MB** JSON, no key | bare top-level **array**; `valorReembolsado` is a **number** (float); `codSenador` matches existing `idExterno` |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **GitHub Actions job** (existing `sync-*.yml` pattern) | — (runner: Node 20) | Hosts the entire ingestion: download → unzip → stream-parse → upsert → retention purge | Verified official limits: 360 min hard cap (workflow already sets `timeout-minutes: 360`), 2,000 free min/month on private repos (unlimited public), 500 MB artifact storage (irrelevant — we stream source→DB, no artifacts). Long-lived direct Neon connection avoids cold-start/`P1002` issues already handled in existing workflows. Runs without `VERCEL_TOKEN`. **Confidence: HIGH** |
| **`yauzl`** | `3.4.0` | Extract `Ano-{ano}.json` from the 8.75 MB ZIP to disk | npm registry verified 2026-10-09: CJS, `engines: node>=12`, actively maintained. Design principles (official README): never buffer entire files in RAM, `lazyEntries` processes one entry at a time, reads central directory (spec-correct — the ZIP central directory lives at the end of the file, so true streaming unzip is *incorrect* by design). Correctness > cleverness for a daily production job. **Confidence: HIGH** (registry + official README) |
| **`stream-json`** | **`2.1.0` (pin 2.x — NOT 3.x)** | Incremental parse of the 225 MB `{dados:[...]}` JSON, emitting one record at a time in constant memory | Official npm page: v3.7.0 (published 20 days ago, 8.2M weekly downloads) supports `createReadStream → parser() → pick({filter:'dados'}) → streamArray()` for documents far larger than RAM. **But v3.x is `type: module` / ESM-only (no `require` export)** — it breaks the project's mandatory `ts-node --compiler-options '{"module":"CommonJS"}'` runner (verified via `npm view` exports: 2.1.0 is `type: commonjs`, dep `stream-chain ^3.6.1`; 3.7.0 has no CJS entry). v2.1.0 is the last CommonJS line — stable, same `pick`/`streamArray` pipeline. ~225 MB would *probably* survive `JSON.parse` in a 7 GB runner, but streaming keeps memory flat (~tens of MB) and enables batch-as-you-go inserts. **Confidence: HIGH** (module formats verified from registry) |
| **Prisma `Decimal @db.Decimal(14,2)`** | (ships with existing `@prisma/client` ^5.12) | Money-safe storage of `valorLiquido` / `valorReembolsado` | Maps to Postgres `numeric(14,2)` — exact base-10 precision, decimal.js-backed client type. Postgres official docs: *"Floating point numbers should not be used to handle money due to the potential for rounding errors"*; the `money` type is deprecated. Prisma `Float` is proven-lossy (issue #2903: `0.69` → `0.6900000000000001`). No new dependency needed. Feed values as **strings** (`new Prisma.Decimal(str)`), never as JS `number` literals. **Confidence: HIGH** (official Postgres + Prisma docs) |
| **Batched raw `INSERT … ON CONFLICT (…) DO UPDATE`** via `prisma.$executeRaw` with `$1` placeholders | existing Prisma 5.12 | Idempotent upsert of 209k+ rows/year | Prisma has **no `upsertMany`**. `createMany({skipDuplicates:true})` compiles to `ON CONFLICT DO NOTHING` (official docs) — idempotent for inserts but never applies daily-file corrections to amounts/labels, which matters for a transparency product. Single-row `upsert()` is DB-native since 4.6.0 but pays SELECT/INSERT/SELECT overhead per row (GitHub #4246) — too slow ×209k. Raw batched upsert is the standard escape hatch and matches existing conventions (`$queryRawUnsafe` with `$1` already used in `src/lib/parlamentar-anos.ts`). **Batch size 500 rows** — Postgres wire cap is 65,535 bind params (GitHub #25508); ~20 cols × 500 = ~10k params, also avoids documented `createMany` memory blowups (#26805, #9772). **Confidence: MEDIUM** (websearch, official-verified ⇒ MEDIUM) |
| **Indexed offset pagination** (`skip`/`take`, existing `parsePaginacao` pattern) | existing code | `GET /api/parlamentares/[id]/despesas` (GAST-06) | Per parlamentar×year the result set is hundreds to low-thousands of rows (209k ÷ ~513 deputies ≈ 407 avg/year) — deep pages are unreachable, so offset cost is negligible and it keeps API consistency with all existing routes. Requires composite index `@@index([parlamentarId, ano, dataEmissao])`. Keyset/cursor deferred: note Prisma's `cursor` has generated subquery+OFFSET historically (GitHub #11138), so it wouldn't even be faster without raw SQL — revisit only if an unfiltered global feed is added. **Confidence: MEDIUM** |
| **Batched `DELETE` + autovacuum** (inside the same sync job) | existing Prisma / managed Neon | 3-year retention purge (GAST-05) | Postgres official docs: `DELETE` marks rows dead; plain `VACUUM`/autovacuum reclaims concurrently; `VACUUM FULL` takes ACCESS EXCLUSIVE lock — never schedule it. Pattern: `DELETE FROM despesa WHERE id IN (SELECT id FROM despesa WHERE ano < :corte LIMIT 5000)` in a loop (short transactions, no lock spikes), run **after** successful upsert. Neon (managed) runs autovacuum itself — no manual vacuum job needed. Load-bearing: Neon free **fails writes** once storage exceeds 0.5 GB, so the purge must actually free space. **Confidence: MEDIUM** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unzipper` | `0.12.5` | Alternative ZIP reader (`unzipper.Open.file()` central-directory mode) | Only if `yauzl`'s callback API proves awkward; CJS-compatible. **Avoid its streaming `Parse()` mode** for this job — community analysis (dev.to, 2025-05) shows streamed ZIP parsers can silently mis-read malformed entries. **Confidence: MEDIUM** |
| `csv-parse` | `7.0.3` | Streaming CSV parser (Node `stream.Transform`, zero deps, dual ESM/CJS) | Only if the pipeline ever switches to the CSV flavor of the Câmara bulk (`Ano-{ano}.csv.zip`); primary plan is JSON. Not needed for MVP of this feature. **Confidence: HIGH** (official npm page) |
| `zod` | existing `^3.23.0` | Validate `ano`, `page`, `perPage` query params on the new despesas route | Use existing convention (`safeParse` → 400). **Do not upgrade to zod 4.x** in this feature — out of scope stack churn. **Confidence: HIGH** |
| Existing `src/lib/sync/http-client.ts` | — | Retry/backoff/timeout policy (`429`+`Retry-After`, 3 retries, `AbortController`) | Reuse its policy for downloading the bulk ZIP (write to disk via stream). The file is only 8.75 MB; no Range/resume logic needed. **Confidence: HIGH** |
| `date-fns` | existing `^3.6.0` (declared, unused) | Nothing | **Do not introduce** — date parsing uses ISO 8601 strings (`dataEmissao: "2025-02-07T00:00:00"`, Senado `"2025-06-10"`), both handled by native `Date`/`Intl` per existing conventions. **Confidence: MEDIUM** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `ts-node --compiler-options '{"module":"CommonJS"}'` | Runs `scripts/sync-despesas.ts` (new) | Keep exactly — pinning `stream-json@2.1.0` exists precisely to preserve this. Add npm script mirroring `sync:camara`. |
| `npx prisma migrate dev` (local) / `migrate deploy` (build) | Adds `Despesa` model + indexes | Money column must be `Decimal @db.Decimal(14,2)`; unique key `@@unique([fonte, idExterno])` (`idDocumento` for Câmara, `id` for Senado) is the ON CONFLICT target. |
| `npx tsc --noEmit`, `npx next lint`, `npx jest`, `npx next build` | Existing verification gates | Unchanged; new ingest logic gets unit tests under `src/lib/__tests__/` (pure adapters, per conventions). |

## Installation

```bash
# Core ingestion deps (only 2 new packages)
npm install yauzl@3.4.0
npm install stream-json@2.1.0   # PIN 2.x — 3.x is ESM-only and breaks the CommonJS ts-node runner

# Dev types (yauzl ships no built-in types)
npm install -D @types/yauzl

# Optional — only if the CSV flavor of the bulk is ever adopted
# npm install csv-parse@7.0.3
```

Nothing else. No new runtime services, no new infra.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `stream-json@2.1.0` (CJS pin) | `stream-json@3.7.0` + switch new script to ESM (`tsx` runner) | If the team adopts ESM scripts repo-wide later — 3.x is actively maintained, gets perf/security fixes (e.g. 3.6.0 proto-pollution fix). Costs a toolchain deviation from existing conventions. |
| `stream-json@2.1.0` | `JSON.parse` of the decompressed 225 MB string | Acceptable short-term: GH runners have 7 GB RAM and Node can heap ~2 GB+. Rejected as the *plan* because it couples ingestion success to runner memory and prevents insert-as-you-stream (all-or-nothing parse before first insert). |
| `yauzl@3.4.0` (central-directory, seekable file) | `unzipper` streaming `Parse()` | Only if the ZIP must be read straight from the network socket without touching disk — not our case (8.75 MB → temp file first). |
| Batched raw `INSERT … ON CONFLICT DO UPDATE` | `createMany({skipDuplicates:true})` | Use when the source is append-only and corrections don't matter. Not the case: the Câmara file is re-published **daily** with changed values. |
| Batched raw upsert | Per-row `prisma.upsert()` | Never for >10k rows; 3–4 statements per row × 209k ≈ hours. Fine for tiny backfills (existing scripts already do this for votes). |
| Indexed offset pagination | Keyset/cursor pagination | Keyset when serving an unfiltered global feed with deep/infinite scroll over millions of rows. Current endpoint is parlamentar-scoped and year-filtered — offset wins on simplicity + API consistency. |
| GH Actions ingestion (existing pattern) | Vercel Cron → Route Handler doing the ingest | Never: serverless functions are time/memory-capped (existing cron route already sets `maxDuration: 30`), would need `VERCEL_TOKEN` (absent), and re-download+parse of 225 MB per run burns Neon CU-hours from cold starts. GH Actions already runs the other two syncs. |
| GH Actions ingestion | Vercel Cron merely `workflow_dispatch`ing GH Actions (existing `sync-incremental` pattern) | Keep this variant if you want Vercel-side scheduling/observability — it only adds a dispatch, the heavy work still runs on the runner. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`adm-zip`** (0.6.1) | In-memory-oriented API (README: decompress/compress "in memory buffers", `zip.toBuffer()`); no streaming entry reads — a 225 MB entry means large allocations and no insert-as-you-stream | `yauzl` (lazy entries, streamed entry reads) |
| **`node-stream-zip`** (1.16.0) | Viable (chunked reads, 0 deps, published 2026-07-22 — **not stale**), but smaller ecosystem than yauzl and an all-or-nothing `entryData()` style for whole entries | `yauzl` (active, 3.4.0; lazyEntries one-entry-at-a-time). *Acceptable swap: node-stream-zip ships its own TS types (skips `@types/yauzl`).* |
| **Heavy ETL frameworks** (Airbyte, Prefect, Dagster, dbt, NiFi, Kafka) | Server(s) or containers to host — violate the 100% free-tier constraint; ingestion is a single-file→single-table daily job, not a data platform | A `scripts/sync-despesas.ts` CLI run by GH Actions, mirroring `sync-camara.ts` |
| **`stream-json@3.x`** | ESM-only (`type: module`) — `require()` fails under the mandated `ts-node … '{"module":"CommonJS"}'` runner | `stream-json@2.1.0` |
| **Prisma `Float` / JS `number` for money** | Documented precision loss (`0.69` → `0.6900000000000001`, Prisma #2903); Postgres official docs forbid floats for currency | `Decimal @db.Decimal(14,2)`, values passed as strings |
| **Postgres `money` type** | Deprecated; locale (`lc_monetary`) dependent output breaks cross-region tooling | `numeric(14,2)` via Prisma `Decimal` |
| **Per-row `upsert()` for bulk** | 3–4 round-trips × 209k rows; days of runtime + CU-hour burn | 500-row batched raw `INSERT … ON CONFLICT DO UPDATE` |
| **`VACUUM FULL` / scheduled maintenance SQL** | Takes ACCESS EXCLUSIVE lock, rewrites table; Neon is managed and autovacuums itself | Batched `DELETE` + rely on autovacuum |
| **Storing receipt PDFs (`urlDocumento`) in the DB/ blob store** | Storage budget killer on Neon 0.5 GB; receipts are a link requirement (GAST-03), not an archive requirement | Persist `urlDocumento` string, link out to the official PDF |
| **Ingesting inside Vercel serverless functions** | Time/memory caps, no `VERCEL_TOKEN`, cold-start CU burn on Neon | GH Actions (existing pattern, 6 h cap) |
| **XLSX/ODS parsing or the XML flavor** | 225 MB XLSX would be heavier in memory; XML is larger and slower than JSON for the same records | JSON zip flavor (already chosen in PROJECT.md) |
| **Downloading the whole year every day into staging tables without purge** | Unbounded growth → hits Neon 0.5 GB write-block | Upsert + reconcile-delete + rolling 3-year purge in the same run |

## Stack Patterns by Variant

**If ingesting Câmara (8.75 MB zip → 225 MB JSON, ~209k rows/year):**
- `fetch` → temp file on runner disk → `yauzl` lazyEntries → extract JSON to disk → `stream-json@2.1.0` pipeline (`parser → pick('dados') → streamArray`) → normalize in an adapter → accumulate 500-row batches → raw `ON CONFLICT DO UPDATE` → after success: reconcile-delete (rows for that source/year not seen this run, via `importedAt < runStart` marker) then 3-year purge.
- Because: constant memory, resumable (re-run = same idempotent upserts), corrections applied daily.

**If ingesting Senado (10 MB bare JSON array):**
- Plain `fetch` + `JSON.parse` in one go — 10 MB is trivially small; `stream-json` would be over-engineering. Map `codSenador` → existing `idExterno` directly; `valorReembolsado` (number) → `new Prisma.Decimal(String(v))`.
- Because: match tool complexity to payload size; only Câmara *needs* streaming.

**If the sync must survive partial failure (bulk download fails mid-run):**
- Download with the existing `http-client.ts` retry policy (3 retries, backoff); upsert batches are individually committed (each `createMany`/raw batch auto-transacts) so a crash keeps prior batches — re-run converges because upserts are idempotent by natural key.
- Because: constraint says "bulk da Câmara pode falhar/estar indisponível — sync deve ser resiliente e retomável".

**If storage approaches the Neon 0.5 GB cap:**
- Purge runs first for out-of-window years, then upsert; monitor with existing stats route pattern. If still tight: drop the rarely-used `detalhamento`/`cpf` columns from Senado (keep receipt `urlDocumento` — it's a product requirement).
- Because: Neon fails writes (not data) at the cap — deletes must precede inserts.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `stream-json@2.1.0` | `stream-chain@^3.6.1` (auto-installed), Node 20, CJS ts-node | **Pinned** — do not `^`-range it or npm will pull 3.x (ESM-only, breaks `require`) |
| `stream-json@3.7.0` | ESM-only, `stream-chain@4.x` | Incompatible with current `ts-node module:CommonJS` scripts; revisit only with an ESM runner migration |
| `yauzl@3.4.0` | Node ≥12 (CI pins Node 20), CJS | Ships no bundled types → needs `@types/yauzl` |
| `csv-parse@7.0.3` | Dual ESM+CJS (`require` → `dist/cjs/index.cjs`) | Works in both script flavors if ever needed |
| `zod@^3.23.0` (existing) | All existing routes | Do not mix zod v3/v4 in one process |
| Prisma `Decimal` ↔ `numeric(14,2)` | Prisma 5.12 (existing) | Schema change goes through `prisma migrate`; build applies `migrate deploy` |
| All of the above | `@prisma/client@^5.12`, Next 14.2, Node 20, TS ~5.4 | No framework upgrades in this feature |

## Free-Tier Budget Fit

| Resource | Cost of this feature | Headroom |
|----------|----------------------|----------|
| Neon storage | +~160 MB (PROJECT.md estimate, granularity A) → 84+160 ≈ 244 / 500 MB | 3-year purge keeps it flat; write-block avoided |
| Neon compute | Ingest runs from GH Actions over one long-lived direct connection (minutes/day), not serverless cold starts | 100 CU-hours/month free is ample |
| GH Actions minutes | ~5–15 min/day × 2 runs ≈ well under 2,000 free min/month (unlimited if repo public) | Fits with existing syncs |
| GH Actions artifacts | 0 — source streamed job→DB, never uploaded | 500 MB untouched |
| Vercel | Read-only API/UI routes, same as today | Hobby limits unchanged |

## Sources

- https://www.npmjs.com/package/yauzl + `npm view yauzl@3.4.0` — version, engines, module format, design principles (HIGH — registry/official)
- https://www.npmjs.com/package/stream-json — v3.7.0 capabilities, `pick`/`streamArray` example, ESM migration notes; `npm view stream-json@{2.1.0,3.7.0} type exports` for CJS/ESM facts (HIGH — registry/official)
- https://www.npmjs.com/package/csv-parse — v7.0.3, dual distribution, feature list (HIGH — official)
- https://www.prisma.io/docs/orm/prisma-client/queries/crud — `createMany`/`skipDuplicates` → `ON CONFLICT DO NOTHING` (MEDIUM — official via websearch, verified⇒MEDIUM)
- https://www.prisma.io/docs/orm/reference/prisma-client-reference — database upserts `INSERT … ON CONFLICT` since 4.6.0, single-row only (MEDIUM)
- https://github.com/prisma/prisma/issues/25508, #26805, #9772, #4246, #2903, #11138 — parameter cap, createMany memory, upsert overhead, Float precision, cursor OFFSET gotcha (MEDIUM)
- https://www.prisma.io/docs/orm/prisma-client/queries/pagination — offset vs cursor trade-offs (MEDIUM — official)
- https://www.postgresql.org/docs/current/datatype-money.html — float-for-money warning, `money` type caveats (MEDIUM — official)
- https://www.postgresql.org/docs/current/routine-vacuuming.html — VACUUM/VACUUM FULL locking, autovacuum thresholds (MEDIUM — official)
- https://neon.com/faqs/free-plan-limits-and-quotas + https://neon.com/docs/introduction/plans — 0.5 GB cap behavior (write-block), 100 CU-hours, scale-to-zero, pooler (MEDIUM — official)
- https://docs.github.com/en/actions/reference/limits + billing docs — 360 min timeout, 2,000 min, 500 MB artifacts, 20-job concurrency (MEDIUM — official)
- `curl` HEAD/GET of `https://www.camara.leg.br/cotas/Ano-2025.json.zip` and `adm.senado.gov.br/.../despesas_ceaps/2025` + local inspection of both payloads (2026-10-09) — exact sizes, JSON shape, field names/types (HIGH — primary source)
- https://dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile — official bulk file contract: URL pattern, formats, daily update (HIGH — official)
- https://dev.to/pavel-zeman/the-pitfalls-of-streamed-zip-decompression-an-in-depth-analysis-3l99 (2025-05-12) — streamed-ZIP corruption analysis (MEDIUM — community, recent)

---
*Stack research for: como-votei — despesas/cota parlamentar ingestion & serving*
*Researched: 2026-10-09*
