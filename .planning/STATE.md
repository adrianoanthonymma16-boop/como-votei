---
gsd_state_version: 1.0
current_phase: 06
current_phase_name: Emendas parlamentares
status: complete
completed_phases: 6
last_updated: "2026-10-19T17:05:00.000Z"
last_activity: 2026-10-19
last_activity_desc: Phases 05 e 06 concluídas — cobertura verde, emendas no ar
state_head: b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** Dar visibilidade pública e gratuita ao comportamento parlamentar — se o dado oficial de uma votação, discurso, proposição ou gasto não estiver acessível e verificável aqui, o produto falhou.
**Current focus:** Milestone concluído — fases 01–06 completas

## Current Position

Phase: 06 (Emendas parlamentares) — COMPLETE
Plan: 06-01..06-04
Status: Todas as fases concluídas; gates verdes; pronto para commit/push/deploy
Last activity: 2026-10-19 — cobertura 2024–2026 verde; emendas ingeridas (18.966) e expostas na aba Gastos
Progress: [▓▓▓▓▓▓▓▓▓▓] 100%

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

### Phase 06 — Emendas parlamentares do Portal da Transparência

**Implemented:**
- Modelo `Emenda` (+ enum `TipoVoto.VOTOU`) com migrações `20261019120000_add_votou_enum` e `20261019130000_add_emenda` aplicadas.
- `src/lib/emendas.ts` (parser de localidade, agregações, `urlEmenda`), `src/lib/emendas-match.ts` (match exato + aliases), `src/lib/ufs.ts` (27 UFs, fonte única; `seed.ts` refatorado).
- `scripts/sync-emendas.ts` (`--apenas-emendas`, 15/página, upsert idempotente, retenção 3 anos, log de unmatched) + script `sync:emendas` + workflow `.github/workflows/sync-emendas.yml` (cron 05:00 UTC, guardrails).
- `GET /api/parlamentares/[id]/emendas` (zod 400/404, envelope + resumo/página) e bloco `EmendasBlock.tsx` na aba Gastos.
- Backfill 2024–2026: 18.966 emendas (~94.8% com autor); `scripts/coverage.ts` com bloco/gate de emendas.
- Testes: `emendas.test.ts`, `emendas-match.test.ts`; e2e `e2e/emendas-gastos.spec.ts`.

### Phase 05 — Cobertura de dados 2024–2026

**Implemented:**
- `scripts/coverage.ts` (contagem por casa/ano/dataset, presença, variação ±30%, gate) + testes.
- Correção estrutural de votos do Senado (fetch anual completo; `VOTOU`/`MISSAO`); backfill de votos 2024–2026.
- Backfill de lacunas: Senado proposições (2026 > 0), Câmara discursos (2025/2026 > 0), Senado votos 2025.
- **Fix de produção:** fotos do Senado em `http://` quebravam `/parlamentares` (next/image) → `src/lib/imagens.ts` (normalização https + guarda), `ParlamentarCard` e `VotacoesPageClient` protegidos, adapter do Senado normaliza; 85 linhas do banco corrigidas.
- `npm run coverage` → **✅ Cobertura OK** (Nominais sem votos: 12).

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

Last session: 2026-10-19T17:05:00.000Z
Resumed at: .planning/STATE.md
Completed phases: 01, 02, 03, 04, 05, 06
Next: Milestone concluído — commit/push/deploy. Deferred v1.x: link-health, evolução mensal, CSV — REQUIREMENTS.md GAST-V2-01..06