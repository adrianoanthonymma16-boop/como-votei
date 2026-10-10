# Phase 2: Ingestão e Sincronização (CEAP/CEAPS) - Patterns

**Mapped:** 2026-10-10
**Phase:** 2
**Analogs found:** 12/12

## Analog Mapping

| Phase 2 Component | Analog in Codebase | Match Type | Notes |
|-------------------|-------------------|------------|-------|
| `scripts/sync-despesas-camara.ts` | `scripts/sync-camara.ts` | **Exact** | Phase gating, flags, upsert batch, progress logging, transaction tramitações |
| `scripts/sync-despesas-senado.ts` | `scripts/sync-senado.ts` | **Exact** | Mesma estrutura, adapters diferentes |
| Streaming parser (yauzl + stream-json) | `scripts/sync-camara.ts` (linhas 180-220) | **Role-match** | Câmara adapter já faz streaming de votações/proposições; mesmo padrão aplicado a despesas |
| Upsert batch 1000 ON CONFLICT | `scripts/sync-camara.ts:285-296` | **Exact** | Tramitações usam upsert raw batched 1000 em `$transaction` |
| Retention DELETE pós-upsert | *Novo* | **No Analog Found** | Retenção 3 anos específica de despesas; não existe em votações/discursos |
| Advisory lock pg_advisory_xact_lock | *Novo* | **No Analog Found** | Lock advisory não usado em scripts existentes |
| Sanity gates quantitativos | *Novo* | **No Analog Found** | Guardrails inline em workflows são queries ad-hoc; gates como step dedicado é novo |
| Fix 03:00 UTC (remover schedule) | `vercel.json` cron + cron route | **Role-match** | Gatilho oficial já é Vercel Cron; remover GH schedule é cleanup |
| Backfill loop ANOS_JANELA | `src/lib/despesas.ts` ANOS_JANELA | **Exact** | Constante já existe e é fonte única |
| Câmara bulk streaming (yauzl + stream-json) | `src/lib/sync/camara-adapter.ts` paginate | **Role-match** | Adapter usa paginação REST; bulk ZIP requer streaming unzip + parse |
| Senado bulk CEAPS (uma chamada) | `src/lib/sync/senado-adapter.ts` | **Role-match** | Adapter já consome endpoints Senado; CEAPS é endpoint novo, mesma base |
| Error handling (fail-fast integridade, continue warning transitório) | `scripts/sync-camara.ts` try/catch | **Exact** | Mesmo padrão: fail-fast integridade, warning transitório, summary final |

## Blockers for Planner

| Component | Blocker | Resolution |
|-----------|---------|------------|
| Retention DELETE | No analog — need to design transaction boundary (same txn vs separate) | Planner must decide: same transaction if params fit, else separate step post-commit |
| Advisory lock | No analog — need exact SQL pattern | Use `pg_advisory_xact_lock(hashtext('sync-despesas-camara'))` at script start |
| Sanity gates | No analog — need exact Prisma queries for each gate | Planner must write exact Prisma queries for 5 gates |
| Streaming bulk Câmara | Role-match only — adapter uses paginated REST, not bulk ZIP streaming | Planner must design yauzl + stream-json pipeline from scratch |

## Reusable Code Locations

| Pattern | Location | Reuse Instruction |
|---------|----------|-------------------|
| Script structure (flags, phases, progress) | `scripts/sync-camara.ts:1-50` | Copy header, flag parsing, phase gating |
| Upsert batch raw SQL | `scripts/sync-camara.ts:285-296` | Adapt column list for Despesa (15 cols) |
| Progress logging (emoji banners) | `scripts/sync-camara.ts:42-44` | Reuse emoji style: `🏛️`, `📋`, `⏰` |
| HttpClient reuse | `src/lib/sync/http-client.ts` | Import `camaraClient`, `senadoClient` directly |
| parseBRL / parseDataFonte / ANOS_JANELA | `src/lib/despesas.ts` | Import direto, zero adaptação |
| derivarIdExternoDespesa S6 | `src/lib/sync/despesa-id.ts` | Import direto |
| camaraNameMatch Option A | `src/lib/sync/camara-name-match.ts` | Import direto (Câmara); Senado não usa |
| DespesaNormalizada | `src/lib/sync/types.ts` | Import direto para tipagem |
| Prisma singleton | `src/lib/prisma.ts` | Import direto |

## Test Analogs

| Test | Analog | Reuse |
|------|--------|-------|
| Streaming parser mock | `despesa-id.test.ts` fixture pattern | Reuse fixture loading from `fontes.json` |
| Upsert batch | `despesa-id.test.ts` derivarIdExterno | Adaptar para testar upsert raw com Prisma mock |
| Retention DELETE | *Novo* | Criar teste com Prisma mock verificando WHERE casa + ano NOT IN |
| Advisory lock | *Novo* | Testar com Prisma mock verificando query chamada |
| Sanity gates | Guardrails inline workflows | Adaptar queries Prisma inline para funções testáveis |

---

*Phase: 2-Ingestão e Sincronização (CEAP/CEAPS)*
*Patterns mapped: 2026-10-10*
*12/12 analogs, 4 No Analog Found (retention, advisory lock, sanity gates, streaming bulk)*