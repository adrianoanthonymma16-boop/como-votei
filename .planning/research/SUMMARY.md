# Project Research Summary

**Project:** como-votei (Como Votei) — módulo de despesas parlamentares (tab "Gastos")
**Domain:** Legislative-transparency brownfield (Next.js 14 + Prisma + Neon free tier) adding parliamentary-expense (CEAP/CEAPS) ingestion, serving, and display
**Researched:** 2026-10-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

The "Gastos" feature adds parliamentary-expense tracking to the existing "Como Votei" profile page — a brownfield Next.js 14 / Prisma / Vercel Postgres (Neon) app already synced by GitHub Actions from Câmara and Senado open-data APIs. Experts in this domain (the official Câmara portal, comovotou.org, transparenciapolitica.app) converge on the same surface: an annual total, a category breakdown, a paginated document list with supplier and value, and a clickable receipt link. The product's differentiation is not the data — it is putting *how they spent* next to *how they voted* in one profile, across **both** houses normalized into one model, with an honest "Não disponível" state for missing receipts. No competitor covers both houses cleanly (transparenciapolitica.app visibly ships `Tipo = N/A` data-quality failures) and none crosses spending with voting.

The recommended approach is data-first and stays entirely inside the established free-tier toolchain — no stack changes, no new infra. Only two new runtime packages: `yauzl@3.4.0` (spec-correct ZIP streaming) and `stream-json@2.1.0` (**pinned to the last CommonJS line — 3.x is ESM-only and breaks the mandated `ts-node module:'CommonJS'` runner**). Ingestion runs as a trailing `--apenas-despesas` phase in the existing `sync-camara.yml` / `sync-senado.yml` workflows: stream the ~225 MB Câmara bulk JSON (never `JSON.parse`), normalize both houses to `DespesaNormalizada`, resolve parlamentars via a preloaded `Map` + exact normalized name match (never fuzzy), and persist with 500–1000-row raw `INSERT … ON CONFLICT DO UPDATE` batches keyed on a namespaced `idExterno`. Money is `Decimal(14,2)` fed as strings; 3-year retention is a batched `DELETE` that runs strictly *after* a successful ingest. The read path is compute-on-read (`groupBy` per request) — no aggregate tables, per PROJECT.md.

The dominant risks are all ingestion-side, and each has a concrete mitigation already identified in research: (1) OOM from materializing 225 MB — mitigated by the streaming pipeline; (2) silent duplicates *or* silently stale rows on daily re-import — mitigated by raw upsert on a verified natural key, not `createMany({skipDuplicates})`; (3) wrong-MP attribution from name matching — mitigated by exact normalized `name+UF` blocking with party as tie-breaker only, plus guardrails that fail the job on ambiguous matches; (4) storage blowup against Neon's 500 MB write-block — mitigated by modeling only product-shown columns, low-cardinality category normalization, and the retention purge. The single worst bug this module can ship is attributing one deputy's receipts to another — the "never invent a match" rule is load-bearing, not advisory.

## Key Findings

### Recommended Stack

No stack changes are permitted; everything slots into the existing Next.js 14.2 / TypeScript ~5.4 / Prisma ^5.12 / Neon free / Tailwind toolchain synced by GitHub Actions (`sync-camara.yml` 03:00 UTC, `sync-senado.yml` 04:00 UTC). Both expense sources were downloaded and inspected first-hand on 2026-10-09 — sizes and schemas are **measured, not estimated**: Câmara CEAP bulk is an 8.75 MB ZIP expanding to ~225 MB of `{ "dados": [...] }` JSON (~209k rows/year, money fields as strings, `urlDocumento` present per record, daily update); Senado CEAPS is a ~10 MB bare JSON array (~24k rows/year, `valorReembolsado` as number, `codSenador` = existing `idExterno`, **no receipt URL field**). Total ≈670k rows over 3 years → +~160 MB → ~244 of Neon's 500 MB free cap.

**Core technologies:**
- **GitHub Actions** (existing `sync-*.yml` pattern) — hosts download → unzip → stream-parse → upsert → purge; long-lived direct Neon connection, no `VERCEL_TOKEN`, 360-min hard cap already configured
- **`yauzl@3.4.0`** — ZIP extraction; CJS, actively maintained, spec-correct central-directory reads (true streaming unzip is *incorrect* by design). *(Note: ARCHITECTURE.md sketches use `unzipper.Parse()` — `yauzl` is the registry-verified primary recommendation; `unzipper@0.12.5` central-directory mode is an acceptable swap if the callback API proves awkward. Avoid `adm-zip`.)*
- **`stream-json@2.1.0` (pin 2.x — NOT 3.x)** — incremental parse of the 225 MB `{dados:[...]}` in constant memory; v3.x is ESM-only (`type: module`, no CJS entry) and breaks the CommonJS ts-node runner
- **Prisma `Decimal @db.Decimal(14,2)`** — money-safe storage (`numeric(14,2)`); Postgres docs forbid floats for currency; values fed as strings (`new Prisma.Decimal(str)`), never JS `number`
- **Batched raw `INSERT … ON CONFLICT (…) DO UPDATE`** (500–1000 rows) via `prisma.$executeRaw` — Prisma has no `upsertMany`; `createMany({skipDuplicates})` compiles to `ON CONFLICT DO NOTHING` and never applies daily-file corrections
- **Indexed offset pagination** (`skip`/`take`, existing `parsePaginacao`) — parlamentar×year sets are hundreds-to-low-thousands of rows; keeps API consistency
- **Batched `DELETE` + autovacuum** — 3-year retention; plain autovacuum reclaims concurrently; never `VACUUM FULL` (ACCESS EXCLUSIVE lock)

Only two new runtime packages + `@types/yauzl` (dev). **Do NOT use:** `adm-zip` (in-memory), `stream-json@3.x` (ESM), heavy ETL frameworks (Airbyte/Prefect/etc. — violate free tier), Prisma `Float` for money, Postgres `money` type, per-row `upsert()` for bulk, `VACUUM FULL`, storing receipt PDFs, or ingesting inside Vercel serverless (2 GB / 300 s caps).

### Expected Features

MVP maps 1:1 to GAST-01..06. The competitive set all deliver annual total, category breakdown, document list, and receipt link — but none cross *spending* with *voting* in one profile, and none cover both houses normalized. (The briefing's *Congresso em Foco* / *Quem Patrocina* are **not** expense trackers — the real comparables are comovotou.org, transparenciapolitica.app, and the official portals.)

**Must have (table stakes / P1):**
- Total anual de gastos + seletor de ano (reuses the existing year filter) — the first question every user asks
- Breakdown por categoria (barras **+ tabela equivalente** for accessibility) — "gastou com o quê?"; top 6 + "Outros", never a 19-slice pie
- Lista paginada de documentos (data, categoria, fornecedor, valor) — the prestação de contas; 20/pág via existing `parsePaginacao`
- Link do comprovante (`urlDocumento` → PDF, new tab, `rel="noopener"`) + estado **"Não disponível"** — verifiability is the Core Value, and the receipt genuinely doesn't exist for every document
- Link para o dado oficial da fonte por documento — audit trail is what separates aggregator from blog
- `GET /api/parlamentares/[id]/despesas?ano=&pagina=` route (zod + `force-dynamic` + pagination envelope)
- Sync das duas casas com upsert idempotente + retenção de 3 anos — silent sync failure = misleading "0 gastos" (bug already lived in Votações, `660f01f`)
- Nota de limitações do dado junto do dado + estados loading/vazio/erro — distinguish "não gastou" × "documento no prazo de 90 dias" × "sync não rodou"

**Should have (differentiators / P2):**
- Despesas integradas ao perfil, ao lado de Votações/Discursos/Presença — the product thesis; low UI cost (tab shell already exists)
- Câmara + Senado normalizadas no mesmo modelo — nobody else does both with consistent labels
- Evolução mensal (12 barras) — same `groupBy`, ~zero marginal cost
- Top fornecedores do ano — where journalistic findings surface ("R$ 72 mil para uma pessoa física")
- Filtro por categoria na lista

**Defer / out of scope:**
- Ranking / comparação entre parlamentares (% vs partido/UF) — explicit PROJECT.md Out of Scope; needs own ADR de metodologia
- Agregados pré-computados (ano×categoria) — compute-on-read until profiling proves otherwise
- Espelhar/baixar PDFs de comprovante — storage-budget killer; preserve link + metadata + capture date instead
- Verba de gabinete, salário, "custo total do mandato" — different sources, separate milestone
- Download CSV (P3 — as a job, not on-request), LLM sumarização, dashboards avançados, gauges/velocímetros

### Architecture Approach

One-way data flow: source → adapter (normalize, **DB-free**) → script (resolve + persist, **only writer**) → Postgres → route (read-only) → client tab. Adapters never import Prisma (existing invariant); the read path never hits government APIs (CONTEXT.md invariant). Ingestion integrates as a trailing flag-based phase (`--apenas-despesas`) after all existing sync steps *and* guardrails, so a bulk outage cannot block votações/discursos. The UI registers `despesas` in `ParlamentarHeader`'s `SecaoId` / `secoes` / `coresSecao`.

**Major components:**
1. **`src/lib/sync/bulk-download.ts`** — download 8.7 MB ZIP → `yauzl` lazyEntries → `stream-json` `parser → pick('dados') → streamArray`; constant memory, one record at a time (kept separate from the 618-line camara-adapter to avoid bloat)
2. **Câmara & Senado adapters** (`fetchDespesas(ano)`) — emit `AsyncGenerator<DespesaNormalizada[]>` batches; parse string money / ISO dates; never touch DB
3. **`src/lib/sync/camara-name-match.ts`** — pure normalized `nome+partido+UF` → match key; **returns null on ambiguity** (never invents); unit-tested for accents, casing, party/UF mismatch
4. **Sync phase in `scripts/sync-{camara,senado}.ts`** — preload one `Map` (matchKey|idExterno → parlamentar.id, ~513 rows) instead of per-record `findUnique`; chunked raw upsert; retention DELETE; stats + unmatched log; advisory lock
5. **Prisma `Despesa` model** — document-level row with `urlDocumento`, namespaced `@@unique` idExterno, `@@index([parlamentarId, ano, data])`, `@@index([casa, ano])`
6. **`GET /api/parlamentares/[id]/despesas` + `src/lib/despesas.ts`** — zod → count/page → `groupBy` resumo → pure compute (Jest-covered, mirrors `dashboard.ts`) → JSON envelope
7. **`DespesasTab.tsx` + `despesas/page.tsx`** — year selector, category bars, paginated list, receipt/source links, skeleton/error states

Key patterns: streaming bulk parse (never materialize 225 MB); idempotent raw upsert (not `createMany` — daily corrections must land); name-match at the boundary (Senado direct `codSenador`, Câmara exact normalized match); retention strictly after successful ingest; compute-on-read, no aggregate tables.

### Critical Pitfalls

1. **`JSON.parse` on the 225 MB payload — the classic OOM** — a 225 MB string plus 3–10× V8 object graph = 600 MB–2.2 GB live heap; even the 7 GB GH runner can OOM when also holding buffers and Prisma's write queue. *Avoid:* stream (`yauzl` + `stream-json`), batch inside the handler, keep ingest out of Vercel entirely, log `heapUsed` and fail past ~1.2 GB. Warning sign: exit code 137 / `--max-old-space-size` appearing as a "fix."
2. **Money as `Float` / JS `number`** — rounding drift across 670k rows; totals differ between screens; `R$ 12.349999999999999` leaks to a transparency product; `parseFloat("1.234,56")` silently understates 1000×. *Avoid:* `Decimal @db.Decimal(14,2)`, defensive `parseBRL` (never `parseFloat` from external data), serialize once at the route boundary, format with `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`, keep values **signed** (estornos are negative).
3. **Non-idempotent re-import — duplicates *and* silently stale rows** — the bulk is a *daily full-year snapshot*, not append-only; a missing/wrong natural key triples the table in a week, and `createMany({skipDuplicates})` (= `ON CONFLICT DO NOTHING`) never applies upstream corrections (the app then publishes a retracted figure). *Avoid:* verify natural key with a **zero-collision test on a real full-year fixture** (`numDocumento` alone is NOT unique — original + estorno share it), declare `@@unique`, use raw `ON CONFLICT DO UPDATE`, commit per `(casa, ano)`, store `imported_at`.
4. **Wrong-MP name match — attributing one deputy's expenses to another** — the single worst bug for a product whose Core Value is verifiability. Party changes mid-mandate cause false negatives (quietly short totals); loosening to fuzzy matching causes false positives (wrong person's money). *Avoid:* block on stable attributes only (normalized full name + UF), party as tie-breaker *never* a required predicate, **exact match only (no Levenshtein, ever)**, guardrails fail the job on `ambiguous > 0` or `unmatched > ~1–5%`, store `nomeParlamentar_raw` for audit. A suspiciously perfect 100% match rate means the key is too permissive.
5. **Retention races + the year-boundary fight** — the hardcoded `2024 2025 2026` loop vs `ano < currentYear-2` cutoff will churn at every January rollover; a single-statement 209k-row delete spikes locks; `DELETE` doesn't return pages to the OS (Neon counts dead tuples against 500 MB). *Avoid:* one shared `ANOS_JANELA` constant driving both loop and cutoff, retention strictly *after* successful ingest, batched deletes (~10k/txn), `pg_advisory_lock` against concurrent import.
6. **Concurrent imports (pre-existing duplicate-trigger bug)** — Câmara sync already runs twice concurrently at 03:00 UTC (Vercel cron `sync-incremental` + GH `schedule`); harmless for idempotent upserts, **destructive** once delete-then-insert exists. *Avoid:* advisory lock at start of import/retention; fix the duplicate trigger in the same milestone.
7. **Bulk availability & schema drift** — truncated ZIPs and HTML error pages behind HTTP 200, mid-write snapshots, renamed fields turning into "this deputy spent nothing" via `catch { return [] }`. *Avoid:* validate status + `Content-Type` + `PK\x03\x04` magic + `unzip -t` + entry count before parsing; row-count / `SUM(valorLiquido)` sanity gates (±20% / ±5%); zod-parse first N + every 10k-th record; **never widen a `catch`** in the despesa path — throw and let the guardrail fail the job.
8. **GitHub Actions limits** — 360-min hard ceiling (already at max), 2,000 min/month private (unlimited public), 500 MB artifact cap, 14 GB disk. *Avoid:* stream-and-discard the ZIP (never artifact it), schedule = current-year-only (full 3-year backfill via `workflow_dispatch`), per-step `timeout-minutes` below the job ceiling, and **check repo visibility** — it changes the whole minutes calculus.

## Implications for Roadmap

Based on research, suggested phase structure — data-first, mirroring ARCHITECTURE's build order and PITFALLS' Phase A→B→C ownership:

### Phase 1: Schema & Contracts
**Rationale:** Schema, natural key, name-mapping, and types are cheap now and expensive later — they force re-imports and table rewrites once data lands. Everything downstream can be coded against a frozen contract. PITFALLS assigns 9 of 12 pitfalls to this foundation.
**Delivers:** Prisma `Despesa` model + migration (`Decimal(14,2)`, namespaced `@@unique` idExterno, `(parlamentarId, ano, data)` + `(casa, ano)` indexes); `DespesaNormalizada` type; `camara-name-match.ts` (pure, unit-tested); shared `ANOS_JANELA` constant; defensive `parseBRL` + per-source date-normalization helpers; adapter `fetchDespesas()` skeletons + fixture tests.
**Addresses:** Pitfalls 2 (money), 4 (name-match contract), 5 (year constant), 10 (storage — model only product-shown columns), 11 (dates).
**Verification gate:** `npx tsc --noEmit && npx next lint && npx jest && npx next build` (PROJECT.md constraint, every phase).

### Phase 2: Ingestion & Sync (GAST-04 + GAST-05)
**Rationale:** No data = no feature. Shipping ingestion before API/UI lets the backfill surface name-matching and schema problems early (fail fast on unmatched rates before any UI investment). GAST-05 retention must ship in the **same** phase as GAST-04 — retrofitting cleanup after first load becomes a destructive migration.
**Delivers:** `bulk-download.ts` (`yauzl` + `stream-json@2.1.0` pipeline); raw 500–1000-row `ON CONFLICT DO UPDATE` helper; `--apenas-despesas` phase appended to both sync scripts; trailing workflow steps (3-year loop) + `apenas-despesas` dispatch input + retention DELETE + advisory lock + guardrails (count>0, unmatched-rate threshold, artifact validation, sanity gates); manual backfill runs.
**Uses:** `yauzl@3.4.0`, `stream-json@2.1.0`, raw `prisma.$executeRaw`, existing `http-client.ts` retry policy.
**Implements:** bulk-download, adapters, sync phase, workflow integration, retention.
**Avoids:** Pitfalls 1 (OOM), 3 (idempotency), 6 (concurrency), 7 (validation), 8 (GH limits), 9 (row-by-row N+1), 4 (retention after ingest).

### Phase 3: API & Read Path (GAST-06)
**Rationale:** Needs Phase 1 schema but is independent of Phase 2 ingestion — can be built in parallel and verified against backfilled rows once they land. Total and list must read the **same** snapshot (single route) or the sum of rows ≠ displayed total.
**Delivers:** `GET /api/parlamentares/[id]/despesas?ano=&page=&limit=&categoria=` (zod → 400/404 → Prisma `findMany` + `groupBy` resumo → pagination envelope identical to proposicoes); `src/lib/despesas.ts` pure compute (total, % participação, formatação) + Jest coverage.
**Implements:** API route, pure-compute lib.
**Avoids:** read-path trap (no gov APIs in UI; no aggregate tables — compute-on-read per PROJECT.md).

### Phase 4: UI — Tab "Gastos" (GAST-01 + GAST-02 + GAST-03)
**Rationale:** Needs Phase 3's route contract; UI copy/layout can start from the contract before data lands. This is where rendering-level traps (currency format, date buckets, dead links) become validatable against real rows.
**Delivers:** `despesas/page.tsx` (server shell) + `DespesasTab.tsx` (`'use client'`, fetch own API); `ParlamentarHeader` registration (`SecaoId 'despesas'` + `secoes` + `coresSecao`); year selector; category bars + equivalent table; paginated document list (20/pág); receipt link (`urlDocumento`) + **"Não disponível"** state; per-document source link + footer; nota de limitações; skeleton/error/empty states.
**Addresses:** Pitfalls 11 (month buckets), 12 (dead receipt URLs — dual links, honest fallback); FEATURES.md table stakes + differentiators.
**Open product decision:** Senado CEAPS exposes **no** `urlDocumento` (verified JSON+CSV) — the route/tab must tolerate `urlDocumento = null`; decide whether Senado renders "dado oficial" only, or research a per-document Senado transparency URL.

### Phase 5: Operational Hardening & v1.x Enhancements
**Rationale:** Operational/periodic traps only manifest across time boundaries and quota windows — validate after the pipeline has run for real. v1.x enhancements ride the same aggregates at ~zero marginal cost.
**Delivers:** sampled link-health job (`link_status` / `link_checked_at`, ~500 URLs/month HEAD checks — never all 700k); duplicate-trigger fix (Vercel cron vs GH `schedule`); storage/bloat monitoring (`pg_total_relation_size` vs 160 MB budget); minutes-usage estimate in job summary; per-step timeouts. v1.x: evolução mensal (12 barras), top fornecedores, filtro por categoria, CSV export (as a job, not on-request).
**Addresses:** Pitfalls 4/6/8 ongoing enforcement, 12 health sampling; FEATURES.md P2/P3.

### Phase Ordering Rationale

- **Hard dependencies:** Phase 1 → Phase 2 (adapters/schema before ingestion); Phase 1 → Phase 3 (schema before API); Phase 3 → Phase 4 (route contract before UI). **Phase 2 ∥ Phase 3** after Phase 1 — the main parallel opportunity.
- **Data-first grouping:** Phases 1–2 deliver GAST-04/05 with zero user-visible surface, letting the backfill surface mapping problems early; Phases 3–4 deliver the user-facing GAST-01/02/03/06.
- **Pitfall ownership:** Phase 1 owns schema-irreversible traps (money, storage, dates, year constant, name-match contract). Phase 2 owns ingestion traps (OOM, idempotency, concurrency, validation, limits, N+1). Phase 3 owns read-path integrity. Phase 4 owns rendering traps (format, dead links). Phase 5 owns operational/periodic traps.
- **Why not UI-first:** the API returns 200-empty without data — exactly the "0 votos" misperception bug already fixed in Votações (`660f01f`). Data must be trustworthy before the tab renders it.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** natural key — download one real Câmara year and assert **zero collisions** before freezing `@@unique` (the official spec warns these files don't follow portal naming/identifier conventions; `numDocumento` alone is not unique); which name column is the correct match key; whether the file exposes a trustworthy snapshot/update timestamp; repo visibility (public = free unlimited Actions minutes).
- **Phase 2:** name-match success rate is unknown until the first backfill — guardrail thresholds (suggested: fail if unmatched >1–5% or ambiguous >0) need tuning against real data; the party-change signature (`name_matched_party_differs > 0` must be logged and explained, not 0).
- **Phase 4:** Senado `urlDocumento` gap — product decision (render receipt only when present + always "dado oficial", vs research a per-document Senado transparency URL).
- **Phase 5:** medium research — current GitHub quota headroom; Neon storage/bloat behavior after the first real purge; re-check `next@14.2.0` advisories before shipping (already flagged in CONCERNS.md).

Phases with standard patterns (skip research-phase):
- **Phase 3:** well-documented — zod validation, offset pagination envelope, Prisma `groupBy`, pure-compute lib; mirrors the existing proposicoes/votacoes routes.
- **Phase 4 (mostly):** pt-BR currency formatting, link states, pagination, skeleton/error states — established patterns. Only the Senado receipt gap is genuinely open.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Library versions and module formats verified against the npm registry; both source payloads downloaded and inspected first-hand on 2026-10-09 |
| Features | MEDIUM-HIGH | Official Câmara/Senado portals = HIGH (primary); third-party comparables = MEDIUM; public-dashboard UX guides = MEDIUM |
| Architecture | MEDIUM-HIGH | Source schemas verified first-hand against live endpoints; integration patterns follow the mapped codebase; per-provider tier items = MEDIUM |
| Pitfalls | MEDIUM | Platform/limit facts HIGH from official vendor docs (GitHub, Vercel, PostgreSQL); domain-shape facts (natural key, name column) still need a real fixture sample |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Natural key uniqueness:** `numDocumento` alone is not unique (original + estorno share it). Must download a full real year and assert zero collisions on the candidate key before the migration lands — a key colliding on 0.01% of rows produces duplicates at 209k/day.
- **Name-match success rate:** unknown until the first Câmara backfill. The correct name column and the real unmatched / party-change rates must be measured, not assumed; guardrail thresholds tune against that data.
- **Senado receipt URL:** CEAPS exposes no `urlDocumento` in JSON or CSV (verified). The product must decide how the GAST-03 promise renders for Senado; the route/tab must tolerate `urlDocumento = null`.
- **Repo visibility:** unverified (looks like a personal-account URL). Public = unlimited free Actions minutes; private = 2,000 min/month ceiling that the existing duplicate trigger already risks. Changes the whole ingestion policy.
- **Snapshot timestamp:** unverified whether the bulk file exposes a trustworthy per-file update timestamp (would enable delete-by-snapshot retention; currently not relied upon).
- **`detalhe` (Senado free text) storage:** ~1 KB × ~71k rows ≈ tens of MB — store, truncate, or drop? Budget says store only if the UI shows it.
- **`idExterno` namespacing:** Câmara `idDocumento` and Senado `id` sequences can theoretically collide — decide prefix (`"CAMARA:7877589"`) vs `@@unique([casa, idExterno])` at schema time (migration cost later).
- **Year-loop vs retention-cutoff contradiction:** hardcoded `2024 2025 2026` will disagree with `currentYear - 2` in January 2027 — both must be driven by one shared constant when touching the workflows.
- **Duplicate trigger:** Vercel cron `sync-incremental` and GH `schedule: '0 3 * * *'` both run Câmara sync at 03:00 UTC today. Harmless for idempotent upserts, destructive once delete-then-insert exists — fix in the same milestone.
- **Library discrepancy resolved:** STACK.md recommends `yauzl@3.4.0` (registry-verified); ARCHITECTURE.md code sketches use `unzipper.Parse()`. `yauzl` is the primary recommendation (correctness > cleverness); `unzipper` central-directory mode is an acceptable swap. Batch size: STACK says 500, ARCHITECTURE says 1000, PITFALLS says 1–5k — all safe under the 65,535 bind-param cap; tune empirically starting at 500–1000.

## Sources

### Primary (HIGH confidence)
- First-hand probes 2026-10-09 — `curl`/range download + `funzip` of `https://www.camara.leg.br/cotas/Ano-2025.json.zip`; live `GET` of Senado `adm…/despesas_ceaps/2025` + `v3/api-docs` OpenAPI — exact sizes, JSON shape, field names/types, freshness headers
- npm registry (`npm view yauzl@3.4.0`, `stream-json@{2.1.0,3.7.0}`, `csv-parse@7.0.3`) — versions, engines, CJS/ESM module formats
- Official package docs (npmjs.com: yauzl, stream-json, unzipper, csv-parse) — streaming semantics, lazyEntries, `pick`/`streamArray`
- dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile — bulk file contract: URL pattern, formats, daily update, official naming-convention warning
- `.planning/codebase/{ARCHITECTURE,STRUCTURE,INTEGRATIONS}.md`, `scripts/sync-*.ts`, `.github/workflows/sync-*.yml`, `prisma/schema.prisma` — existing architecture facts (in-repo, read directly)

### Secondary (MEDIUM confidence)
- GitHub Docs — Actions limits (360-min timeout, 2,000 min, 500 MB artifacts, 20 concurrent jobs, runner specs)
- Vercel Docs — Hobby limits (2 GB memory, 300 s duration, 250 MB bundle)
- PostgreSQL Docs — money-type caveats, VACUUM/VACUUM FULL locking, autovacuum
- Neon Docs — free-plan limits (0.5 GB write-block, 100 CU-hours, scale-to-zero)
- Prisma docs & GitHub issues — `createMany`/`skipDuplicates` semantics, no `upsertMany` (#4134/#5437), batch-of-1000 guidance, `Decimal` serialization, Float precision (#2903), cursor OFFSET (#11138)
- Record-linkage literature (NCBI NBK253312, US Census working papers) — false-positive/false-negative causes, blocking, "ties → non-match"
- Bulk-delete practice (pgsql mailing lists, PostgresAI, PlanetScale) — batched deletes, bloat, space not returned to OS
- Pew Research "When Online Content Disappears" (2024) — government link-rot rates (21% of pages ≥1 broken link, 6% dead, 16% redirect)
- UK Government Analysis Function, GAO-22-104127, GovEx (Johns Hopkins) — public-dashboard UX, data-limitations disclosure, table-behind-chart accessibility
- Competitor inspection 2026-10-09 — comovotou.org, transparenciapolitica.app, gastoparlamentar.com.br

### Tertiary (LOW confidence — needs validation)
- Repo visibility (public vs private) — inferred from `git remote`; changes the Actions-minutes calculus
- Bulk-file snapshot/update timestamp — existence unverified; would enable an alternative retention strategy
- Câmara bulk name-column choice for the match key — which available name field is correct must be confirmed from a real fixture
- `codLote`/`tipoLinha` fields in the natural-key candidate — must be confirmed from a real full-year collision test

---
*Research completed: 2026-10-09*
*Ready for roadmap: yes*
