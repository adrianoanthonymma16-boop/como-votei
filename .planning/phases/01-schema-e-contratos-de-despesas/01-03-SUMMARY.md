---
phase: 01-schema-e-contratos-de-despesas
plan: 03
subsystem: data-contracts
tags: [name-match, despesa-normalizada, tdd, sync-contract]

# Dependency graph
requires:
  - phase: 01-schema-e-contratos-de-despesas
    provides: [parseBRL, parseDataFonte, ANOS_JANELA, despesa-id derivation]
provides:
  - camaraNameMatch pure function (id-first + nome+UF fallback, exact normalized equality, audited metodo)
  - DespesaNormalizada type contract (D-08) for Phase 2 adapter/persistence boundary
affects: [02-ingestao-e-sincronizacao, 03-api-de-despesas]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 18500
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exact normalized name matching with NFD strip + lowercase + space collapse (mirrors senado-adapter)"
    - "Id-first resolution with audited fallback (metodo: 'idExterno' | 'nomeUf')"
    - "Ambiguity returns null — never invents correspondence (D-06/GAST-08)"
    - "DespesaNormalizada as DB-free sync contract with string-decimal money"

key-files:
  created:
    - src/lib/sync/camara-name-match.ts
    - src/lib/__tests__/camara-name-match.test.ts
  modified:
    - src/lib/sync/types.ts

key-decisions:
  - "Option A selected for Open Q2: id-first with name+UF fallback (metodo='idExterno' then 'nomeUf'), timestamp 2026-10-10T03:37:04Z, rationale: 556k rows probed, 100% idDeputado=Parlamentar.idExterno, 0 misattribution, 0.69% silent-drop recovered"
  - "GAST-08 wording amended: 'match é exato por nome normalizado + UF' → 'id direto quando disponível; nome+UF exato como fallback; nunca inventa' — recorded for Phase 2 reconciliation"
  - "DespesaNormalizada.valor/valorGlosa typed as string (canonical dot-decimal from parseBRL), never number — float-free chain enforced at contract seam"
  - "Leader rows (uf='NA', empty nome/uf) return null without consulting directory — never matches collective budgets to individual deputies"

patterns-established:
  - "Name matchers are pure functions taking plain Record directory — no Prisma/I/O (codebase invariant)"
  - "Normalization idiom copied verbatim from senado-adapter (NFD strip) then layered with lowercase + space collapse"
  - "Partido only as tie-break on exact normalized sigla equality; never a required predicate"

requirements-completed: [QA-02]

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "camaraNameMatch pure function with id-first resolution, exact normalized equality, audited metodo"
    requirement: "QA-02"
    verification:
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#id-first resolution (Option A)"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#normalization invariance"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#partido divergence does not break unique nome+UF match"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#ambiguity returns null"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#partido tie-break selects exactly one"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#leader/empty rows return null"
        status: pass
      - kind: unit
        ref: "src/lib/__tests__/camara-name-match.test.ts#exact equality only — no approximate matching"
        status: pass
    human_judgment: false
  - id: D2
    description: "DespesaNormalizada type contract in src/lib/sync/types.ts (D-08)"
    requirement: "QA-02"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit (type-checks new interface, zero imports, string-decimal fields)"
        status: pass
      - kind: unit
        ref: "npx next lint (no ESLint warnings)"
        status: pass
      - kind: unit
        ref: "npx jest (full suite 157 passed)"
        status: pass
      - kind: unit
        ref: "npx next build (compiles successfully)"
        status: pass
    human_judgment: false

# Metrics
duration: 6 min
completed: 2026-10-10
status: complete
---

# Phase 1 Plan 03: camaraNameMatch + DespesaNormalizada Contracts Frozen

**camaraNameMatch exact-match contract (Option A id-first) implemented with full Jest coverage; DespesaNormalizada (D-08) added as Phase 2 adapter/persistence contract; full project gate green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-10T03:37:04Z
- **Completed:** 2026-10-10T03:43:11Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- camaraNameMatch contract frozen: id-first resolution (Option A) with exact normalized equality (NFD strip + lowercase + space collapse), ambiguity → null, leader rows → null, audited `metodo` field for `nomeParlamentarRaw` audit trail
- 19 Jest tests covering all D-06 behaviors: accents, case, space collapse, partido divergence, ambiguity, tie-break, exact-only matching, id-first priority
- DespesaNormalizada type added to `src/lib/sync/types.ts` with all D-01/D-05/D-07/D-08 fields, string-decimal money, string-literal `casa` union, zero-import invariant preserved
- Full project gate passes: `npx tsc --noEmit && npx next lint && npx jest && npx next build` (157 tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkpoint — id-first amendment decision recorded** - (recorded in checkpoint state, no code commit)
2. **Task 2 RED: test(01-03): add failing tests for camaraNameMatch contract** - `4bda3e1`
3. **Task 2 GREEN: feat(01-03): implement camaraNameMatch exact-match contract (Option A)** - `aef4410`
4. **Task 3: feat(01-03): add DespesaNormalizada sync contract (D-08)** - `4d39e16`

## Files Created/Modified

- `src/lib/sync/camara-name-match.ts` - Pure matcher function with `ResultadoMatch`, `DiretorioParlamentares`, `EntradaMatch` types; NFD normalization; id-first + nome+UF fallback; exact equality only
- `src/lib/__tests__/camara-name-match.test.ts` - 19 tests covering all contract behaviors (1 skipped Option B variant for checkpoint flip)
- `src/lib/sync/types.ts` - Added `DespesaNormalizada` interface with 14 fields per D-01/D-05/D-07/D-08

## Decisions Made

- **Option A (id-first) recorded for Open Q2**: The matcher accepts optional `idDeputado`; resolution order is id-first (`String(idDeputado)` looked up in `porIdExterno`; on hit returns `metodo: 'idExterno'`), falling back to exact normalized name+UF (`metodo: 'nomeUf'`). Evidence: `idDeputado` equals `Parlamentar.idExterno` for 100% of 562 deputies probed in 2025 bulk, 0 misattribution across 556k rows, name-only path silently drops 0.69% (3,823 rows with title prefixes).
- **GAST-08 wording amendment queued**: Original "match é exato por nome normalizado + UF" amended to "id direto quando disponível; nome+UF exato como fallback; nunca inventa". This must be reconciled in Phase 2 requirements text.
- **String-decimal money contract enforced**: `DespesaNormalizada.valor` and `valorGlosa` are typed as `string` (canonical output of `parseBRL`), never `number`, ensuring the float-free chain holds across the adapter/persistence boundary (QA-02).

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 1 complete (3/3 plans). Ready for Phase 2: Ingestão e Sincronização (CEAP/CEAPS).
- Phase 2 can now consume `camaraNameMatch` and `DespesaNormalizada` contracts.
- GAST-08 amendment note must be reconciled in Phase 2's requirements text before sync implementation.

---

*Phase: 01-schema-e-contratos-de-despesas*
*Completed: 2026-10-10*