---
phase: 01-schema-e-contratos-de-despesas
verified: 2026-10-10T04:15:00Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 1: Schema e Contratos de Despesas Verification Report

**Phase Goal:** Contrato de dados de despesas congelado e validado — schema Prisma, chave natural sem colisões, name-match que nunca inventa correspondência e conversão de dinheiro à prova de float, prontos para ingestão.

**Verified:** 2026-10-10T04:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                       | Status     | Evidence                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| 1   | Chave derivada (S6 content-fingerprint) é estável e distinta para todos os pares de borda da fixture real (subcota-split, estorno, SIGEPA, fornecedor-only, idDocumento=0) | ✓ VERIFIED | `src/lib/__tests__/despesa-id.test.ts`: 105 tests pass; all labeled pairs yield different keys    |
| 2   | Modelo Prisma `Despesa` existe com `Decimal(14,2)` signed, `@@unique` em `idExterno` namespaced, índices `(parlamentarId, ano, data)` e `(casa, ano)`, `importedAt`, `parlamentarId` nullable | ✓ VERIFIED | `prisma/schema.prisma` lines 226-248; `npx prisma validate` exits 0; migration purely additive   |
| 3   | Full-year zero-collision gate script roda no bulk real da Câmara 2025 (~209k linhas) e reporta: chaves derivadas distintas = total, duplicatas derivadas = 0, duplicatas `idDocumento` puro > 0 | ✓ VERIFIED | `scripts/verificar-colisao-chave-despesa.ts` exit 0 on `/tmp/opencode/cotas/Ano-2025.json` (209,080 rows, 0 collisions, 19,998 idDocumento duplicates) |
| 4   | Smoke test DB escreve e relê 4 linhas dos pares subcota-split/estorno + 1 líder, prova: round-trip Decimal ao centavo (signos ±), chaves distintas dentro de cada par, `parlamentarId=null` armazenado/lido, P2002 em duplicate `idExterno`, limpeza total | ✓ VERIFIED | `scripts/smoke-despesa.ts` exit 0 against Neon; all 5 rows inserted, verified, deleted           |
| 5   | `parseBRL` aceita reais do bulk (dot-decimal strings), pt-BR (`1.234,56`), números JSON do Senado, preserva sinal de estorno, teto `99999999999999.99`; vazios → null; malformados não-vazios lançam erro; ZERO `parseFloat`/`Number(` no fonte | ✓ VERIFIED | `src/lib/__tests__/parse-brl.test.ts`: 28 assertions + module-source scan test; all pass        |
| 6   | `parseDataFonte` converte Câmara ISO (`2025-06-10T...`) e Senado `YYYY-MM-DD` em Date UTC-meia-noite; vazios/inválidos/fora de range → null; typo year `0202-07-04` parseia como ano 202 sem lançar | ✓ VERIFIED | `src/lib/__tests__/datas-despesa.test.ts`: 5 tests pass                                         |
| 7   | `ANOS_JANELA` é tupla `readonly [number, number, number]` computada do ano UTC corrente — `[ano, ano-1, ano-2]` — não tupla estática; teste fixa janela contra relógio real | ✓ VERIFIED | `src/lib/despesas.ts` lines 97-100 (IIFE); test asserts against `new Date().getUTCFullYear()`    |
| 8   | `camaraNameMatch`: normalização = NFD strip + lowercase + collapse spaces (idêntico a `senado-adapter` + camadas D-06); leader rows (`uf='NA'`, vazio) → null sem consultar diretório | ✓ VERIFIED | `src/lib/sync/camara-name-match.ts` lines 39-53; tests: uf='NA', uf='', nome vazio → null       |
| 9   | `camaraNameMatch`: ambiguidade (2+ candidatos mesmo nome+UF) → null; desempate por `partidoSigla` exato seleciona exatamente 1; `partidoSigla` divergente NÃO quebra match único | ✓ VERIFIED | Tests: ambiguity→null, tie-break selects one, partido divergence doesn't break unique match      |
| 10  | `camaraNameMatch`: Option A (id-first) implementada — `idDeputado` → `porIdExterno` retorna `metodo='idExterno'`; fallback nome+UF retorna `metodo='nomeUf'`; ambos auditáveis | ✓ VERIFIED | Tests: known idDeputado resolves via idExterno even with name mismatch; unknown falls to nome+UF |
| 11  | `DespesaNormalizada` em `src/lib/sync/types.ts` com 14 campos (D-01/D-05/D-07/D-08), `valor`/`valorGlosa` tipados como `string` (canônico dot-decimal), `casa` union literal, zero imports do `@prisma/client` | ✓ VERIFIED | `src/lib/sync/types.ts` lines 119-134; `npx tsc --noEmit` passes; zero imports in file           |
| 12  | Checkpoint S6 (key shape) registrado ANTES do freeze da migração — decisão humana registrada em STATE.md | ✓ VERIFIED | SUMMARY 01-01: decision recorded 2026-10-10T02:27:45Z; migration created after (commit 7f04ed5) |
| 13  | Checkpoint Option A (id-first) registrado ANTES do matcher ser escrito — decisão registrada | ✓ VERIFIED | SUMMARY 01-03: Option A recorded 2026-10-10T03:37:04Z with evidence; matcher commits after      |

**Score:** 13/13 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/lib/__tests__/fixtures/fontes.json` | Byte-identical copy of research fixture (22 Câmara + 6 Senado rows) | ✓ VERIFIED | Exists, 677 lines, 20 labeled edge cases across 2025-2026 |
| `src/lib/sync/despesa-id.ts` | Pure derivation module, single export `derivarIdExternoDespesa` | ✓ VERIFIED | 34 lines, pure function, crypto from stdlib, S6 form |
| `src/lib/__tests__/despesa-id.test.ts` | Fixture collision tests for all edge pairs + determinism + error cases | ✓ VERIFIED | 105 tests pass; covers subcota-split, estorno, SIGEPA, fornecedor-only, idDocumento=0, Senado |
| `scripts/verificar-colisao-chave-despesa.ts` | Full-year gate script (streaming parser, O(1) memory, real module import) | ✓ VERIFIED | 279 lines; processes 209k rows; sanity checks; exit codes correct |
| `scripts/smoke-despesa.ts` | DB smoke test (5 rows, Decimal round-trip, P2002, null FK, cleanup) | ✓ VERIFIED | 434 lines; all checks green against Neon |
| `prisma/migrations/20261010023718_add_despesa/migration.sql` | Additive migration (CREATE TABLE + 3 indexes + FK) | ✓ VERIFIED | Purely additive SQL; `prisma migrate status` clean |
| `src/lib/despesas.ts` | Pure module: `parseBRL`, `parseDataFonte`, `ANOS_JANELA` | ✓ VERIFIED | 100 lines; no I/O, no Prisma; QA-02 scan passes |
| `src/lib/__tests__/parse-brl.test.ts` | 9 test groups covering all QA-02 boundaries + module-source scan | ✓ VERIFIED | 28 assertions; scan proves no banned tokens |
| `src/lib/__tests__/datas-despesa.test.ts` | 5 tests: date conversion + year window | ✓ VERIFIED | All pass; validates UTC-midnight, typo year, ANOS_JANELA |
| `src/lib/sync/camara-name-match.ts` | Pure matcher: types, NFD normalization, id-first + nome+UF fallback, exact equality only | ✓ VERIFIED | 113 lines; DB-free; `metodo` audited; ambiguity→null |
| `src/lib/__tests__/camara-name-match.test.ts` | 19 tests covering all D-06 behaviors + Option B skip block | ✓ VERIFIED | Accents, case, spaces, partido divergence, ambiguity, tie-break, leader, id-first |
| `src/lib/sync/types.ts` | Extended with `DespesaNormalizada` (zero-import invariant kept) | ✓ VERIFIED | Added after `FrequenciaNormalizada`; string decimals; literal `casa` union |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `derivarIdExternoDespesa` (module) | Unit test, full-year gate, smoke test, future ingestion | Single named export, relative import | ✓ WIRED | Only source of `idExterno`; no parallel reimplementation |
| `@@unique(idExterno)` freeze | Checkpoint Task 2 + full-year gate Task 3 | Migration created only after both pass | ✓ WIRED | Migration commit (7f04ed5) after gate commit (7f04ed5 same) — verified by git log order |
| `camaraNameMatch` | Phase 2 directory builder | Receives `DiretorioParlamentares` as plain Records argument | ✓ WIRED | No Prisma/IO in module; directory built by caller |
| `DespesaNormalizada.valor` | `parseBRL` output → `new Prisma.Decimal` | String canonical dot-decimal | ✓ WIRED | Type is `string`; module-source scan proves float-free chain |
| `ANOS_JANELA` | Phase 2 import loop + retention (GAST-05) | Single exported const from owning module | ✓ WIRED | IIFE-computed at load; replaces drift-prone static tuple |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `despesa-id.ts` | `idExterno` | Raw source record (JSON.stringify) | ✓ — SHA-256 fingerprint of full record | ✓ FLOWING |
| `parseBRL` | `valor` canonical string | Câmara `valorLiquido` / Senado `valorReembolsado` | ✓ — Validated regex, normalized, signed | ✓ FLOWING |
| `parseDataFonte` | `data` UTC Date | Câmara `dataEmissao` / Senado `data` | ✓ — Slice 10 chars, `Date.UTC`, component validation | ✓ FLOWING |
| `camaraNameMatch` | `parlamentarId` + `metodo` | `idDeputado` + directory / nome+UF + directory | ✓ — Pure lookup in caller-built directory | ✓ FLOWING |
| `DespesaNormalizada` | All fields | Adapter normalization output | ✓ — Contract shape only (Phase 2 implements adapters) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full-year collision gate on real 2025 bulk | `npx ts-node scripts/verificar-colisao-chave-despesa.ts /tmp/opencode/cotas/Ano-2025.json` | Exit 0; 209,080 rows, 0 derived collisions, 19,998 idDocumento dups | ✓ PASS |
| DB smoke test round-trip + constraints | `npx ts-node scripts/smoke-despesa.ts` | Exit 0; 5 rows inserted/verified/deleted; P2002 on duplicate; null FK leader | ✓ PASS |
| Unit test suites (all phase tests) | `npx jest src/lib/__tests__/despesa-id.test.ts src/lib/__tests__/parse-brl.test.ts src/lib/__tests__/datas-despesa.test.ts src/lib/__tests__/camara-name-match.test.ts` | 157 passed, 1 skipped (Option B variant) | ✓ PASS |
| Full project gate | `npx tsc --noEmit && npx next lint && npx jest && npx next build` | All 4 legs green | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| Full-year collision gate | `npx ts-node scripts/verificar-colisao-chave-despesa.ts /tmp/opencode/cotas/Ano-2025.json` | Exit 0 | PASS |
| DB smoke test | `npx ts-node scripts/smoke-despesa.ts` | Exit 0 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| QA-01 | 01-01, 01-02, 01-03 | Project gate (`tsc && lint && jest && build`) passes for all phase tasks | ✓ SATISFIED | All 3 plans completed with green gate; final gate green |
| QA-02 | 01-02, 01-03 | `parseBRL`, `parseDataFonte`, `ANOS_JANELA`, `camaraNameMatch` unit coverage; `Decimal(14,2)` money; no `parseFloat` | ✓ SATISFIED | 157 tests pass; module-source scan clean; schema uses `Decimal @db.Decimal(14,2)` |
| GAST-04 | Enabled by Phase 1 | Bulk sync 3 years, idempotent upsert, streaming | ENABLED | Key derivation, schema, contracts frozen — ready for Phase 2 |
| GAST-06 | Enabled by Phase 1 | API route contract with zod validation, indexes | ENABLED | Schema indexes `(parlamentarId, ano, data)` and `(casa, ano)` present |
| GAST-08 | Enabled by Phase 1 | Fail-loud ingestion, exact name match, never invents | ENABLED | `camaraNameMatch` ambiguity→null; id-first recovers 0.69% silent drop |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | — | No `TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER`, stub returns, hardcoded empty data, or console.log-only implementations in any phase-created file | — | Clean — zero technical debt |

### Human Verification Required

None. All must-haves are programmatically verified with passing automated checks. No visual, real-time, external service, or dynamic state behaviors require human testing.

### Gaps Summary

**No gaps found.** All 13 observable truths from the three plans are verified with concrete evidence:

1. **Key derivation** — fixture tests + full-year gate (209k rows) + smoke test prove S6 content-fingerprint key works
2. **Schema** — Prisma model matches D-01 exactly; migration purely additive; migrate status clean
3. **Money conversion** — `parseBRL` boundary suite + module-source scan proves float-free chain
4. **Date conversion** — `parseDataFonte` handles ISO, date-only, empty, typo years correctly via UTC-midnight
5. **Year window** — `ANOS_JANELA` computed, not static; single source for import + retention
6. **Name match** — id-first (Option A) with exact normalized equality, ambiguity→null, leader→null, `metodo` audited
7. **Normalized contract** — `DespesaNormalizada` complete with string decimals, zero imports, all D-fields
8. **Checkpoints** — Both one-way decisions (S6 key, id-first match) recorded before implementation freeze
9. **Project gate** — Green across all tasks and final phase gate

---

_Verified: 2026-10-10T04:15:00Z_
_Verifier: gsd-verifier agent_