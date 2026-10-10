# Phase 2 Walking Skeleton — Ingestão e Sincronização (CEAP/CEAPS)

> **Walking Skeleton** (Phase 1 of new project was MVP; this is Phase 2 continuing the tracer-first approach)
> A minimal end-to-end path that proves the architecture: **Government Source → Streaming Parser → Normalized Contract → Batched Upsert → Retention → Sanity Gates → Summary** — for both Câmara and Senado.

---

## Architecture Decisions Recorded

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Script architecture** | Independent scripts `sync-despesas-camara.ts`, `sync-despesas-senado.ts` (GRAY-01) | Separation of concerns; own volume/logic; follows `backfill-*.ts` pattern; isolated test/deploy/rollback |
| **Streaming parser** | `yauzl@3.4.0` + `stream-json@2.1.0` CJS, chunk 1000 (GRAY-06) | 225 MB ZIP never in memory; v3.x ESM-only breaks ts-node; chunk 1000 balances memory/overhead |
| **Natural key** | S6: `CAMARA:{idDocumento}:{sha256[:16]}` / `SENADO:{id}` (D-03, GRAY-07) | Zero collisions in 556k rows (3 years); by-construction distinctness; global `@@unique` |
| **Batch upsert** | 1000 rows, `ON CONFLICT (idExterno) DO UPDATE` all 15 cols + `importedAt` (GRAY-05) | 15k params < 65.535 limit; idempotent daily corrections; `importedAt` supports retention |
| **Advisory lock** | `pg_advisory_xact_lock(hashtext('sync-despesas-{casa}'))` at script start (GRAY-12) | Prevents Vercel Cron + manual + GH dispatch concurrent double-ingestion |
| **Retention timing** | DELETE **after** successful upsert, same script, `casa` + `ano NOT IN (ANOS_JANELA)` (GRAY-02) | Atomicity; indexes `(casa, ano)` make it cheap; single source of truth for window |
| **Sanity gates** | 5 quantitative gates, mandatory, fail job on breach (GRAY-10, GAST-08) | Match≥99%, rows in range, sum±3σ, zero dupes, unmatched≤1% — fail loudly |
| **Error handling** | Fail-fast integrity; warning+continue transient; summary JSON always (GRAY-04) | Data integrity non-negotiable; network errors expected; auditability |
| **Backfill strategy** | Full 3-year loop over `ANOS_JANELA` once; then incremental ano corrente daily (GRAY-09) | Single source of truth; first run populates history; daily touches only current year |
| **Senado match** | Direct `codSenador` = `Parlamentar.idExterno` (GRAY-11) | 100% match in 3 years; no name-match needed; `urlDocumento` never present |
| **OPS-01 fix** | Remove GH Actions schedule from sync-camara.yml; Vercel Cron sole trigger (GRAY-03) | Eliminates duplicate 03:00 UTC runs; Vercel Cron already authenticates + dispatches both |

---

## Component Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERCEL CRON (0 3 * * *)                              │
│         /api/cron/sync-incremental?casa=ambas&tipo=incremental              │
│                              │                                              │
│                              ▼                                              │
│         ┌─────────────────────────────────────────┐                        │
│         │ GitHub Actions workflow_dispatch        │                        │
│         │  ├─ sync-camara.yml (apenas-despesas)   │                        │
│         │  └─ sync-senado.yml (apenas-despesas)   │                        │
│         └─────────────────────────────────────────┘                        │
│                              │                                              │
│              ┌───────────────┴───────────────┐                            │
│              ▼                               ▼                            │
│    ┌─────────────────────┐         ┌─────────────────────┐               │
│    │ sync-despesas-      │         │ sync-despesas-      │               │
│    │ camara.ts           │         │ senado.ts           │               │
│    │                     │         │                     │               │
│    │ 1. Advisory lock    │         │ 1. Advisory lock    │               │
│    │ 2. Stream ZIP       │         │ 2. GET CEAPS API    │               │
│    │    yauzl +          │         │    (single req/yr)  │               │
│    │    stream-json      │         │                     │               │
│    │ 3. Transform →      │         │ 3. Transform →      │               │
│    │    DespesaNorm.     │         │    DespesaNorm.     │               │
│    │    - S6 key         │         │    - S6 key         │               │
│    │    - parseBRL       │         │    - parseBRL (num) │               │
│    │    - parseDataFonte │         │    - parseDataFonte │               │
│    │    - camaraNameMatch│         │    - direct match   │               │
│    │      (Option A)     │         │      codSenador     │               │
│    │ 4. Batch upsert     │         │ 4. Batch upsert     │               │
│    │    1000 rows        │         │    1000 rows        │               │
│    │ 5. Retention DELETE │         │ 5. Retention DELETE │               │
│    │ 6. 5 Sanity gates   │         │ 6. 5 Sanity gates   │               │
│    │ 7. Summary JSON     │         │ 7. Summary JSON     │               │
│    └─────────────────────┘         └─────────────────────┘               │
│              │                               │                            │
│              └───────────────┬───────────────┘                            │
│                              ▼                                              │
│                    ┌─────────────────────┐                               │
│                    │ POSTGRES (Neon)     │                               │
│                    │ Table "Despesa"     │                               │
│                    │ - @@unique(idExterno)│                              │
│                    │ - indexes           │                               │
│                    │   (parlamentarId,   │                               │
│                    │    ano, data)       │                               │
│                    │   (casa, ano)       │                               │
│                    └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘

BACKFILL (one-shot manual):
  scripts/backfill-despesas-3anos.ts
    → loops ANOS_JANELA [2026, 2025, 2024]
    → spawns sync-despesas-camara.ts --ano=X --apenas-despesas
    → spawns sync-despesas-senado.ts --ano=X --apenas-despesas
    → tracks per-year results, exits 1 on any failure
```

---

## Data Contracts (Frozen in Phase 1)

```typescript
// src/lib/sync/types.ts
interface DespesaNormalizada {
  idExterno: string;                    // "CAMARA:{idDoc}:{fp16}" | "SENADO:{id}"
  parlamentarIdExterno?: string;         // source id (idDeputado / codSenador)
  nomeParlamentarRaw: string;           // audit do match (D-01)
  casa: 'CAMARA' | 'SENADO';
  ano: number;
  mes: number;
  data?: Date;                          // nullable — bulk tem sem dataEmissao
  categoria: string;                    // label livre da fonte (D-05)
  fornecedor: string;
  cpfCnpj?: string;
  documento?: string;                   // número/tipo do documento
  valor: string;                        // signed canonical dot-decimal (D-07)
  valorGlosa?: string;                  // same convention
  urlDocumento?: string;                // Senado nunca emite (0/3 anos)
}
```

```typescript
// src/lib/despesas.ts — fonte única para import loop E retenção (GRAY-09)
const ANOS_JANELA: readonly [number, number, number] = [currentYear, currentYear - 1, currentYear - 2];
```

```typescript
// src/lib/sync/despesa-id.ts — S6 derivation (D-03, GRAY-07)
function derivarIdExternoDespesa(casa: 'CAMARA' | 'SENADO', raw: Record<string, unknown>): string
```

```typescript
// src/lib/sync/camara-name-match.ts — Option A (D-06, GRAY-06)
function camaraNameMatch(entrada, diretorio): { parlamentarId, metodo } | null
// 1. idDeputado → porIdExterno (metodo: 'idExterno')
// 2. Rejeita uf='NA', vazio, nome vazio → null
// 3. Chave exata nome|UF → 0:null, 1:match, ≥2:desempate partido (senão null)
```

---

## Wave Structure

### Wave 1 (Parallel — Independent Tracers)
| Plan | Scope | Key Deliverable |
|------|-------|-----------------|
| **02-01** | Câmara CEAP streaming ingestion | `sync-despesas-camara.ts` + 5 unit tests (stream, upsert, retention, gates, lock) |
| **02-02** | Senado CEAPS ingestion | `sync-despesas-senado.ts` + 1 unit test (Senado pipeline) |

**Checkpoints:** Human confirmation that parser handles edge cases (Câmara) and direct match achieves 100% (Senado) before Wave 2.

### Wave 2 (Sequential — Integration)
| Plan | Scope | Key Deliverable |
|------|-------|-----------------|
| **02-03** | Workflow integration + OPS-01 fix + backfill | Modified workflows, cron route, `backfill-despesas-3anos.ts`, integration gates |

**Checkpoint:** Human confirmation on OPS-01 schedule removal approach (3 options).

---

## Verification Gates

| Gate | Command | When |
|------|---------|------|
| **Per-task** | `npx jest <test-file>` | After each task commit |
| **Wave 1 complete** | `npx jest` (all tests) | After Plans 01 & 02 |
| **Wave 2 complete** | `npx jest` + workflow YAML lint | After Plan 03 |
| **Project gate (QA-01)** | `npx tsc --noEmit && npx next lint && npx jest && npx next build` | End of each plan |
| **Production backfill** | Manual run `backfill-despesas-3anos.ts` + Neon verification | Post-deploy, once |

---

## Storage Budget

| Source | 3-Year Rows | Est. MB (A enxuta) |
|--------|-------------|-------------------|
| Câmara | ~572k | ~120 MB |
| Senado | ~60k | ~15 MB |
| **Total** | **~632k** | **~135 MB** |
| **Neon 0.5 GB** | 84 MB current + 135 MB = **219 MB (44%)** | ✅ OK |

---

## Requirements Traceability

| Requirement | Description | Covered By |
|-------------|-------------|------------|
| **GAST-04** | Bulk ingestion 3 years, streaming, no OOM | Plans 01, 02, 03 (backfill) |
| **GAST-05** | Retention DELETE 3-year window, same constant | Plans 01, 02 (scripts), Plan 03 (backfill) |
| **GAST-08** | Sanity gates fail loudly on threshold breach | Plans 01, 02 (5 gates), Plan 03 (integration gates) |
| **OPS-01** | Fix duplicate 03:00 UTC trigger | Plan 03 (workflow edit + checkpoint) |
| **QA-01** | Project gate green (`tsc && lint && jest && build`) | All plans (Task 3/4 each) |

---

## Threat Model Summary

| Threat | Mitigation |
|--------|------------|
| **OOM on 225 MB ZIP** | Streaming `yauzl` + `stream-json` chunk 1000 (~50 MB bounded) |
| **Duplicate ingestion** | Advisory lock `pg_advisory_xact_lock` per script (GRAY-12) |
| **Silent data corruption** | 5 quantitative sanity gates mandatory, exit 1 on fail (GRAY-10) |
| **Duplicate 03:00 trigger** | OPS-01: remove GH schedule, Vercel Cron sole trigger (GRAY-03) |
| **Key collision** | S6 content-fingerprint proven zero collisions in 556k rows |
| **Money precision loss** | `Decimal(14,2)` + `parseBRL` string-only, never `parseFloat` |
| **Name-match errors** | Option A exact match only; ambiguity → null; `metodo` audit trail |

---

## Next Phases (Dependent on This Skeleton)

| Phase | Depends On | What It Builds |
|-------|------------|----------------|
| **Phase 3: API de Despesas** | Phase 1 (contracts) + Phase 2 (data) | `GET /api/parlamentares/[id]/despesas` with snapshot-consistent summary + pagination |
| **Phase 4: UI — Aba "Gastos"** | Phase 3 (API) + Phase 2 (data) | Profile tab: total anual, barras por categoria, lista paginada, comprovantes, estados honestos |

---

## Open Decisions for Phase 4

- **Senado `urlDocumento`**: CEAPS API never provides it (0/3 anos). Phase 4 must render "Não disponível" honestly — never fake links. (GAST-03/GAST-07)

---

*Generated: 2026-10-10 | Phase: 2-Ingestão e Sincronização (CEAP/CEAPS) | MVP_MODE=true, TRACER_MODE=true, REVERSIBILITY_GATES=true*