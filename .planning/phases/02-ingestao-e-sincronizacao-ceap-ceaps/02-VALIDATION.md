---
phase: "2"
slug: "ingestao-e-sincronizacao-ceap-ceaps"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-10"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x + ts-jest 29.x |
| **Config file** | jest.config.js (root) |
| **Quick run command** | `npx jest --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02-01 | 1 | GAST-04 | T-02-01 | Streaming parser never loads full JSON in memory | unit | `npx jest src/lib/__tests__/despesas-stream.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 02-01 | 1 | GAST-04 | T-02-02 | Upsert batch 1000 idempotent on idExterno | unit | `npx jest src/lib/__tests__/despesas-upsert.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 02-01 | 1 | GAST-05 | T-02-03 | Retention DELETE only outside ANOS_JANELA | unit | `npx jest src/lib/__tests__/despesas-retention.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-04 | 02-01 | 1 | OPS-01 | T-02-04 | Advisory lock acquired before ingest | unit | `npx jest src/lib/__tests__/despesas-lock.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-05 | 02-01 | 1 | GAST-08 | T-02-05 | Sanity gates fail job on threshold breach | unit | `npx jest src/lib/__tests__/despesas-gates.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02-02 | 1 | GAST-04 | T-02-06 | Senado bulk ingest + direct match | unit | `npx jest src/lib/__tests__/despesas-senado.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 02-03 | 2 | GAST-04 | T-02-07 | Full 3-year backfill loop (ANOS_JANELA) | integration | `npx jest src/lib/__tests__/despesas-backfill.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 02-03 | 2 | OPS-01 | T-02-08 | GH Actions schedule removed, Vercel Cron only | config | `grep -r "0 3 \* \* \*" .github/workflows/sync-camara.yml` | ❌ W0 | ⬜ pending |
| 02-03-03 | 02-03 | 2 | GAST-08 | T-02-09 | Sanity gates fail job on threshold | integration | `npx jest src/lib/__tests__/despesas-gates-integration.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/despesas-stream.test.ts` — streaming parser mock (yauzl + stream-json chunk 1000)
- [ ] `src/lib/__tests__/despesas-upsert.test.ts` — upsert batch 1000 idempotent
- [ ] `src/lib/__tests__/despesas-retention.test.ts` — retention DELETE filters ANOS_JANELA
- [ ] `src/lib/__tests__/despesas-lock.test.ts` — advisory lock acquired
- [ ] `src/lib/__tests__/despesas-gates.test.ts` — sanity gates threshold logic
- [ ] `src/lib/__tests__/despesas-senado.test.ts` — Senado bulk + direct match
- [ ] `src/lib/__tests__/despesas-backfill.test.ts` — 3-year loop ANOS_JANELA
- [ ] `src/lib/__tests__/despesas-gates-integration.test.ts` — gates integration

*Existing infrastructure covers: Jest 29 + ts-jest, `npx jest`, 157 tests passing from Phase 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full 3-year backfill completes without OOM | GAST-04 | Requires real 225 MB download + 20 min runtime | Run `npm run sync:despesas-camara -- --ano=2025` locally; monitor memory < 200 MB |
| GH Actions job completes in < 360 min | GAST-04 | CI environment only | Dispatch workflow manually; check runtime |
| Vercel Cron triggers both workflows | OPS-01 | Prod-only schedule | Check GH Actions history after 03:00 UTC |
| Retention DELETE removes only outside window | GAST-05 | Requires 4+ years of data | Seed 4 years; run sync; verify year 0 deleted |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

*Phase: 2-Ingestão e Sincronização (CEAP/CEAPS)*
*Validation seeded: 2026-10-10*