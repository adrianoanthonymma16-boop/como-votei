# Walking Skeleton — Como Votei

**Phase:** 1
**Generated:** 2026-10-09

> Note: the app shell (Next.js 14 App Router, Prisma/Neon, Vercel, public/no-auth) predates this milestone and is already in production. This skeleton records the **despesas data-contract slice** Phase 1 proves end-to-end and that Phases 2–4 build on without altering its decisions.

## Capability Proven End-to-End

> A real Câmara bulk expense row can be keyed deterministically (`derivarIdExternoDespesa`), its money converted float-free (`parseBRL` → `Prisma.Decimal`), and written/read back from Postgres through the frozen `Despesa` schema — with zero key collisions proven against a full real year (~209k rows) before the `@@unique` was committed.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router (existing, unchanged) | Already in production; this phase adds no routes |
| Data layer | Prisma + PostgreSQL (Neon free tier) | Existing stack; `Despesa` adds the first `Decimal(14,2)` money columns |
| Natural key | `CAMARA:{idDocumento}:{sha256(rawRecordJSON)[0:16]}` / `SENADO:{id}`, global `@@unique(idExterno)` (D-03 amended to S6 after full-year zero-collision gate; human sign-off before freeze) | Literal `CAMARA:{idDocumento}` refuted on all 3 real years (14,541/10,319/46 dup keys/yr + `idDocumento=0` sentinels); S6 = 0 collisions in 556,044 rows, by-construction for distinct content |
| Money contract | `parseBRL(unknown): string \| null` → canonical signed dot-decimal string → `new Prisma.Decimal` (D-07) | Float-free chain (QA-02); loud failure on malformed, null only on empty; pt-BR + bulk + Senado-number inputs covered |
| Name attribution | `camaraNameMatch`: id-first (`idDeputado` → `Parlamentar.idExterno`) with exact normalized name+UF fallback; ambiguity → null; `metodo` audited (D-06 + id-first amendment) | 0 misattribution in 556k rows; name-only silently drops 0.69%; matcher stays DB-free (directory is an argument) |
| Year window | `ANOS_JANELA` computed from UTC current year: `[ano, ano-1, ano-2]`, exported from `src/lib/despesas.ts` | Single source feeds Phase 2 import loop AND 3-year retention; static tuples drift (prior pitfall 5) |
| Auth | None (public product, no middleware) | Unchanged — CONTEXT invariant |
| Deployment target | Vercel `gru1` + GitHub Actions sync (existing) | Unchanged; migration applies via `prisma migrate` at build |
| Directory layout | Pure domain in `src/lib/`, DB-free sync contracts in `src/lib/sync/`, persistence in `scripts/`, tests in `src/lib/__tests__/` | Existing codebase invariant; new modules (`despesa-id.ts`, `camara-name-match.ts`, `despesas.ts`) follow it exactly |

## Stack Touched in Phase 1

- [x] Fixtures — committed real-source extracts (`src/lib/__tests__/fixtures/fontes.json`, 20 labeled rows)
- [x] Key derivation — `src/lib/sync/despesa-id.ts` + collision suite + full-year gate script
- [x] Database — `Despesa` model + additive migration + live-DB smoke (real write AND read, Decimal round-trip)
- [x] Contracts — `parseBRL` / `parseDataFonte` / `ANOS_JANELA` (`src/lib/despesas.ts`), `DespesaNormalizada` (`src/lib/sync/types.ts`), `camaraNameMatch`
- [ ] UI / routes — none in this phase (by design; Phase 3 adds the despesas route/tab)
- [x] Deployment gate — full project gate (`tsc && lint && jest && build`) green locally; CI unchanged

## Out of Scope (Deferred to Later Slices)

- Bulk ingestion itself — streaming unzip + `stream-json` parse, upsert with `importedAt` reconcile, `--apenas-despesas` sync phase (Phase 2, GAST-04)
- Match-rate sanity gates, failure-loud ingestion, retention of years outside the window (Phase 2, GAST-08/GAST-05)
- `GET /api/parlamentares/[id]/despesas`, aggregation math (totals/percentuais), UI (Phases 3–4, GAST-06)
- Senado CEAPS fetch wiring beyond the frozen `SENADO:{id}` key and `SENADO_ADM_BASE` constant (Phase 2)
- `detalhamento` column and any aggregate/summary columns or tables (dropped by D-01/D-02 — do not re-litigate)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: despesas of the last 3 years ingested from both houses — streaming bulk parse, idempotent upsert keyed by the frozen `idExterno`, matcher wired with directory build, loud-failure gates, retention
- Phase 3: public despesas route + tab — list, filters, aggregated summary computed on read from the same snapshot
- Phase 4: end-to-end Playwright flow + presentation polish across the product
