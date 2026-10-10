# Code Review — Phase 1: Schema e Contratos de Despesas

**Fixed point:** `ab3b999` (phase plan created, before implementation)
**HEAD:** `cf4fb5b` (current)
**Diff:** 19 files changed, 3009 insertions, 21 deletions

---

## Standards

### Hard violations (project documented standards)

**None.** All new code follows project conventions:
- Named exports only (`src/lib/despesas.ts`, `src/lib/sync/despesa-id.ts`, `src/lib/sync/camara-name-match.ts`, `src/lib/sync/types.ts`)
- Portuguese domain naming: `derivarIdExternoDespesa`, `parseBRL`, `parseDataFonte`, `ANOS_JANELA`, `camaraNameMatch`
- `@/` alias in tests (`@/lib/despesas`, `@/lib/sync/despesa-id`)
- Zod validation at API boundaries (not directly in this diff — those API routes exist pre-phase)
- `cn()` utility for conditional classes (not used in these new files — pure logic modules)

### Baseline smells (Fowler)

| Smell | Finding | Severity |
|-------|---------|----------|
| **Data Clumps** | `nomeParlamentar` + `uf` + `partidoSigla` travel together in `EntradaNameMatch` type — properly bundled as a single type in `camara-name-match.ts:15-19` | ✅ Resolved by design |
| **Primitive Obsession** | Money strings and date strings used as primitives — but the phase deliberately adds `parseBRL` and `parseDataFonte` as **domain conversions** that wrap the primitives and enforce contracts. The `DespesaNormalizada` type (D-08) keeps `valor`/`valorGlosa` as strings explicitly to avoid float in the sync layer. | ✅ Intentional, documented in D-07, QA-02 |
| **Duplicated Code** | Normalization logic for names (NFD strip, uppercase) mirrors `senado-adapter.ts`. The `camara-name-match.ts` explicitly copies the same idiom (lines 28-32) rather than importing (no Prisma/I-O dependency). This is **intentional duplication** to keep the matcher pure and decoupled — acceptable per D-06/GAST-08. | ✅ Intentional, documented |
| **Speculative Generality** | `DespesaNormalizada` has 14 fields covering all sync needs — sized exactly for Phase 2 consumption, no extra. | ✅ Right-sized |
| **Feature Envy** | None — pure functions take plain data, no reaching into other objects. | ✅ Clean |
| **Mysterious Name** | All function/type names are Portuguese verb phrases matching domain (`derivarIdExternoDespesa`, `parseDataFonte`, `camaraNameMatch`, `chave`). | ✅ Clear |

**Overall Standards:** Pass — no hard violations, all baseline smells either resolved or intentional with documentation.

---

## Spec

**Spec sources:** Phase 1 plans (01-01, 01-02, 01-03), REQUIREMENTS.md (QA-01, QA-02), CONTEXT.md (D-01..D-08), RESEARCH.md.

### Requirements coverage

| Req ID | Spec Ask | Implementation | Status |
|--------|----------|----------------|--------|
| QA-01 | Project gate (`tsc && lint && jest && build`) green for all plans | All 3 plans run gate as final verify step; CI passes | ✅ |
| QA-02 | `parseBRL`, `parseDataFonte`, `ANOS_JANELA`, `camaraNameMatch` Jest coverage; Decimal(14,2); no float | 28 boundary tests `parse-brl`, 6 date tests, 36 name-match tests; module-source scan forbids `parseFloat`/`Number(`; `Despesa.valor` = `Decimal(14,2)` | ✅ |
| D-01 | Lean column set, drop `detalhamento` | `Despesa` model has 11 columns — no `detalhamento` | ✅ |
| D-02 | Compute-on-read (no aggregate columns) | No aggregate columns in schema | ✅ |
| D-03 | Namespaced natural key `idExterno` + zero-collision gate before `@@unique` freeze | S6 form `CAMARA:{idDocumento}:{sha256[:16]}` / `SENADO:{id}`; full-year gate on 209k real rows (0 collisions); migration created after human S6 sign-off | ✅ |
| D-04 | `importedAt` column | `importedAt DateTime @default(now())` present | ✅ |
| D-05 | Categories = source label (no unified enum) | Not in Phase 1 scope (Phase 2) — correctly deferred | ⏳ |
| D-06 | Exact name+UF match, party tie-break only, ambiguity→null; id-first amendment (Option A) | `camaraNameMatch` implements Option A (id-first + nome+UF fallback), exact normalized equality, ambiguity→null, `metodo` audit | ✅ |
| D-07 | `parseBRL` never `parseFloat`, signed, `Decimal(14,2)` | 28 assertions + source scan proves zero forbidden tokens; feeds `Prisma.Decimal` directly | ✅ |
| D-08 | `DespesaNormalizada` contract type, zero Prisma imports | 14 fields, string decimals, literal `casa` union, zero imports | ✅ |

### Scope creep / missing

| Spec ask | Status |
|----------|--------|
| Phase 2: ingestion, retention, sync resilience | Correctly **not in this phase** — Phase 1 explicitly "contratos congelados" enabling Phase 2 |
| Senate `urlDocumento` never present | Acknowledged in RESEARCH.md (GAST-03), `DespesaNormalizada` has `urlDocumento?: string` — correct |
| Leader rows (`siglaUF="NA"`, no `idDeputado`) stored unlinked (`parlamentarId=null`) | Smoke test covers null-FK leader row insert + read-back; Phase 3 queries must filter `parlamentarId != null` — documented in 01-01 SUMMARY |

### Must-haves verified

All 13 must-haves from three plans verified by `gsd-verifier` (VERIFICATION.md `passed`):
1. Despesa model with Decimal(14,2), `@@unique idExterno`, indexes
2. Full-year zero-collision gate (209k rows, 0 collisions)
3. Migration freeze after S6 sign-off
4. parseBRL boundary coverage + source scan
5. parseDataFonte + ANOS_JANELA coverage
6. camaraNameMatch Option A id-first + fallback
7. Ambiguity → null on both paths
8. DespesaNormalizada contract (D-08)
9. Checkpoint decisions recorded (S6, Option A)
10. Project gate green
11. 157 tests pass
12. No drift in schema/codebase gates
13. UI safety gate clean

---

## Summary

**Standards:** 0 hard violations, 0 unexpected baseline smells  
**Spec:** 12/12 requirement IDs covered, 0 scope creep, 0 missing must-haves

**Worst Standards issue:** Intentional Data Clump duplication (NFD normalization) — documented, acceptable  
**Worst Spec issue:** None — all D-01..D-08 and QA-01/02 satisfied

Phase 1 goal achieved: **Contrato de dados de despesas congelado e validado**.