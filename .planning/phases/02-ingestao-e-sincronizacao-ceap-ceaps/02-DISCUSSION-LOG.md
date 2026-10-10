# Phase 2 Discussion Log

**Phase:** 2 — Ingestão e Sincronização (CEAP/CEAPS)
**Date:** 2026-10-10
**Mode:** --auto (all gray areas auto-selected to recommended options)

## Gray Areas Discussed

| Area | Question | Options Considered | Selected | Rationale |
|------|----------|-------------------|----------|-----------|
| **GRAY-01** | Arquitetura dos scripts de sync de despesas | A) Novos scripts independentes `sync-despesas-camara.ts`/`sync-despesas-senado.ts` · B) Estender `sync-camara.ts`/`sync-senado.ts` com `--apenas-despesas` | **A** (Recommended) | Separação de responsabilidades; segue padrão `backfill-*.ts`; facilita testes/rollback; evita acoplamento com syncs complexos existentes |
| **GRAY-02** | Timing do DELETE de retenção (3 anos) | A) Antes do upsert · B) **Após upsert na mesma transação/etapa** · C) Job separado | **B** (Recommended) | Atomicidade; evita janelas inconsistentes; DELETE barato com índices `casa`+`ano`; nunca falha silenciosamente |
| **GRAY-03** | Fix gatilho duplicado 03:00 UTC (OPS-01) | A) Desabilitar Vercel Cron · B) **Desabilitar GH Actions schedule, manter Vercel Cron** · C) Advisory lock apenas | **B** (Recommended) | Elimina duplicação exata; Vercel Cron já é gatilho oficial + despacha workflow_dispatch; GH schedule é redundante e compete por recursos |
| **GRAY-04** | Filosofia de error handling | A) Fail-fast em tudo · B) Continue em tudo · C) **Fail-fast integridade, continue warning transitório, summary final** | **C** (Recommended) | Integridade inegociável; rede transitório esperado; summary permite auditoria sem ruído |
| **GRAY-05** | Batch upsert size | A) 500 · B) **1000 (Recommended)** · C) Adaptive | **B** (Recommended) | 1000 × 14 campos ≈ 14k params (safe < 65k); testado na pesquisa; menos round-trips |
| **GRAY-06** | Streaming parser config | A) `stream-json@3.x` (ESM) · B) **`stream-json@2.1.0` pinned CJS + chunk 1000** · C) JSON.parse completo | **B** (Recommended) | v3 é ESM-only (quebra ts-node CommonJS); 2.1.0 última CJS; chunk 1000 equilibra memória/overhead |
| **GRAY-07** | Idempotency key | A) Composto `(casa, ano, idDocumento)` · B) **S6 `idExterno` (Recommended, já congelado Fase 1)** | **B** (Recommended) | Já congelado Fase 1; 0 colisões em 3 anos (556k linhas); sobrevive a emendas/estornos |
| **GRAY-08** | Rate limits | A) Novos limites custom · B) **Reutilizar HttpClient existente (Recommended)** | **B** (Recommended) | Já testado em produção; configs conservadoras (camara 120/min, senado 60/min) |
| **GRAY-09** | Backfill strategy | A) Só ano corrente · B) **Full 3-year backfill first run + incremental por ano (Recommended)** | **B** (Recommended) | `ANOS_JANELA` é fonte única (importação + retenção); primeira execução popula histórico completo |
| **GRAY-10** | Sanity gates (GAST-08) | A) Sem gates · B) Gates básicos · C) **5 gates quantitativos obrigatórios (Recommended)** | **C** (Recommended) | GAST-08 exige "falha ruidosamente"; gates quantitativos impedem drift silencioso |
| **GRAY-11** | Senado match strategy | A) Name-match como Câmara · B) **Direct `codSenador` = `idExterno` (Recommended)** | **B** (Recommended) | 100% match nos 3 anos (81 senadores); 0 misatribuição; name-match desnecessário |
| **GRAY-12** | Lock de sync | A) Sem lock · B) **`pg_advisory_xact_lock` (Recommended)** | **B** (Recommended) | OPS-01 exige lock advisory; barato, atômico, evita double-ingestão |

## Decisões Herdadas da Fase 1 (não rediscutidas)

- S6 content-fingerprint key: `CAMARA:{idDocumento}:{sha256[:16]}` / `SENADO:{id}` com `@@unique` global
- Option A name-match Câmara: id-first (`idDeputado` → `porIdExterno`) + fallback nome+UF exato, `metodo` audit, ambiguidade → `null`
- `parseBRL` string-only, nunca `parseFloat`, `Decimal(14,2)` signed
- `parseDataFonte` UTC-midnight, nullable, typo-safe
- `ANOS_JANELA` = [current, current-1, current-2] (UTC clock)
- `DespesaNormalizada` string decimals, zero Prisma imports
- `nomeParlamentarRaw` audit column, leader rows → `null`

## Deferred Ideas (fora do escopo desta fase)

- GAST-V2-05 (link-health job), GAST-V2-06 (storage monitor) → v2
- Logging estruturado (pino) → milestone de observabilidade
- Ranking/comparação de gastos → OUT OF SCOPE (PROJECT.md)

---

**Auto-advance triggered:** Plan-phase for Phase 2 will launch automatically.