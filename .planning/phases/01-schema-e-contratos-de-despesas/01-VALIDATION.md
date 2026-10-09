---
phase: "1"
slug: "schema-e-contratos-de-despesas"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-09"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x (ts-jest) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `npx jest` |
| **Full suite command** | `npx jest --coverage` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest`
- **After every plan wave:** Run `npx jest --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green (plus `npx tsc --noEmit && npx next lint && npx next build` per project gate)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | QA-01 | T-1-01 / — | `Despesa` model uses `Decimal(14,2)`; no float money | unit | `npx prisma validate && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | QA-01 | T-1-01 / — | Chave natural passa teste de colisão zero em fixture real de 1 ano | unit | `npx jest -- despesa-key` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | QA-02 | / — | `parseBRL`/`camara-name-match` cobertos; ambiguidade → `null`; zero `parseFloat` | unit | `npx jest -- parseBRL camara-name-match` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `.planning/phases/01-schema-e-contratos-de-despesas/01-fixtures-fonte.json` — committed real-source fixtures (20 labeled rows) ✅ already exists
- [ ] `src/lib/__tests__/despesa-key.test.ts` — stubs for QA-01 collision-gate tests (if plan 01-02 creates them)
- [ ] `src/lib/__tests__/parse-brl.test.ts` + `src/lib/__tests__/camara-name-match.test.ts` — stubs for QA-02

*Existing infrastructure (jest.config.js + ts-jest + `src/lib/__tests__/`) covers all phase requirements — no framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign-off da forma da chave natural (S6 vs S2) antes do freeze da migração | QA-01 | Research flag: gate de colisão passou com S6, mas altera decisão D-03 — exige confirmação humana antes de `@@unique` congelado | Rodar o teste de colisão, revisar resultado em 3 anos e confirmar forma escolhida no plano |
| Senado `urlDocumento` indisponível (estado "Não disponível" na UI) | GAST-03 (fase 4) | Gap de produto documentado — sem campo na fonte | Verificar estado vazio renderiza rótulo correto (Playwright, fase 4) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
