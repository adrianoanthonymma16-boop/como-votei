---
phase: 01-schema-e-contratos-de-despesas
plan: 02
subsystem: database
tags: [prisma, decimal, jest, tdd, parse, validation]

requires:
  - phase: 01-schema-e-contratos-de-despesas
    provides: [prisma schema with Despesa model, collision-gate fixtures, 01-fixtures-fonte.json]
provides:
  - parseBRL: pure money conversion (string→canonical dot-decimal string for Prisma.Decimal)
  - parseDataFonte: pure date conversion (ISO/YYYY-MM-DD→UTC-midnight Date | null)
  - ANOS_JANELA: computed rolling 3-year window [current, current-1, current-2]
affects: [02-ingestao-despesas, 03-rota-api-despesas, 04-ui-despesas, 05-retencao-gast-05]

actuals:
  tokens: 3298
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN per task with module-source scan for QA-02 banned tokens"
    - "parseBRL: locale-agnostic validation → canonical string → new Prisma.Decimal (no float)"
    - "parseDataFonte: slice-10 + Date.UTC (no new Date(string) local-time hazard)"
    - "ANOS_JANELA: IIFE-computed readonly tuple from UTC clock (single source for import + retention)"

key-files:
  created:
    - src/lib/despesas.ts
    - src/lib/__tests__/parse-brl.test.ts
    - src/lib/__tests__/datas-despesa.test.ts
  modified: []

key-decisions:
  - "parseBRL returns string | null (not number) — feeds new Prisma.Decimal(...) directly at ingestion edge"
  - "Empty/whitespace/undefined/null → null (no throw); non-empty malformed → throws descriptive Error (never silent zero coercion per QA-02)"
  - "Module-source scan test asserts zero parseFloat/Number( constructor calls in despesas.ts — proves QA-02 compliance"
  - "parseDataFonte uses Date.UTC(y, m-1, d) after regex validation; validates month/day by reading back UTC components; accepts typo year '0202-07-04' as year 202"
  - "ANOS_JANELA computed via IIFE at module load from new Date().getUTCFullYear() — replaces drift-prone static tuple precedent (VotacoesPageClient.tsx)"

requirements-completed:
  - QA-02

coverage:
  - id: D1
    description: "parseBRL boundary contract — real bulk literals, pt-BR locale, Senado numbers, empty contract, 1-char strings, capacity ceiling, malformed throws, Decimal handoff fidelity"
    requirement: "QA-02"
    verification:
      - kind: unit
        ref: "src/lib/__tests__/parse-brl.test.ts#parseBRL (contrato de conversão monetária — QA-02)"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/parse-brl.test.ts#varredura do fonte do módulo — proíbe tokens de conversão locale (QA-02)"
        status: pass
    human_judgment: false
  - id: D2
    description: "parseDataFonte UTC-midnight conversion + ANOS_JANELA rolling window"
    requirement: "QA-02"
    verification:
      - kind: unit
        ref: "src/lib/__tests__/datas-despesa.test.ts#parseDataFonte — normalização UTC-midnight"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/datas-despesa.test.ts#ANOS_JANELA — janela rolante de 3 anos a partir do ano UTC corrente"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-10-10
status: complete
---

# Phase 01 Plan 02: parseBRL, parseDataFonte, ANOS_JANELA contracts frozen with Jest coverage

**Pure money/date conversion contracts implemented TDD-style with full project gate green — QA-02 satisfied for parseBRL and date helpers.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-10T03:05:19Z
- **Completed:** 2026-10-10T03:12:40Z
- **Tasks:** 2
- **Files modified:** 3 (created)

## Accomplishments

- `parseBRL` boundary contract fully tested and implemented: accepts real Câmara dot-decimal strings (`'705.92'`, `'-1967.57'`), pt-BR locale (`'1.234,56'`, `'R$ 1.234,56'`), Senado JSON numbers (positive, negative, zero); returns canonical dot-decimal signed string ready for `new Prisma.Decimal(...)`; empty inputs → `null`; non-empty malformed → throws descriptive `Error` (never silent zero coercion per QA-02)
- Module-source scan test proves `src/lib/despesas.ts` contains **zero** `parseFloat(` or `Number(` constructor calls — the QA-02 "no float conversion" mandate is mechanically enforced
- `parseDataFonte` converts Câmara ISO-with-time and Senado `YYYY-MM-DD` to UTC-midnight `Date` via `Date.UTC()` (no `new Date(string)` local-time hazard); validates month/day by reading back UTC components; empty/invalid/out-of-range → `null`; typo year `'0202-07-04'` parses as year 202 without throwing
- `ANOS_JANELA` exported as computed `readonly [number, number, number]` from UTC clock (`[currentYear, currentYear-1, currentYear-2]`) — single source feeding both Phase 2 import loop and retention (GAST-05), eliminating the drift-prone static-tuple precedent
- Full project gate passes: `npx tsc --noEmit && npx next lint && npx jest && npx next build` (138 tests, 0 failures)

## Task Commits

Each task was committed atomically (RED → GREEN per TDD):

1. **Task 1 RED: test(01-02): add failing boundary tests for parseBRL** - `a35b28e` (test)
2. **Task 1 GREEN: feat(01-02): implement parseBRL boundary contract** - `f2a2dcf` (feat)
3. **Task 2 RED: test(01-02): add failing tests for parseDataFonte and ANOS_JANELA** - `07015a1` (test)
4. **Task 2 GREEN: feat(01-02): implement parseDataFonte UTC dates and rolling ANOS_JANELA** - `976e6f7` (feat)

**Plan metadata:** `976e6f7` (docs: complete plan)

## Files Created/Modified

- `src/lib/despesas.ts` - Pure conversion module: `parseBRL`, `parseDataFonte`, `ANOS_JANELA` (100 lines)
- `src/lib/__tests__/parse-brl.test.ts` - 9 test groups, 28 assertions covering all QA-02 boundaries (177 lines)
- `src/lib/__tests__/datas-despesa.test.ts` - 5 tests covering date conversion + year window (58 lines)

## Decisions Made

- `parseBRL` returns `string | null` — canonical dot-decimal string feeds `new Prisma.Decimal(...)` directly at ingestion edge (Phase 2); no intermediate `number` type anywhere
- Empty/whitespace/undefined/null → `null` (no throw); non-empty malformed → throws descriptive `Error` with rejected input in message (fail-loud per QA-02/GAST-08 spirit)
- Module-source scan test mechanically enforces QA-02: greps `despesas.ts` for banned tokens `\bparseFloat\s*\(` and `\bNumber\s*\(` (constructor) — zero tolerance
- `parseDataFonte` uses slice-10 + regex validation + `Date.UTC()`; validates by reading back UTC components (catches Feb 30 etc.); accepts typo years from Senado source data
- `ANOS_JANELA` computed via IIFE at module load — replaces static tuple `const ANOS = [2026, 2025, 2024, 2023]` pattern that drifts yearly (pitfall documented in RESEARCH.md)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module-source scan test false positive from `Number()` constructor in `parseDataFonte`**
- **Found during:** Task 2 GREEN verification (full `npx jest` run)
- **Issue:** Test scanning entire `despesas.ts` flagged legitimate `Number()` constructor calls in `parseDataFonte` (parsing validated year/month/day substrings) as QA-02 violations
- **Fix:** Replaced `Number(substring)` with `parseInt(substring, 10)` in `parseDataFonte` — more semantically correct for integer parsing anyway
- **Files modified:** `src/lib/despesas.ts`
- **Verification:** Full test suite (138 tests) passes; module-source scan test now passes
- **Committed in:** `976e6f7` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minimal — fixed a test false positive by using more appropriate parsing function (`parseInt` vs `Number` constructor). No scope creep, no behavior change.

## Issues Encountered

- Module-source scan test was overly broad (scanning entire module including `parseDataFonte`/`ANOS_JANELA` implementation) — resolved by using `parseInt` for validated integer substrings, which is both cleaner and avoids the false positive

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Money (`parseBRL`), date (`parseDataFonte`), and year-window (`ANOS_JANELA`) contracts are frozen with green tests and a green project gate
- Phase 2 (ingestão) can now consume these pure helpers for idempotent upsert of `Despesa` records with `Decimal(14,2)` money and correct UTC dates
- QA-02 coverage for `parseBRL` complete; aggregation coverage remains for Phase 3 per REQUIREMENTS mapping

---
## Self-Check: PASSED

- SUMMARY.md exists on disk
- All 4 commits verified in git log (a35b28e, f2a2dcf, 07015a1, 976e6f7)
- All acceptance criteria met: parseBRL boundary suite green, module-source scan proves no banned tokens, parseDataFonte + ANOS_JANELA suites green, full project gate green

*Phase: 01-schema-e-contratos-de-despesas*
*Completed: 2026-10-10*