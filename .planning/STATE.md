---
gsd_state_version: 1.0
current_phase: 01
current_phase_name: Schema e Contratos de Despesas
status: verifying
stopped_at: Phase 2 context gathered
last_updated: "2026-10-10T04:14:03.691Z"
last_activity: 2026-10-09
last_activity_desc: Phase 01 execution started
state_head: 4cd0d6ed5cdea871d3c2a4f068dd4167144f8479
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 25
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** Dar visibilidade pública e gratuita ao comportamento parlamentar — se o dado oficial de uma votação, discurso, proposição ou gasto não estiver acessível e verificável aqui, o produto falhou.
**Current focus:** Phase 01 — Schema e Contratos de Despesas

## Current Position

Phase: 01 (Schema e Contratos de Despesas) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-10-09 — Phase 01 execution started

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: Stable

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 25 min | 3 tasks | 8 files |
| Phase 01-schema-e-contratos-de-despesas P02 | 7 min | 2 tasks | 3 files |
| Phase 01-schema-e-contratos-de-despesas P03 | 6 min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Ordem data-first (Schema → Ingestão → API → UI) seguindo research/SUMMARY.md; UI nunca antes dos dados confiáveis
- [Roadmap]: OPS-01 pertence à Phase 2 — o fix do gatilho duplicado 03:00 UTC precisa existir antes de qualquer delete reativo (GAST-05)
- [Roadmap]: 4 fases em vez das 5 do research — a Phase 5 do research (v1.x enhancements: link-health, evolução mensal, CSV) já está deferred em REQUIREMENTS.md (GAST-V2-01..06)
- [01-01 T2 checkpoint, S6 sign-off 2026-10-10T02:27:45Z]: idExterno key shape frozen as S6 content-fingerprint `CAMARA:{idDocumento}:{sha256(rawRecordJSON)[0:16]}` / `SENADO:{id}` with global `@@unique(idExterno)` (D-03 amended) — rationale: 3-year measured evidence (556,044 rows 2024–2026) shows 0 collisions at sha256[:16]; literal D-03 form `CAMARA:{idDocumento}` refuted (14,541/10,319/46 duplicate keys per year, idDocumento=0 sentinels, 124 cross-year overlaps; `@@unique([casa, idExterno])` fallback refuted too — collisions are intra-Câmara); sha256[:8] collides 4× at 209k rows so 16 hex chars is the researched floor. Recorded BEFORE the `add_despesa` migration freeze (Task 2 gate verify: no `prisma/migrations/*add_despesa*` existed at sign-off).
- [Phase 01]: S6 content-fingerprint key shape frozen via human checkpoint (Task 2) — 3-year measured evidence (556,044 rows 2024-2026) shows 0 collisions at sha256[:16]; literal D-03 form CAMARA:{idDocumento} refuted (14,541/10,319/46 duplicate keys/year, idDocumento=0 sentinels, 124 cross-year overlaps; @@unique([casa, idExterno]) fallback refuted too); sha256[:8] collides 4x at 209k rows so 16 hex chars is the researched floor
- [Phase 01]: parseBRL returns string | null — canonical dot-decimal string feeds new Prisma.Decimal(...) directly at ingestion edge
- [Phase 01]: Empty/whitespace/undefined/null → null; non-empty malformed → throws descriptive Error (fail-loud per QA-02)
- [Phase 01]: Module-source scan test mechanically enforces QA-02: zero parseFloat/Number( constructor calls in despesas.ts
- [Phase 01]: parseDataFonte uses slice-10 + regex + Date.UTC(); validates by reading back UTC components; accepts typo years
- [Phase 01]: ANOS_JANELA computed via IIFE from UTC clock — single source for Phase 2 import loop and retention (GAST-05)
- [Phase 01]: Option A selected for Open Q2: id-first with name+UF fallback (metodo='idExterno' then 'nomeUf') — 556k rows probed, 100% idDeputado=Parlamentar.idExterno, 0 misattribution, 0.69% silent-drop recovered
- [Phase 01]: GAST-08 wording amended: 'match é exato por nome normalizado + UF' → 'id direto quando disponível; nome+UF exato como fallback; nunca inventa' — Recorded for Phase 2 reconciliation; id-first evidence proves 0 misattribution and recovers 0.69% silent drop
- [Phase 01]: DespesaNormalizada.valor/valorGlosa typed as string (canonical dot-decimal from parseBRL), never number — Float-free chain enforced at contract seam per QA-02; new Prisma.Decimal(valor) is lossless

### Pending Todos

None yet.

### Blockers/Concerns

- Research flags abertos: colisão da chave natural (Phase 1, teste de fixture real), taxa de name-match no primeiro backfill (Phase 2), gap de `urlDocumento` do Senado (Phase 4, decisão de produto), visibilidade do repo (muda cálculo de minutos do Actions, Phase 2)

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-10-10T04:14:03.654Z
Stopped at: Phase 2 context gathered
Resume file: .planning/phases/02-ingestao-e-sincronizacao-ceap-ceaps/02-CONTEXT.md
