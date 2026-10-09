# Pitfalls Research — Bulk Government Open-Data Expense Ingestion

**Domain:** Legislative-transparency data pipeline (Câmara CEAP + Senado CEAPS → Postgres/Prisma, free tiers)
**Project:** como-votei — adding the "Gastos" module (GAST-01…GAST-06)
**Researched:** 2026-10-09
**Confidence:** **MEDIUM** (high on platform/limit facts from official vendor docs; medium on domain-shape facts that still need a fixture sample from the actual ZIP)

**Tier legend used below:**
- **[HIGH]** — stated by the official vendor documentation (GitHub Docs, Vercel Docs, PostgreSQL Docs, dadosabertos.camara.leg.br).
- **[MEDIUM]** — cross-checked across ≥2 independent sources (search + `--verified` = MEDIUM per `classify-confidence`).
- **[LOW]** — single-source or inference; verify before designing around it.

**Assumed scale** (from `PROJECT.md`): Câmara `cotas/Ano-{ano}.json.zip` ≈ 225 MB JSON / 209.080 rows per year; Senado CEAPS ≈ 10 MB / 23.808 rows per year; ~700k rows total over the 3-year window; Neon free = 500 MB (84 MB used, ~160 MB budgeted for this feature).

---

## Critical Pitfalls

### Pitfall 1: `JSON.parse` on the 225 MB ZIP payload — the classic OOM

**What goes wrong:**
The importer does `fs.readFileSync(zip) → unzip → JSON.parse(bigString)` and dies with `JavaScript heap out of memory`, or silently thrashes GC for minutes. Heap math: a 225 MB file needs ~225 MB for the UTF-8 string *plus* ~3–10× for the V8 object graph → **600 MB – 2.2 GB of live heap** before a single row is written. V8's default heap cap is ~1.5 GB. On Vercel Hobby the ceiling is **2 GB memory and 300 s duration** **[HIGH]**, so a serverless attempt OOMs or times out; even the GH runner can OOM if the process also holds the unzipped string *and* a growing array of parsed rows *and* Prisma's write buffer at the same time.

**Why it happens:**
It works on the developer's machine for the Senado file (10 MB) and even for a single year on a 32 GB workstation, so the pattern gets copied to the 225 MB file. Nobody re-runs the memory math when the source changes from "API response" to "annual bulk dump".

**How to avoid:**
1. **Keep the ingest out of Vercel entirely** — the existing design (Vercel cron *dispatches*, GitHub Actions *does the work*) is correct; do not move this into `src/app/api/cron/**`. Hobby caps: 2 GB / 300 s / 250 MB uncompressed bundle **[HIGH]**.
2. **Stream, never buffer**: `unzip -p file.zip` (or `yauzl`'s lazy-entry streaming) piped into `stream-json` with `pick({filter:…})` + `streamArray()` + `stream-chain`. That pipeline holds the document in constant memory (<30 MB) regardless of file size **[MEDIUM]**. `adm-zip` and `fs.readFile` both load the whole archive — reject them.
3. Batch to the DB *inside* the stream handler (e.g. `Batch({batchSize: 1000})` → `createMany`) so rows leave the process instead of accumulating.
4. If the streaming pipeline proves awkward, fall back to **chunked splitting on element boundaries + per-element `JSON.parse`** — measured ~5× less peak memory than one big parse **[MEDIUM]** — but do not fall back to whole-file `JSON.parse`.
5. Set an explicit guard: log `process.memoryUsage().heapUsed` every 50k rows and fail loudly past ~1.2 GB.

**Warning signs:**
- The import step logs `FATAL ERROR: ... heap out of memory` or the workflow job is killed with exit code 137 (OOM-killed, not an app error).
- `node --max-old-space-size=8192` starts appearing in the workflow as a "fix".
- The step's wall time is dominated by GC (CPU time ≫ I/O time).
- The Senado sync works; only Câmara fails → size, not logic.

**Phase to address:** **Phase A — Ingestão de despesas** (must be decided *before* the first line of the importer; retrofitting streaming after a row-by-row parser is written is a rewrite).

---

### Pitfall 2: Money as `Float` / JS `number` — rounding drift across 627k rows

**What goes wrong:**
`valorLiquido` stored as Prisma `Float` (= `double precision`). Individual documents look fine (`12.34`), but the UI's annual total and per-category bars are `SUM()` over up to 627k rows, and binary floats don't sum exactly: totals drift by cents-to-reais, two screens show different totals for the same year, and `R$ 12.349999999999999` leaks into a public transparency product. A second, sharper failure: parsing Brazilian-formatted strings with `parseFloat("1.234,56")` → **`1.234`** (a silent 1000× understatement) if any source variant (CSV fallback) delivers `1.234,56`.

**Why it happens:**
`Float` is the path of least resistance in Prisma and JS `number` "looks like" money. The bug is invisible in small samples and only appears in aggregates — which is exactly what GAST-01 shows.

**How to avoid:**
1. Column type **`Decimal @db.Decimal(14,2)`** (Prisma → `decimal.js`). PostgreSQL's own docs: *"Floating point numbers should not be used to handle money due to the potential for rounding errors"* **[HIGH]**; the `money` type is locale-dependent (`lc_monetary`) and effectively deprecated — don't use it either.
2. Alternative if you prefer integers: `Int` cents. Safe for a single document (R$ 21M ceiling) but every aggregate must then be computed in SQL with `BIGINT`/`numeric` casting — more footguns than `Decimal`.
3. Parse defensively: a `parseBRL(value)` helper that (a) accepts `number` as-is, (b) accepts `"12.34"` (dot), (c) rejects/converts `"1.234,56"` (comma) explicitly, and **throws** on anything else — never `parseFloat` directly from external data.
4. Know the Prisma `Decimal` API boundary: arithmetic works (`.plus()`, `.minus()`), but `JSON.stringify` of a route response turns it into a **string** (`"12.34"`), so the front end must not call `.toFixed()`/`Math.round()` on it without converting. Decide *one* serialization at the API boundary (recommended: emit `number` via `.toNumber()` only at the route layer, keep `Decimal` everywhere else, and format with `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` in the UI).
5. Assert signedness: CEAP/CEAPS contain **estornos/cancelamentos → negative values**. The column must be signed and the UI must not `Math.abs()` them away; category bars can legitimately go negative.

**Warning signs:**
- Annual total from the app ≠ total shown on camara.leg.br for the same deputy/year (off by <R$ 1).
- `typeof row.valor === 'string'` anywhere in the API response.
- A category bar renders a negative height or a `NaN`.
- Jest tests comparing `toBe(12.34)` pass but `SUM()` assertions fail.

**Phase to address:** **Phase A** (schema migration — changing `Float` → `Decimal` after data is loaded means a table rewrite on Neon; do it in the create-table migration).

---

### Pitfall 3: Re-import is not idempotent — duplicates *and* silently stale rows

**What goes wrong:**
The bulk file is a **full-year snapshot regenerated daily**, not an append-only feed. Two failure modes, both silent:

- **Duplicates:** the natural key is missing or wrong, so each daily run re-inserts 209k rows. In one week the table triples and every "total anual" is wrong by a factor of 7.
- **Stale rows:** you *do* dedupe with `createMany({skipDuplicates:true})`, but upstream **corrected** a value (estorno added, amount amended, document cancelled) — `ON CONFLICT DO NOTHING` keeps the old row forever. The app now publishes a figure the official source has already retracted.

**Why it happens:**
`skipDuplicates` *feels* like idempotency. It is only `ON CONFLICT DO NOTHING`, which does nothing unless a **unique constraint exists on the intended natural key**, and it never updates changed columns. Prisma also won't let `createMany` create or connect relations, so foreign keys must be pre-resolved — people route around that by dropping the FK and inventing a loose "unique" that doesn't actually dedupe **[MEDIUM — prisma/docs + community issues]**.

**How to avoid:**
1. **Pick the natural key from a real fixture, not from the docs.** The official spec warns explicitly that the cotas files *"não seguem os mesmos padrões de nomenclatura, identificadores e organização dos demais arquivos desta página"* **[HIGH — dadosabertos.camara.leg.br]**, and `numDocumento` alone is *not* unique (original + estorno share it). Candidate key: `(casa, ano, mes, numeroDeputado/parlamentarKey, numDocumento, codLote, tipoLinha)` — **verify by asserting zero collisions on a full-year sample before committing the migration.**
2. Declare it as `@@unique([...])` in `schema.prisma` so `skipDuplicates` actually has something to conflict on — and write a test that inserts the same fixture twice and asserts `count === 1`.
3. **Handle mutation, not just duplication.** One of these, chosen deliberately:
   - **Upsert per row** (`upsert` on the natural key with `update:` of all mutable columns) — correct but slow at 209k/year;
   - **Staging swap** (recommended): load into `despesa_stage` with `createMany`, then in *one transaction* `DELETE FROM despesa WHERE casa=? AND ano=?` + `INSERT … SELECT` from stage. Correct and fast; see Pitfall 4 for the lock/race implications;
   - **Delete-by-snapshot**: delete rows for that `(casa, ano)` whose `fonte_atualizacao < fileSnapshotDate` first, then insert — only works if the source exposes a trustworthy per-file update timestamp (currently unverified → **[LOW]**, check the file header/`metadados`).
4. Make the run **resumable**: commit per `(casa, ano)` chunk so a mid-run crash doesn't leave a half-year that the next run then double-loads.
5. Store `import_batch_id` + `imported_at` on every row — without it you cannot diagnose a duplication incident afterwards.

**Warning signs:**
- `SELECT COUNT(*) FROM despesa WHERE ano=2025` grows on every run instead of staying flat at ~209k.
- Guardrail comparing DB row count to source row count drifts upward.
- A re-run of the sync changes a total *downward* (upstream corrected something you had already frozen).
- `count` returned by `createMany` equals the batch size on every batch (never skipping anything).

**Phase to address:** **Phase A** — this is a schema + importer contract, not an ops afterthought.

---

### Pitfall 4: Retention deletes race with queries — and with the sync that re-inserts what you deleted

**What goes wrong:**
Three distinct ways the 3-year cleanup (GAST-05) bites:

1. **The year-boundary fight.** Retention purges `ano < currentYear-2` while the sync loop is hardcoded `for ano in 2024 2025 2026` (exactly as `sync-camara.yml` does today). In January the two disagree: sync re-inserts 2024, retention deletes it, sync re-inserts it — a permanent churn that both wastes Actions minutes and makes row counts oscillate.
2. **The single-statement delete.** `deleteMany({where:{ano:{lt:2024}}})` on ~209k rows runs as one transaction: row locks held for the whole statement, long-running query competing with the Neon free-tier pool, and a big dead-tuple spike. Batched deletes are the documented mitigation (~10k rows / 1–2 s of work per commit) **[MEDIUM — pgsql list + PostgresAI]**.
3. **Space that doesn't come back.** `DELETE` does not return pages to the OS; dead tuples keep counting against Neon's **500 MB** quota until autovacuum reclaims them. On a free tier where bloat = eviction, "I deleted 209k rows" can leave storage *higher* than before for hours.

**Why it happens:**
Retention, sync and read path are written by/for different concerns and nobody owns the boundary definition. "3 years" is stated in prose in `CONTEXT.md` but never expressed as a single shared constant used by both the delete and the sync loop.

**How to avoid:**
1. Define the window **once**, in code: `const ANOS_JANELA = 3; const anoMin = new Date().getUTCFullYear() - ANOS_JANELA + 1;` — and derive *both* the sync year list *and* the retention cutoff from it. Kill the hardcoded `2024 2025 2026` loop.
2. Retention runs **after** a successful import in the same job, never on a separate trigger, and takes `pg_advisory_lock('<app>:despesa')` so it can't interleave with a concurrent import (see Pitfall 6 for why concurrency is real here).
3. Batch: `DELETE … WHERE ano = $1 AND id IN (SELECT id … LIMIT 10000)` in a loop with a commit per batch and a short sleep; cap total work per run.
4. Reads are safe under MVCC *per statement* — but a paginated UI can show page 1 from before the delete and page 2 from after. Accept this (it's a daily 1-row-boundary event) or make retention run inside the import transaction.
5. Watch storage after the first purge: if `pg_database_size` doesn't drop within a day, that's expected (bloat) — the fix is repeated small deletes, not `VACUUM FULL` (which needs an ACCESS EXCLUSIVE lock Neon won't appreciate). Partition-by-year is the "correct" answer and **overkill** at 700k rows — don't.
6. If the purge must be a big one-time shrink (e.g. after a bad double-load), use the create-new/copy-keep/drop/rename dance offline, not `VACUUM FULL`.

**Warning signs:**
- Row count for the oldest year goes 209k → 0 → 209k across three consecutive runs.
- Neon storage graph spikes right after the first January run.
- Read queries time out with `pool_timeout`/`P1002` while the delete is running.
- A page of the Gastos tab shows a total that its own pagination implies is impossible (rows vanished mid-scroll).

**Phase to address:** **Phase C — Retenção & operação**, but the shared year-window constant must be introduced in **Phase A** (retrofitting it once the hardcoded loop exists = the fight already started).

---

### Pitfall 5: Wrong-MP name match — silently attributing a deputy's expenses to someone else

**What goes wrong:**
The Câmara bulk has no stable dadosabertos deputy id (`numeroDeputadoID` is a different namespace), so the match is `nomeParlamentar + siglaPartido + siglaUF`, normalized. Two silent failure modes:

- **False negative (data disappears):** a deputy **changes party mid-mandate** — extremely common in the Câmara. The row's `siglaPartido` no longer matches the value stored in `parlamentar`, so the key fails, the row is logged-and-skipped, and that deputy's Gastos tab shows a total that is *quietly short* by months of spending. Nobody notices because the UI renders happily.
- **False positive (wrong person's money):** fuzzy/normalized matching is loosened to compensate for (a), two candidates tie (same name, or a common name + party collision), and the matcher picks one. Now one deputy's profile displays another's receipt. In a product whose stated Core Value is *"se o dado oficial… não for acessível e verificável aqui, o produto falhou"*, this is the single worst bug the module can ship.

**Why it happens:**
The blocking key mixes a **stable** attribute (UF, fixed for the term) with an **unstable** one (party). Under-matching then pressures the team into "helping" the matcher with fuzzy logic, which converts a visible gap into an invisible wrong answer. Record-linkage literature is blunt: false positives come from *different people sharing common identifiers*, and **ties that cannot be adjudicated with additional information must be classified as non-matches** **[MEDIUM — NCBI Bookshelf NBK253312 / Census working papers]**.

**How to avoid:**
1. **Block on stable attributes only:** normalized full name + UF (+ year/legislature if available). Use `siglaPartido` as a **tie-breaker among candidates, never as a required predicate.**
2. **Exact match on the normalized name — no fuzzy/Levenshtein, ever.** Normalization = uppercase, strip accents, collapse whitespace, strip party/UF suffixes and ordinal markers (`(PSD)`, `°`, `1º`) if the source embeds them. If exact fails → **unmatched**, logged, skipped. Never invent a match (already a documented decision in `PROJECT.md`; this pitfall is *why* it's documented).
3. **Pick the right name field.** The bulk may expose more than one name column (parliamentary name vs. printed/public name). Confirm against a fixture sample before freezing the match key — matching on the wrong one silently matches almost nothing. **[LOW — verify from the ZIP]**
4. **Guardrails that make both failure modes loud** (add to the workflow, alongside the existing `nominais sem votos` pattern):
   - `unmatched_rows / total_source_rows > 1%` → fail the job;
   - rows where the name matched but **party differed** → count and log (this is the party-switch signature; it must be >0 and explained, not =0);
   - rows where the name resolved to **>1 candidate** → hard fail at 0 tolerance;
   - per-deputy `SUM(valorLiquido)` for 3 sample deputies reconciled against the official Câmara portal totals.
5. **Former deputies:** expenses stay in the bulk for the full year after someone leaves office. If `parlamentar` only holds incumbents, those rows can never match → systematic gap. Either keep historical deputies in the table or log the gap explicitly with a count.
6. Persist the mapping decision: store `nomeParlamentar_raw` alongside `parlamentar_id` so an auditor (or a user complaint) can see exactly which name was attributed to whom.

**Warning signs:**
- A deputy's Gastos total is visibly lower than their published total for the same year, with no data gap explanation.
- `unmatched` log lines spike right after an election/posse (mandate turnover) or after any party-swap news cycle.
- One profile shows a receipt whose `fornecedor`/city is implausible for that deputy.
- Match rate is suspiciously *perfect* (100%) — that usually means you matched on something too permissive.

**Phase to address:** **Phase A** (the mapper and its guardrails are part of ingestion; discovering the problem in Phase B means re-importing everything).

---

### Pitfall 6: Concurrent imports — the already-documented duplicate-trigger bug meets a destructive write

**What goes wrong:**
`CONCERNS.md` already records that Câmara sync runs **twice concurrently at 03:00 UTC** (Vercel cron `sync-incremental` *and* GH `schedule: '0 3 * * *'`). Today the writes are upserts, so a double run is merely wasteful. Introduce an importer that does **delete-then-insert per year** and a double run becomes a data-loss race: run A deletes the year, run B deletes (nothing/what A inserted), A inserts, B inserts → duplicates *or* A's transaction and B's interleave and one commits over the other. Same risk if retention (Pitfall 4) fires while an import is mid-flight.

**Why it happens:**
The concurrency bug predates the feature and was judged low-severity because current writes are idempotent. Severity is a property of the *writer*, not the trigger.

**How to avoid:**
1. Take a session-level advisory lock at the start of any despesa import/retention step: `SELECT pg_advisory_lock(hashtext('comoVotei:despesa'))`; if it can't be acquired within N seconds, exit 0 with "another import in progress" (not a failure).
2. Keep writes **transactional per `(casa, ano)`** so a crashed run leaves the previous complete state.
3. Fix the duplicate trigger in the same milestone (keep one of the Vercel cron or the GH `schedule`, staggered if both are wanted) — it's cheap and it removes the whole class.
4. Add a cheap `concurrent_import_runs` counter/log so a recurrence is visible.

**Warning signs:**
- Two green workflow runs for the same night with overlapping timestamps.
- Row counts that differ between the two runs' guardrail outputs.
- Deadlock errors mentioning `despesa` (Prisma `P2010`/`40P01`).

**Phase to address:** **Phase C — Retenção & operação**, but the advisory lock belongs in **Phase A**'s importer from day one.

---

### Pitfall 7: Government bulk availability & schema drift — partial ZIPs, HTML error pages, renamed fields

**What goes wrong:**
- **Download lies:** `www.camara.leg.br/cotas/Ano-2025.json.zip` returns 200 with a truncated body (connection cut at 40%) or with an HTML maintenance page. Parsing yields a truncated JSON error, or worse, a partial row set that imports "successfully" as 80k rows.
- **Mid-write snapshot:** the file is updated *daily* **[HIGH]**; downloaded while being rewritten, you get an internally inconsistent set of rows.
- **Field drift:** the official spec flags that these files don't follow the portal's naming/identifier conventions **[HIGH]** — so they are exactly the files most likely to change shape without notice. A field renames (`valorLiquido` → something else), a type flips from number to string, `mes` becomes null: the `catch { return [] }` / `return null` style already pervasive in `src/lib/sync/*` (documented in `CONCERNS.md`) turns that into *"this deputy spent nothing this year"* — indistinguishable from truth.
- **Availability:** bulk endpoints 503 during maintenance; Senado's API is a different host with its own rate posture.

**Why it happens:**
Silent-catch adapters were written for API pagination where an empty page is normal. For a bulk dump, an empty result is always an incident.

**How to avoid:**
1. **Validate the artifact before parsing:** HTTP status *and* `Content-Type` *and* ZIP magic bytes (`PK\x03\x04`) *and* `unzip -t` integrity *and* expected entry count (1). Fail — never proceed on a non-ZIP body.
2. **Sanity-gate the parsed set before writing:** row count within, say, ±20% of the previous successful run for that year; `SUM(valorLiquido)` within ±5%; at least one matched row per expected month. This is the same guardrail philosophy already used in `sync-camara.yml` — extend the pattern rather than inventing a new one.
3. **Zod-parse the first N records and every 10k-th record** against a schema that marks *required* fields. `zod` is already a dependency (`CONCERNS.md` recommends it precisely for adapter JSON). Missing required field → throw, not `return []`.
4. **Never widen a `catch`** in the despesa path; convert silent empties into a thrown error surfaced in the workflow log + guardrail (the "Safe modification" note in `CONCERNS.md` says exactly this — apply it here, don't repeat the debt).
5. **Retry with backoff** on 5xx/timeouts, per-year, so one bad year doesn't kill the 3-year job; mark that year as `sync_status = 'FAILED'` in a tiny bookkeeping table so the UI can say "dados de 2025 indisponíveis nesta fonte" instead of showing zeros.
6. Keep a **fixture of a real downloaded record set** in the repo and run adapter unit tests against it (currently `camara-adapter` 12.5% / `senado-adapter` 8.75% covered — the least-tested, most fragile files).

**Warning signs:**
- Guardrail row count drops >20% overnight with no upstream announcement.
- A whole month has zero rows for every deputy.
- `catch { return [] }` appears anywhere in the new despesa code path.
- The job succeeds in 30 s when it usually takes 10 min (it never actually downloaded).

**Phase to address:** **Phase A** (validation + fixtures), reinforced by guardrails in **Phase C**.

---

### Pitfall 8: GitHub Actions limits — 6 h ceiling, 500 MB artifacts, 2000 minutes, 14 GB disk

**What goes wrong:**
- **Timeout:** GitHub's workflow-level timeout is **fixed at 360 minutes (6 h)** and cannot be raised **[HIGH]**. The repo already declares `timeout-minutes: 360` for Câmara — that is the maximum, with no headroom. Adding a daily 3-year bulk ingest on top of the existing full votações/discursos/proposições loops risks a job that is killed mid-import.
- **Minutes:** Free plan = **2,000 min/month on private repos** (public repos are free *and unlimited*) **[HIGH]**. The existing daily full-sync loops + duplicate trigger are already flagged as a quota risk in `CONCERNS.md`; adding ~3 × 225 MB downloads + 700k inserts/day compounds it. **Check repo visibility first** — it changes the whole calculus (`git remote` shows a personal-account URL; visibility unverified **[LOW]**).
- **Artifacts:** Free artifact storage is **500 MB total** **[HIGH]** — uploading even one 225 MB ZIP as an artifact burns ~45% of the monthly quota in a single run.
- **Cache:** 10 GB/repo, evicted after 7 days without access; caching the ZIP by year is legitimate but must be keyed on a content/ETag hint, not blindly.
- **Disk:** standard runners have **14 GB SSD** **[HIGH]** — plenty for 3 years of ZIPs (~700 MB) *if you delete them after each year*; the repo currently doesn't, so a full-year × 3 loop plus `node_modules` plus `.next` adds up.
- **Concurrency:** 20 concurrent jobs on Free **[HIGH]**; not binding today, but a fan-out matrix (one job per year) interacts with the duplicate-trigger problem.

**Why it happens:**
Limits live in three different places (workflow YAML, GitHub account plan, runner image) and none of them surface until the job fails at 5:59.

**How to avoid:**
1. **Design for incremental, not full-history, on schedule** (already the recommended fix in `CONCERNS.md`): scheduled runs sync "current year only + yesterday onward"; full 3-year loops move to `workflow_dispatch`. Add the despesa import to that same policy — importing all 3 years *daily* is pure waste when the bulk is a full-year snapshot (only the current year actually changes).
2. **Stream-and-discard**: download → validate → parse → insert → `rm` the ZIP, per year. Never persist all 3 at once, never upload them as artifacts.
3. Put a **per-step `timeout-minutes`** (e.g. 45 per year) below the job ceiling so a hung download fails fast with a clear name instead of eating 6 h.
4. Emit a **minutes-usage estimate in the job summary** and alert when the month's projected usage crosses ~1,500 min (private) — Actions does not warn you before you hit the wall; syncs just stop.
5. Resolve the duplicate trigger in this milestone (`vercel.json` cron vs `schedule`), otherwise every limit above is consumed twice.

**Warning signs:**
- `The job has exceeded the maximum execution time of 360 minutes`.
- Actions page shows quota exhausted and *no new scheduled runs start* (data goes stale silently — the worst failure mode for a transparency product).
- `Error: Failed to upload artifact … storage quota`.
- Runner disk-full (`ENOSPC`) during the unzipped 225 MB parse.

**Phase to address:** **Phase C — Retenção & operação** (workflow policy), with the incremental-vs-full decision recorded as a **Key Decision in Phase A**.

---

### Pitfall 9: Row-by-row persistence (repeating the repo's own N+1 debt at 10× the volume)

**What goes wrong:**
The importer resolves `parlamentar` and inserts `despesa` one document at a time — `findUnique` + `insert` per row, 209k times × 3 years. At even 5 ms/row that's 30+ minutes of pure round-trips *per year*, on a Neon free-tier pool that also serves the app. The existing `CONCERNS.md` performance section documents this exact pattern in `sync-camara.ts`/`sync-senado.ts` (`findUnique` + `upsert` per record, no id cache) — it is the house anti-pattern and the despesa volume is ~100× the vote volume.

**Why it happens:**
Row-by-row is the simplest code and it works for 81 senators × hundreds of votações. Scale changes the answer.

**How to avoid:**
1. **Preload a `Map` once**: `nomeNormalizado → parlamentarId` (and the raw-name variants) before the loop. Zero DB reads inside the row loop for mapping.
2. **Batch writes**: `createMany({ data, skipDuplicates: true })` in chunks of 1,000–5,000 rows. Remember `createMany` cannot create/connect relations — the `parlamentar_id` must already be a resolved scalar in the payload.
3. **Single transaction per `(casa, ano)`** (or per N batches) for atomicity, with `statement_timeout` set explicitly so a runaway batch can't hold the pool.
4. Consider raw `COPY`-style fast path (`$executeRaw` with a multi-row `INSERT … VALUES`) only if `createMany` proves slow — don't start there.
5. Time-budget it: target **< 10 min per year**; if it exceeds that, the batch size or the round-trips are wrong.

**Warning signs:**
- One step emits thousands of identical log lines (`upserting row 128,441`).
- Neon dashboard shows sustained connection churn during the import.
- The import step is 10× slower than the download step.

**Phase to address:** **Phase A**.

---

### Pitfall 10: Storing the upstream record verbatim — blowing the 500 MB budget

**What goes wrong:**
Every column from the bulk is copied into `despesa` "because it was there". Long repeated strings — `descricaoDespesa`/`tipoDespesa` (~60–100 chars, ~50 distinct values), `fornecedor`, `urlDocumento`, `descricao` free text — multiplied by ~700k rows push the projected +160 MB well past budget. PostgreSQL does **not** deduplicate repeated text; 700k copies of a 90-char category string is 63 MB of literal repetition, plus matching index bloat. On a 500 MB free tier with 84 MB already used, the module either fits or it forces a paid tier.

**Why it happens:**
Schema-by-copy is fast to write and there's no local signal that a column is 60× redundant.

**How to avoid:**
1. **Model only what the product shows.** GAST-01/02/03 need: date, category, supplier, value, receipt URL, source URL, deputy, year. Everything else (`empenho`, `valorGlosa`, raw descriptors…) stays out unless a requirement asks for it. Add columns later via migration.
2. **Normalize low-cardinality text**: a `despesa_categoria` table (`cod`, `descricao`) referenced by FK — ~50 rows instead of 700k × 90 chars. `fornecedor` is high-cardinality; decide with real distinct-count from a fixture (if < ~30k distinct, a `fornecedor` dim also pays for itself; otherwise leave it inline).
3. **Index only what's queried**: the Gastos tab needs `(parlamentar_id, ano, data)` composite. Don't index `urlDocumento`, don't index the supplier without a trigram need. Retention needs `ano` (covered by the composite's second column only if ordered right — add `ano` explicitly if not).
4. **Don't store `ano`/`mes` redundantly** if `data` already carries them *and* you're willing to index on an expression — or store them and drop `data`. Pick one; redundant representations drift.
5. Measure: `SELECT pg_total_relation_size('despesa')` after the first full load, and compare against the +160 MB budget before writing Phase B.

**Warning signs:**
- Neon storage graph climbs linearly with rows faster than `rows × avg(row_bytes)`.
- `pg_total_relation_size` dominated by indexes (index:table ratio > 1).
- The first full load lands at >160 MB.

**Phase to address:** **Phase A** (create-table migration).

---

### Pitfall 11: Date handling — `DD/MM/YYYY` vs ISO, and the UTC off-by-one

**What goes wrong:**
Senado and Câmara date formats differ (as does everything else between the two sources — a documented constraint). Parsing `"15/03/2025"` with `new Date("15/03/2025")` yields `Invalid Date` in some engines; parsing `"2025-03-15"` as a *local* date then storing as `Date` shifts it by the timezone offset when read back in UTC, so a document dated 1 Mar 00:30 BRT lands on 28 Feb UTC and its month bucket (and the monthly bars in GAST-01) shifts by one. The same class of bug already bit the presence feature (`presencas` label/years fix, commit `5873877`).

**Why it happens:**
JS `Date` is a timestamp, not a calendar date. Money/date aggregation is the first place the mismatch becomes user-visible.

**How to avoid:**
1. Normalize **both** sources to ISO `YYYY-MM-DD` at the adapter boundary with an explicit parser per source (`dd/mm/yyyy` and `yyyy-mm-dd` handled separately — never one permissive `new Date(x)`).
2. Store dates as `Date @db.Date` (date-only, no time) so UTC/local offset cannot move the day; or store the raw `ano`+`mes` integers from the source as the authoritative bucket keys and treat `data` as display-only.
3. Never derive `ano`/`mes` from a JS `Date` constructed without an explicit timezone; prefer the integers the source already provides.
4. Fixture-test month boundaries: 31/12, 01/01, and a 00:xx timestamp.

**Warning signs:**
- January total ≠ sum of the 12 monthly bars.
- A document appears in the month before its printed date.
- `Invalid Date` in a serialized API response.

**Phase to address:** **Phase A** (adapter normalization), asserted in **Phase B**'s UI tests.

---

### Pitfall 12: Dead receipt URLs — GAST-03's core promise is an external dependency

**What goes wrong:**
GAST-03 requires every expense to show a link to the official receipt (`urlDocumento`) and to the source data. Those URLs point at government hosts that: expire documents, reorganize paths, redirect, or block non-browser/hotlink requests. Measured rates: **21% of government webpages contain at least one broken link and 6% of sampled government links are already inaccessible; 16% redirect to a different URL; ~6% point at static files like PDFs** **[MEDIUM — Pew Research, "When Online Content Disappears," 2024]**. Over a 3-year window a nontrivial fraction of receipts will 404 — and the product's Core Value explicitly fails when the official record isn't verifiable.

**Why it happens:**
`urlDocumento` is treated as a permanent identifier when it's really a third-party hotlink with no SLA.

**How to avoid:**
1. **Always render both links** (receipt + canonical source dataset) so a dead receipt still leaves the user a path to the official record — GAST-03 already asks for this; treat the *dataset* link as the primary and the receipt as supplementary.
2. **Never proxy or embed the PDF through the app.** Vercel egress/bandwidth on free tier, government hosts blocking non-browser UAs, and the 250 MB function-bundle limit all argue against it; also avoids serving arbitrary upstream content.
3. Track link health in a cheap way: store `link_status` (`unknown|ok|redirect|dead`) + `link_checked_at`; a monthly low-concurrency job samples (say) 500 URLs with `HEAD`, records status, and surfaces "comprovante indisponível na fonte" in the UI instead of a dead click. Do **not** check all 700k URLs.
4. Keep the raw URL **verbatim** (no normalization/rewriting that could break the working case), and if it's `http://`, test whether `https://` works before upgrading.
5. Handle empty `urlDocumento`: some documents genuinely have no receipt attached — render "sem comprovante disponível na fonte", never a broken `<a href="">`.

**Warning signs:**
- A 404/403 from `*.camara.leg.br`/`*.senado.leg.br` in the e2e/link check.
- Receipt links that open a login/consent page instead of a PDF.
- Empty-string or `#` hrefs in the DOM.
- A user report that "the receipt link doesn't work" (there will be one).

**Phase to address:** **Phase B — UI Gastos** (rendering + honest dead-link state), health sampling in **Phase C**.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `catch { return [] }` around despesa parsing | Job stays green on upstream breakage | Silent "deputy spent nothing" — indistinguishable from truth; Core Value violated | **Never** — throw and let the guardrail fail the job |
| Hardcoded year loop `for ano in 2024 2025 2026` | Simple workflow YAML | Retention/sync fight at every year rollover; 4th year silently retained or purged data re-imported | Only until Phase A introduces `ANOS_JANELA`; then delete |
| `Float` for `valorLiquido` | No migration friction | Cent-level drift in every public total; expensive table rewrite later | **Never** — schema migration is cheapest on day one |
| Whole-file `JSON.parse` with `--max-old-space-size` bump | ~30 lines of code | OOM on the next format/size change; 6 h job ceiling consumed by GC | Only for the 10 MB Senado file, with a size assertion in front of it |
| Storing the full upstream record | Zero schema design | 500 MB budget overrun; every future migration carries dead columns | MVP-only, **if** measured after the first load and still under budget |
| Skipping the natural-key uniqueness test | Faster to ship | Duplicates discovered in production after N daily runs | **Never** — the fixture-collision test is 20 lines |
| No advisory lock on import/retention | One less concept | Data loss via the already-duplicated trigger | Only after the duplicate trigger is removed |
| Fuzzy name matching to "rescue" unmatched rows | Higher match % | Wrong deputy shown wrong money — unverifiable and unfixable after the fact | **Never** — log and skip |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Câmara `cotas/Ano-{ano}.json.zip` | Assuming it follows the portal's identifier conventions (it officially does **not**) | Fetch a real record set first; derive the natural key from a zero-collision test over a full year |
| Câmara bulk download | Trusting HTTP 200 + parsing | Verify status, `Content-Type`, `PK\x03\x04` magic, `unzip -t`, entry count, then row-count/`SUM` sanity gates |
| Senado CEAPS API | Treating it like the Câmara bulk (same schema, same key) | Separate adapter + separate normalizer; only `codSenador`/`idExterno` is a true direct match |
| Prisma `createMany({skipDuplicates})` | Believing it dedupes without a unique constraint; expecting it to create relations | Declare `@@unique` on the natural key; pre-resolve FK ids into the payload |
| Prisma `Decimal` | Passing it straight to `JSON.stringify`/`.toFixed()` in routes | Serialize once at the route boundary (`.toNumber()` or `.toString()`), format in the UI with `Intl.NumberFormat('pt-BR')` |
| `pg_advisory_lock` | Forgetting it and relying on "the cron is staggered" | Lock by a stable app-specific key at the top of import *and* retention |
| Government receipt links | Proxying/hosting the PDF or hotlinking as the only proof | Dual links (receipt + source dataset), raw URL preserved, sampled health checks |
| Neon free tier | One giant `deleteMany` expecting storage to drop immediately | Batched deletes + patience; monitor `pg_total_relation_size`, don't `VACUUM FULL` |
| GitHub Actions | Uploading the ZIP as an artifact / running full 3-year imports on schedule | Stream-and-discard; schedule = current year only; full backfill = `workflow_dispatch` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Whole-file `JSON.parse` of 225 MB | OOM / exit 137 / minutes of GC | `stream-json` + `pick` + `streamArray`, batch inside the handler | Breaks at first Câmara import (~600 MB–2 GB heap); Senado (10 MB) hides it |
| Row-by-row insert | Import step hours long; pool churn | Preloaded `Map` + `createMany` batches of 1–5k | Breaks at ~10⁵ rows; 700k rows × 5 ms ≈ 60 min |
| Missing `(parlamentar_id, ano, data)` index | Gastos tab paginates by full scan | Composite index created in the initial migration | Breaks around 10⁵–10⁶ rows scanned per page view |
| Daily full 3-year re-import | 6 h job ceiling; minutes quota exhausted | Snapshot semantics ⇒ current-year-only on schedule | Breaks when the added minutes push the month past 2,000 (private repo) |
| One giant retention `deleteMany` | Lock waits, `pool_timeout`, storage spike | ~10k-row batches with a commit each | Breaks at ~10⁵+ rows in one statement |
| Storing verbatim long strings | Storage climbs faster than row count | Dim table for category; index only queried columns | Breaks at 700k rows × ~90-char repeated text (~63 MB) |
| Artifact-uploading the ZIP | `storage quota` errors | Never persist the download | Breaks immediately (500 MB total quota) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Rendering upstream strings (supplier names, descriptions) as HTML | XSS from government free-text fields | React text nodes only; never `dangerouslySetInnerHTML`; escape if any markdown path |
| Proxying `urlDocumento` through an API route | SSRF-ish open fetch of an attacker-influenced URL + app egress abuse | Render `<a href>` directly; if any fetch is added, allowlist `*.camara.leg.br` / `*.senado.leg.br` hosts and block redirects |
| Interpolating table/column names in the new aggregate guardrails | Repeats the existing `$queryRawUnsafe` pattern in a bigger blast radius | `Prisma.sql` templates + a hardcoded whitelist map (same recommendation already in `CONCERNS.md`) |
| Unbounded download size from a government host | Runner disk exhaustion / memory spike | `max-content-length`/size assertion before download; expected size range per year |
| Importer with write credentials reachable from a request handler | Full DB write access exposed to anonymous traffic | Keep the importer a script invoked only by GitHub Actions; never route it through `src/app/api/**` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Receipt link 404s with no explanation | User concludes the app is broken *or* that the deputy is hiding something | Explicit "comprovante indisponível na fonte" state + always-present link to the official dataset |
| Total ≠ the number on the official portal | Undermines the entire trust proposition | Reconcile 3 sample deputies against official totals in CI guardrails |
| Negative values (estornos) shown as positive or hidden | Overstates spending — the same sin the product exists to catch | Render signed values; show cancellations as negative rows with a label |
| Currency rendered as `1234.56` or `$1,234.56` | Reads as an American product; worse, `1.234` misread as 1.23 | `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` everywhere |
| Empty Gastos tab during a failed sync | "This deputy is corrupt-free" when the import actually broke | Distinguish *no data ingested* (error/`sync_status`) from *no expenses* (genuinely empty) |
| Pagination totals shifting mid-scroll during retention | Totals and counts disagree within one session | Run retention after import in the same job; accept the rare boundary or snapshot counts server-side |
| Monthly bars off by one | Users spot-check a single document's month and lose trust | Date normalization from Pitfall 11 + boundary fixtures |

## "Looks Done But Isn't" Checklist

- [ ] **Idempotency:** run the same year import twice in CI and assert row count *and* `SUM(valorLiquido)` are byte-identical. Passing once ≠ idempotent.
- [ ] **Natural key:** assert **zero** collisions on a full-year fixture before adding `@@unique`. A key that collides on 0.01% of rows will produce duplicates at 209k/day.
- [ ] **Name mapping:** assert `unmatched_rate < 1%`, `ambiguous_matches === 0`, and `name_matched_party_differs > 0` is *logged and explained* — a 0 there means the party predicate is still in the blocking key.
- [ ] **Reconciliation:** app total for 3 sample deputies matches the official Câmara/Senado portal for the same year (±R$ 0.01).
- [ ] **Memory:** import step logs peak `heapUsed`; assert < 1.2 GB for the 225 MB year.
- [ ] **Retention:** after a simulated year rollover, the sync year list and the retention cutoff agree — no year is both purged and re-imported.
- [ ] **Concurrency:** start two imports simultaneously; the second must exit cleanly on the advisory lock, and row count must not double.
- [ ] **Artifact validation:** feed a truncated ZIP and an HTML error page; both must fail loudly, not import 0 or 80k rows.
- [ ] **Storage:** `pg_total_relation_size` for the despesa tables after first full load is ≤ the ~160 MB budget.
- [ ] **Date buckets:** sum of the 12 monthly bars equals the annual total for every sampled deputy.
- [ ] **Dead links:** a known-404 receipt renders the honest fallback state, not a broken anchor.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicates shipped | **HIGH** | Stop sync → identify natural key → dedupe keeping one row per key → add `@@unique` → add the double-insert regression test → re-import affected years from source |
| Wrong-MP attribution shipped | **HIGH** | Delete *all* despesa rows for the affected casa/year → fix matcher (drop party from blocking key) → re-import → publish a correction note (a transparency tool must disclose this) |
| Stale values (no update path) | **MEDIUM** | Re-import the affected `(casa, ano)` with delete-then-insert or staging swap; no schema change needed |
| Money stored as `Float` | **MEDIUM** | `ALTER COLUMN … TYPE numeric(14,2) USING valor::numeric(14,2)` — one rewrite, safe at 700k rows but do it before Phase B ships totals |
| Retention/sync fight | **MEDIUM** | Introduce shared `ANOS_JANELA` constant, update both the loop and the cutoff, purge the orphan year once |
| Missed 6-hour/minutes limit mid-import | **MEDIUM** | Re-run with `workflow_dispatch` per year; importer is resumable per `(casa, ano)` so no partial state persists |
| Storage blowup from verbatim columns | **MEDIUM** | Migration to drop unused columns + move category to a dim table; reclaim via repeated batched deletes (not `VACUUM FULL`) |
| Dead receipt links at scale | **LOW** | Sampled health check + honest UI state; the source-dataset link always remains as fallback |
| Schema drift after a source change | **MEDIUM** (detect) / **HIGH** (if undetected) | Fixture-first: update fixture → adapter tests fail → fix adapter → re-import affected period |

## Pitfall-to-Phase Mapping

Suggested phase labels for the roadmap (rename freely; the *order* is the recommendation):

| # | Pitfall | Prevention Phase | Verification |
|---|---------|------------------|--------------|
| 1 | 225 MB `JSON.parse` OOM | **A — Ingestão de despesas** (decision before code) | Peak `heapUsed` log < 1.2 GB on a full-year run |
| 2 | Money as `Float` / BRL parsing | **A** (create-table migration) | `SUM` reconciliation + `parseBRL` unit tests |
| 3 | Non-idempotent re-import (dupes + stale) | **A** (schema + importer contract) | Run-twice invariance test; `@@unique` present |
| 4 | Retention race + year-boundary fight | Constant in **A**; deletion in **C — Retenção & operação** | Simulated rollover: no year purged *and* re-imported |
| 5 | Wrong-MP name match | **A** (mapper + guardrails before any import) | `unmatched<1%`, `ambiguous=0`, sample reconciliation green |
| 6 | Concurrent imports / duplicate trigger | Lock in **A**; trigger fix in **C** | Two simultaneous runs → one exits cleanly |
| 7 | Bulk availability + schema drift | **A** (validation + fixtures), guardrails in **C** | Truncated-ZIP and HTML-page fixtures both fail loudly |
| 8 | GH Actions limits | Policy decision in **A**; enforcement in **C** | Per-step timeouts; projected-minutes check in job summary |
| 9 | Row-by-row insert N+1 | **A** | Import < 10 min/year; no per-row log spam |
| 10 | Storage blowup from verbatim columns | **A** (create-table migration) | `pg_total_relation_size` ≤ ~160 MB after first load |
| 11 | Date/timezone month-bucket drift | **A** (adapter), asserted in **B — UI Gastos** | Monthly bars sum to annual total |
| 12 | Dead receipt URLs | **B** (render + honest state), health check in **C** | 404 sample renders fallback; dual links present |

**Ordering rationale:** Phase A owns 9 of 12 pitfalls because *schema, natural key, name-mapping and batch strategy are all irreversible cheaply now and expensive later* (they force re-imports and table rewrites). Phase B owns rendering-level traps (money format, dates, dead links) that can only be validated once real rows exist. Phase C owns the operational/periodic traps (retention, workflow limits, link health) which only manifest across time boundaries and quota windows.

**Research flags:**
- **Phase A: needs deeper research before implementation** — (a) the actual cotas JSON field list and a zero-collision natural key (must download one real year and assert); (b) whether the file exposes a trustworthy snapshot/update timestamp; (c) which name column is the correct match key; (d) repo visibility (public = free unlimited Actions minutes) which changes the ingestion policy.
- **Phase B: standard patterns**, unlikely to need research (pt-BR currency formatting, link states, pagination).
- **Phase C: medium research** — verify current GitHub quota headroom and Neon storage/bloat behavior after the first real purge; re-check `next@14.2.0` advisories before shipping (already flagged in `CONCERNS.md`).

## Sources

- **[HIGH]** GitHub Docs — *Actions limits* / *GitHub Actions billing* (2,000 min, 500 MB artifacts, 10 GB cache, 360-min workflow timeout, 20 concurrent jobs, runner specs 4 vCPU/16 GB public, 14 GB SSD): docs.github.com/actions/reference/limits, docs.github.com/billing, docs.github.com/actions/reference/runners/github-hosted-runners
- **[HIGH]** Vercel Docs — *Vercel Functions Limits / Memory / Duration* (Hobby 2 GB, 300 s max, 250 MB uncompressed bundle): vercel.com/docs/functions/limitations
- **[HIGH]** PostgreSQL Docs — *Monetary Types* ("floating point numbers should not be used to handle money"; `money` locale-dependent): postgresql.org/docs/current/datatype-money.html
- **[HIGH]** Dados Abertos da Câmara — static-file spec, *Despesas pela Cota para Exercício da Atividade Parlamentar* (`cotas/Ano-{ano}.{formato}[.zip]`, daily update, official warning that these files don't follow the portal's naming/identifier conventions): dadosabertos.camara.leg.br/swagger/api.html?tab=staticfile
- **[MEDIUM]** `stream-json` docs + benchmark comparisons of `JSON.parse` vs streaming vs JSONL (npmjs.com/package/stream-json; jsonic.io/guides/stream-json-large-files; dev.to streaming write-ups)
- **[MEDIUM]** Prisma docs & issues — `createMany`/`skipDuplicates` semantics, no nested writes in `createMany`, `Decimal`=decimal.js serialization (prisma.io/docs/orm/prisma-client/queries/crud; github.com/prisma/prisma #20659, #6852, #25212)
- **[MEDIUM]** Record linkage literature — NCBI Bookshelf *An Overview of Record Linkage Methods* (NBK253312), US Census Bureau working papers (Winkler, rr93-8; carra-wp-2014-02): false-positive/false-negative causes, blocking, "ties → non-match"
- **[MEDIUM]** Bulk-delete practice — pgsql-postgresql mailing list threads on bulk delete, PlanetScale *The only scalable delete in Postgres is DROP TABLE*, PostgresAI *How to deal with bloat* (batched 1–2 s deletes, space not returned to OS, partition/drop for retention)
- **[MEDIUM]** Pew Research Center — *When Online Content Disappears* (May 2024): 21% of government pages have ≥1 broken link, 6% of government links dead, 16% redirect, ~6% point to static files
- **[MEDIUM]** ODU longitudinal link-rot study (via Internet Archive, Apr 2026): ~65% of sampled URLs dead on the live web
- **Project-internal:** `.planning/PROJECT.md` (bulk-URL dead-REST note, "never invent matches" mapping constraint, +160 MB budget), `.planning/codebase/CONCERNS.md` (N+1 sync pattern, silent `catch` adapters, duplicate triggers, GH minutes ceiling, `|| true` migration masking, `HttpClient` 429 bug), `.github/workflows/sync-camara.yml` (hardcoded `2024 2025 2026` loop, `timeout-minutes: 360`, guardrail pattern)

---
*Pitfalls research for: como-votei — módulo de despesas (cota parlamentar)*
*Researched: 2026-10-09*
