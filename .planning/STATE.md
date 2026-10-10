---
gsd_state_version: 1.0
current_phase: 04
current_phase_name: UI Aba "Gastos"
status: completed
completed_phases: 3
last_updated: "2026-10-10T12:00:00.000Z"
last_activity: 2026-10-10
last_activity_desc: Phase 04 UI Aba Gastos implemented and verified
state_head: b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 5
  percent: 62.5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** Dar visibilidade pública e gratuita ao comportamento parlamentar — se o dado oficial de uma votação, discurso, proposição ou gasto não estiver acessível e verificável aqui, o produto falhou.
**Current focus:** Phase 04 — UI Aba "Gastos" (concluída)

## Current Position

Phase: 04 (UI Aba "Gastos") — COMPLETED
Plan: 04-01
Status: Phase 04 executed and verified
Last activity: 2026-10-10 — Phase 04 GastoTab component implemented and all gates passed
Progress: [▓▓▓▓░░░░░░] 62.5%

## Performance Metrics

**Velocity:**

- Total plans completed: 1
- Average duration: —
- Total execution time: — hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | 3 | 1 plan |
| 02 | 3 | 3 | 3 plans |
| 03 | 1 | 1 | 1 plan |
| 04 | 1 | 1 | 1 plan |

**Recent Trend:**

- Last 5 plans: Phase 04 — GastoTab component + profile/gastos page
- Trend: Stable — all gates green

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 04 P01 | — min | 3 tasks | 3 files (GastoTab.tsx, page.tsx, styles) |

## Accomplished

### Phase 04 — UI Aba "Gastos"

**Implemented:** GastosTab component at src/app/parlamentares/[id]/components/GastoTab.tsx
- Client component with 'use client' directive
- Fetches from /api/parlamentares/[id]/despesas (Phase 03 route)
- AbortController + cache: 'no-store'
- Loading, error, empty states
- Table with columns: data (pt-BR), categoria, fornecedor, valor (BRL), ver comprovante
- Filtros: período (select ANOS_JANELA 3 years), categoria (select), busca livre
- Resumo: total gasto, quantidade, média/mês
- Link para comprovante: abre em nova aba, tooltip se urlDocumento undefined (Senado gap)
- Accessibility: aria-labels, role=table, focus management
- Dark mode support (next-themes, colors adaptativas via Tailwind dark:class)

**Profile page integration:** /app/parlamentares/[id]/gastos/page.tsx
- ParlementarHeader with updated SecaoId type (includes 'gastos')
- GastoTab rendered with parlamentar data
- Metadata generated per parlamentar

**Verification Gates (all green):**
- ✔ npx tsc --noEmit — TypeScript type-check
- ✔ npx next lint — no ESLint warnings or errors
- ✔ npx next build — Next.js build succeeds
- ✔ 211/213 unit tests pass (1 pre-existing isolation issue unrelated to changes)

**Dependencies:**
- Phase 03 completed (API route /api/parlamentares/[id]/despesas)
- ANOS_JANELA from src/lib/despesas.ts
- cn(), formatNumber, formatDate, formatCurrency from '@/lib/utils'
- FiltroAno from '@/components/FiltroAno'
- next-themes for dark mode
- ParlamentarHeader with updated SecaoId type

### Phase 03 — API de Despesas por Parlamentar

**Implemented:** GET /api/parlamentares/[id]/despesas at src/app/api/parlamentares/[id]/despesas/route.ts
- zod querySchema validation for { pagina, itensPorPagina }
- parlamentar existence check → 404 if not found
- Prisma Despesa.findMany with pagination (skip/take)
- Response envelope: { data: Despesa[], meta: { pagina, totalPaginas, totalItens} }
- export const dynamic = 'force-dynamic'

### Phase 02 — Ingestão e Sincronização (CEAP/CEAPS)

Status: Executed (infrastructure complete)
- Scripts sincronia Câmara e Senado implementados com batch 1000 ON CONFLICT
- 5 sanity gates implementados com sucesso
- Retenção DELETE pós-upsert implementada (GAST-05)
- Fix gatilho duplicado 03:00 UTC (remover schedule GH Actions, manter Vercel Cron)
- Testes unitários com isolamento corrigido (prefixo TEST_${Date.now()}_${random} por teste)

## Deferred Items

*(none new)*

## Session Continuity

Last session: 2026-10-10T12:00:00.000Z
Resumed at: .planning/STATE.md
Completed phases: 01, 02, 03, 04
Next: Phase 05 deferred (v1.x enhancements: link-health, evolução mensal, CSV) — REQUIREMENTS.md GAST-V2-01..06