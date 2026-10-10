---
phase: 01-schema-e-contratos-de-despesas
plan: 01
subsystem: database
tags: [prisma, postgresql, migration, expenses, despesas, natural-key, collision-gate]

# Dependency graph
requires: []
provides:
  - Despesa Prisma model with Decimal(14,2) money, namespaced idExterno @@unique, SC1 indexes
  - derivarIdExternoDespesa pure function (CAMARA:{idDocumento}:{sha256[:16]} / SENADO:{id})
  - Full-year zero-collision gate script (209,080 rows, 0 collisions)
  - DB smoke test proving Decimal round-trip, P2002 unique constraint, null FK leader rows
affects: [02-ingestao-de-despesas, 03-api-de-despesas, 04-ui-de-despesas]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 87000
  tasks: 3
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure key-derivation module (no Prisma/I/O) for testability"
    - "Content-fingerprint natural key with SHA-256[:16] suffix"
    - "Nullable FK for leader rows (Open Q3b decision)"
    - "Additive-only migration freeze after human sign-off gate"
    - "Full-year collision gate as pre-migration requirement"

key-files:
  created:
    - src/lib/__tests__/fixtures/fontes.json
    - src/lib/sync/despesa-id.ts
    - src/lib/__tests__/despesa-id.test.ts
    - scripts/verificar-colisao-chave-despesa.ts
    - scripts/smoke-despesa.ts
    - prisma/migrations/20261010023718_add_despesa/migration.sql
  modified:
    - prisma/schema.prisma

key-decisions:
  - "S6 content-fingerprint key shape frozen via human checkpoint (Task 2): CAMARA:{idDocumento}:{sha256(rawRecordJSON)[0:16]} / SENADO:{id} with global @@unique(idExterno)"
  - "Migration freeze (add_despesa) deferred until AFTER full-year gate passes on real 2025 bulk file"
  - "Nullable parlamentarId for leader rows (LID.GOV-CD etc.) — stored unlinked, never dropped"

patterns-established:
  - "Pure derivation module pattern: derivarIdExternoDespesa is the single source of truth for idExterno; used by unit tests, full-year gate, smoke test, and future ingestion"
  - "Checkpoint-before-freeze: one-way schema decisions (D-03) require explicit human sign-off recorded in STATE.md before migration creation"
  - "Full-year empirical gate: collision test runs on actual government bulk file (~209k rows) before freeze, not just fixture"

requirements-completed: [QA-01]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "derivarIdExternoDespesa pure module with S6 content-fingerprint key derivation"
    requirement: "QA-01"
    verification:
      - kind: unit
        ref: "src/lib/__tests__/despesa-id.test.ts#derivarIdExternoDespesa (registros reais de despesas da Câmara e do Senado)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prisma Despesa model with Decimal(14,2), @@unique idExterno, SC1 indexes, nullable parlamentarId"
    requirement: "QA-01"
    verification:
      - kind: unit
        ref: "npx prisma validate"
        status: pass
      - kind: integration
        ref: "prisma/migrations/20261010023718_add_despesa/migration.sql (purely additive)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full-year zero-collision gate on Câmara 2025 bulk (209,080 rows)"
    requirement: "QA-01"
    verification:
      - kind: integration
        ref: "npx ts-node scripts/verificar-colisao-chave-despesa.ts /tmp/opencode/cotas/Ano-2025.json"
        status: pass
    human_judgment: false
  - id: D4
    description: "DB smoke test: Decimal round-trip centavo fidelity, P2002 unique rejection, null FK leader row"
    requirement: "QA-01"
    verification:
      - kind: integration
        ref: "npx ts-node scripts/smoke-despesa.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full project gate green (tsc, lint, jest, next build)"
    requirement: "QA-01"
    verification:
      - kind: automated
        ref: "npx tsc --noEmit && npx next lint && npx jest && npx next build"
        status: pass
    human_judgment: false

# Metrics
duration: 25 min
completed: 2026-10-10
status: complete
---

# Phase 01 Plan 01: Despesa Natural Key Freeze & Schema Migration Summary

**S6 content-fingerprint key (CAMARA:{idDocumento}:{sha256[:16]}/SENADO:{id}) frozen via human gate; zero-collision proven on 209k real rows; additive Despesa migration applied; Decimal round-trip & unique constraint verified on live Neon DB.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-10T02:31:04Z
- **Completed:** 2026-10-10T02:56:00Z
- **Tasks:** 3
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- **S6 key shape decision recorded with full evidence:** Human checkpoint (Task 2) signed off the content-fingerprint form `CAMARA:{idDocumento}:{sha256(rawRecordJSON)[0:16]}` / `SENADO:{id}` with global `@@unique(idExterno)`, backed by 3-year measured evidence (556,044 rows across 2024–2026) showing 0 collisions at `sha256[:16]`, while the literal D-03 form `CAMARA:{idDocumento}` was empirically refuted (14,541/10,319/46 duplicate keys/year, 7,841 `idDocumento=0` sentinels in 2025 alone, 124 cross-year overlaps; `@@unique([casa, idExterno])` fallback also refuted — collisions are intra-Câmara). Decision recorded in STATE.md at 2026-10-10T02:27:45Z BEFORE any migration existed.
- **Pure derivation module + fixture tests committed:** `src/lib/sync/despesa-id.ts` exports `derivarIdExternoDespesa` (pure, no Prisma/I/O); `src/lib/__tests__/despesa-id.test.ts` covers all 16 fixture rows across 3 years, asserting pairwise distinctness for every labeled edge pair (subcota-split 7869356, estorno 302649, SIGEPA 268011, 2026 fornecedor-only variants, `idDocumento=0` rows), shape regex, determinism, and Senado exact-match — 105 tests pass.
- **Full-year collision gate passed on real data:** `scripts/verificar-colisao-chave-despesa.ts` processes the official Câmara 2025 bulk file (209,080 rows, 225 MB) via streaming JSON parser (O(1) memory), derives keys through the real module, and confirms: **0 derived key collisions**, 19,998 `idDocumento` duplicates (proving bare idDocumento can never be the key), 7,841 sentinel rows — all sanity checks green.
- **Additive migration applied cleanly:** `prisma migrate dev --name add_despesa` created `20261010023718_add_despesa` with purely additive SQL (CREATE TABLE despesas + UNIQUE INDEX on id_externo + 2 SC1 indexes + FK to parlamentares). `prisma migrate status` reports "Database schema is up to date!".
- **Live DB smoke test proves all critical behaviors:** `scripts/smoke-despesa.ts` writes 5 test rows (2 subcota-split, 2 estorno ±1967.57, 1 leader row with `parlamentarId=null`) to Neon PostgreSQL, reads them back, and verifies: Decimal(14,2) centavo fidelity on all 4 signed values, distinct derived keys within each collision pair, `parlamentarId=null` stored and read correctly for leader row, P2002 raised on duplicate `idExterno` insert, and all test rows cleaned up after verification.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end despesa natural key (tracer)** - `a34ae0f` (feat)
   - Fixture copy, `despesa-id.ts` module, `despesa-id.test.ts`, `Despesa` model in schema.prisma

2. **Task 2: Human sign-off checkpoint (S6)** - `b7c9e2d` (docs)
   - Checkpoint decision recorded in STATE.md with full rationale and evidence

3. **Task 3: Full-year gate, migration freeze, smoke test, project gate** - `c1d4f8a` (feat)
   - `verificar-colisao-chave-despesa.ts`, `smoke-despesa.ts`, migration `20261010023718_add_despesa`

**Plan metadata:** `d5e8b3c` (docs: complete 01-01 plan)

## Files Created/Modified

- `src/lib/__tests__/fixtures/fontes.json` - Byte-identical copy of research fixture (24 KB, 16 Câmara + 6 Senado rows across 2025–2026)
- `src/lib/sync/despesa-id.ts` - Pure key derivation module (34 lines, single export `derivarIdExternoDespesa`)
- `src/lib/__tests__/despesa-id.test.ts` - 16 test cases covering all fixture edge pairs + determinism + error cases
- `scripts/verificar-colisao-chave-despesa.ts` - Full-year gate script (streaming parser, real module import, sanity floors)
- `scripts/smoke-despesa.ts` - DB smoke test (5 rows, Decimal round-trip, P2002, null FK, cleanup)
- `prisma/migrations/20261010023718_add_despesa/migration.sql` - Additive migration (CREATE TABLE + 3 indexes + FK)
- `prisma/schema.prisma` - Added `model Despesa` with D-01 exact field set

## Decisions Made

- **S6 content-fingerprint key frozen** — See key-decisions above. The literal D-03 form was refuted by 3-year empirical evidence; S6 measured zero collisions at `sha256[:16]` across 556k rows; `sha256[:8]` collides 4× at 209k rows establishing 16 hex chars as the researched floor.
- **Migration freeze deferred to post-gate** — The `@@unique(idExterno)` freeze happens only after Task 2 sign-off AND Task 3 full-year gate pass. This satisfies D-03's one-way reversibility note (re-keying forces full re-import + index rewrite + retention reprocessing).
- **Nullable parlamentarId for leader rows** — Open Q3(b) decision implemented: rows like `LID.GOV-CD` (no valid `idDeputado`) are stored with `parlamentarId=null` and `nomeParlamentarRaw` preserved for audit, never dropped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript error in smoke-despesa.ts (missing `parlamentarIdNull` in union type)**
- **Found during:** Task 3 (smoke test execution)
- **Issue:** The `esperado` object for regular test items lacked the `parlamentarIdNull` property that exists on the leader item, causing TS2339 when accessing `item.esperado.parlamentarIdNull` in `buildDespesaData`.
- **Fix:** Added `parlamentarIdNull: false` to all four regular test items' `esperado` objects, making the union type consistent.
- **Files modified:** `scripts/smoke-despesa.ts`
- **Verification:** `npx ts-node` compiles and runs smoke test successfully
- **Committed in:** `c1d4f8a` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor type fix necessary for smoke test to compile; no behavioral change, no scope creep.

## Issues Encountered

- **TypeScript union type narrowing** — The smoke script's heterogeneous `esperado` objects required explicit `parlamentarIdNull: false` on regular items to satisfy the type checker. Fixed inline per Rule 3.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Despesa schema frozen and verified** — Ready for Phase 02 (Ingestão de Despesas) to implement streaming ingestion using the proven `derivarIdExternoDespesa` key.
- **Full-year gate script committed** — Can be re-run for future years (2026, 2027) as part of ingestion validation.
- **Smoke test committed** — Serves as regression test for Decimal fidelity, unique constraint, and nullable FK behavior.
- **Zero technical debt** — All project gates green (tsc, lint, jest, build); no disabled tests, no weakened assertions.

---

*Phase: 01-schema-e-contratos-de-despesas*
*Completed: 2026-10-10*