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
| 1-01-01 | 01 | 1 | QA-01 | T-1-01 / T-1-02 | `derivarIdExternoDespesa` derives distinct stable keys for all fixture edge pairs; `Despesa` declares `Decimal(14,2)` money | unit | `npx prisma validate && npx jest src/lib/__tests__/despesa-id.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | QA-01 | — | Key-shape decision (S6 vs S2) recorded before `@@unique` freeze | manual (checkpoint) | decision recorded in checkpoint state | n/a | ⬜ pending |
| 1-01-03 | 01 | 1 | QA-01 | T-1-04 / T-1-05 | Full-year zero-collision gate + additive migration + Decimal round-trip smoke | integration | `npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/verificar-colisao-chave-despesa.ts /tmp/opencode/cotas/Ano-2025.json && npx prisma migrate status && npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/smoke-despesa.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | QA-02 | T-1-02 | `parseBRL` boundaries (empty→null, malformed→throw, pt-BR, signed, ceiling); module free of QA-02-banned conversion tokens | unit | `npx jest src/lib/__tests__/parse-brl.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | QA-02 | T-1-01 | `parseDataFonte` UTC dates; `ANOS_JANELA` = [ano, ano-1, ano-2] computed | unit | `npx jest src/lib/__tests__/datas-despesa.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | QA-02 | T-1-03 | Id-first amendment outcome recorded before matcher ships | manual (checkpoint) | decision recorded in checkpoint state | n/a | ⬜ pending |
| 1-03-02 | 03 | 2 | QA-02 | T-1-03 | Exact normalized match; ambiguity/leader → null; `metodo` audited | unit | `npx jest src/lib/__tests__/camara-name-match.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | QA-01 / QA-02 | T-1-02 | `DespesaNormalizada` string decimals, zero-import file invariant; full gate | unit | `npx tsc --noEmit && npx next lint && npx jest && npx next build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `.planning/phases/01-schema-e-contratos-de-despesas/01-fixtures-fonte.json` — committed real-source fixtures (20 labeled rows) — already exists; copied into `src/lib/__tests__/fixtures/fontes.json` by task 1-01-01
- [x] No test stubs required — every suite is created (RED-first where TDD) by its owning plan task; `jest.config.js` `testMatch` already picks up `src/lib/__tests__/**/*.test.ts`

*Existing infrastructure (jest.config.js + ts-jest + `src/lib/__tests__/` + Prisma CLI) covers all phase requirements — no framework install needed.*

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
