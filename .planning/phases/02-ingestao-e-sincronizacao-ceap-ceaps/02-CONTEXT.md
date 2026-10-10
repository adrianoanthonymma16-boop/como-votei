# Phase 2: Ingestão e Sincronização (CEAP/CEAPS) - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning
**Mode:** --auto (all gray areas auto-selected to recommended options)

<domain>
## Phase Boundary

Ingerir as despesas dos últimos 3 anos (2024–2026) das duas casas no banco, usando os contratos congelados na Fase 1: model `Despesa` (Decimal(14,2), `idExterno` namespaced S6), `parseBRL`, `parseDataFonte`, `ANOS_JANELA`, `camaraNameMatch` Option A (id-first + fallback), `DespesaNormalizada`. Entregar scripts de sync resilientes (streaming `yauzl@3.4.0` + `stream-json@2.1.0`), upsert idempotente batched 1000, retenção DELETE pós-upsert (janela 3 anos), sanity gates, fix do gatilho duplicado 03:00 UTC (OPS-01). **Não expõe rota, não cria UI** — isso fica nas Fases 3 e 4.

</domain>

<decisions>
## Implementation Decisions

### Scripts de sync — arquitetura
- **GRAY-01:** Scripts **novos e independentes** (`scripts/sync-despesas-camara.ts`, `scripts/sync-despesas-senado.ts`) em vez de estender `sync-camara.ts`/`sync-senado.ts` com flag `--apenas-despesas`.
  - **Rationale:** Separação de responsabilidades (despesas têm formato/volume/lógica próprios); segue padrão existente (`backfill-*.ts` são scripts separados); facilita testes, deploy e rollback isolados; evita acoplamento com syncs já complexos de votações/discursos/proposições.
  - **Reversibility:** Reversible — scripts podem ser mesclados depois se houver convergência.

### Retenção DELETE — timing e atomicidade
- **GRAY-02:** DELETE **após upsert bem-sucedido**, na mesma transação/etapa do script, filtrando `casa` + `ano` fora da janela `ANOS_JANELA` (3 anos).
  - **Rationale:** Atomicidade — evita janelas onde dados novos e velhos coexistem inconsistente; o DELETE é barato (apenas `casa` + `ano` indexados); garante que a retenção nunca falhe silenciosamente deixando lixo.
  - **Reversibility:** Reversible — timing pode mudar sem afetar schema.

### Fix gatilho 03:00 UTC (OPS-01) — implementação
- **GRAY-03:** Desabilitar o **schedule do GitHub Actions** (`0 3 * * *` em `sync-camara.yml`) e manter **apenas o Vercel Cron** (`0 3 * * *` → `GET /api/cron/sync-incremental?casa=ambas` autenticado com `CRON_SECRET`). O Vercel Cron já despacha `workflow_dispatch` para ambos os workflows.
  - **Rationale:** Elimina duplicação exata no mesmo horário; Vercel Cron já era o gatilho oficial (documentado em `vercel.json`); GH Actions schedule é redundante e causa execuções duplas que competem por `DATABASE_URL` e minutos de Actions; `CRON_SECRET` já protege o endpoint.
  - **Reversibility:** Reversible — pode reativar o schedule se Vercel Cron falhar.

### Error handling — filosofia
- **GRAY-04:** **Fail-fast** em erros de integridade (schema mismatch, colisão de idExterno inesperada, taxa de match < 99%, soma de valores fora de sanity gate); **continue com warning** em erros transitórios de rede (429, timeout, 5xx) com retry/backoff do `HttpClient`; **summary final** com contadores: `ingested`, `updated`, `deleted`, `matched`, `unmatched`, `errors`.
  - **Rationale:** Integridade de dado é inegociável (Core Value); erros de rede são esperados em APIs públicas gratuitas; summary permite auditoria pós-job sem logar ruído excessivo.

### Batch upsert size
- **GRAY-05:** **1000 registros** por batch (seguro sob limite de 65.535 parâmetros do Postgres: 1000 × 14 campos ≈ 14k params).
  - **Rationale:** Testado na pesquisa (STACK.md) — 500–1000 é a faixa recomendada; 1000 reduz round-trips sem estourar limite.

### Streaming parser config
- **GRAY-06:** `stream-json@2.1.0` (pinned CJS) com **chunk de 1000 objetos** + `yauzl@3.4.0` para unzip streaming; nunca carregar JSON completo em memória (225 MB → OOM).
  - **Rationale:** Versão 3.x do `stream-json` é ESM-only e quebra o runner `ts-node` CommonJS; 2.1.0 é a última CJS; chunk 1000 equilibra memória vs overhead.

### Idempotency key
- **GRAY-07:** **S6 `idExterno`** (já congelado na Fase 1: `CAMARA:{idDocumento}:{sha256[:16]}` / `SENADO:{id}` com `@@unique` global).
  - **Rationale:** Já validado com 0 colisões em 3 anos (556k linhas); key natural que sobrevive a emendas/estornos.

### Rate limits
- **GRAY-08:** Reutilizar `HttpClient` existente: `camaraClient` (120 req/min, burst 10, 100ms spacing) e `senadoClient` (60 req/min). Senado bulk CEAPS é uma única chamada por ano — não precisa de paginação.
  - **Rationale:** Já testado em produção para votações/discursos/proposições; configurações conservadoras evitam ban.

### Backfill strategy
- **GRAY-09:** **Full 3-year backfill na primeira execução** (loop sobre `ANOS_JANELA` = [2026, 2025, 2024]) → depois **incremental por ano** (apenas ano corrente no schedule diário). A constante `ANOS_JANELA` (Fase 1) é a fonte única para o loop de importação E para a retenção (GAST-05).
  - **Rationale:** Fonte única de verdade evita drift; primeira execução popula o histórico completo; execuções diárias tocam apenas o ano corrente.

### Sanity gates (GAST-08)
- **GRAY-10:** Gates **obrigatórios ao final de cada ingestão** (falham o job se violados):
  1. Taxa de match ≥ 99% (parlamentares com `idDeputado` / `codSenador` válidos casados no diretório)
  2. Total de linhas ingeridas dentro de faixa esperada (Câmara: 100k–250k/ano; Senado: 10k–30k/ano)
  3. Soma de `valor` + `valorGlosa` dentro de sanity bounds (baseado em média histórica ±3σ)
  4. Nenhum `idExterno` duplicado dentro do lote (upsert já garante, mas gate explícito audita)
  5. Taxa de `unmatched` (sem `parlamentarId`) ≤ 1% (leader rows `siglaUF=NA` esperados; picos indicam regressão no name-match)
  - **Rationale:** GAST-08 exige "falha ruidosamente"; gates quantitativos impedem drift silencioso.

### Senado match strategy
- **GRAY-11:** **Direct match** `codSenador` = `Parlamentar.idExterno` (100% nos dados 2024–2026). Sem name-match fallback necessário.
  - **Rationale:** Pesquisa confirmou: `codSenador` == `idExterno` para 100% dos 81 senadores nos 3 anos; 0 misatribuição; name-match só para Câmara.

### GRAY-12: Lock de sync (advisory)
- **GRAY-12:** `pg_advisory_xact_lock(hashtext('sync-despesas'))` no início de cada script — impede execuções concorrentes do mesmo script (Vercel Cron + manual + GH dispatch simultâneos).
  - **Rationale:** OPS-01 exige "syncs rodam sob lock (advisory)"; barato, atômico, evita double-ingestão.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` § Phase 2 — goal, success criteria (GAST-04, GAST-05, GAST-08, OPS-01)
- `.planning/REQUIREMENTS.md` — GAST-04, GAST-05, GAST-08, OPS-01, QA-01, QA-02
- `.planning/PROJECT.md` — Key Decisions (A enxuta, retenção 3 anos, fontes, fix 03:00)

### Fase 1 (contratos congelados — NÃO redecidir)
- `.planning/phases/01-schema-e-contratos-de-despesas/01-CONTEXT.md` — D-01..D-08, S6, Option A
- `.planning/phases/01-schema-e-contratos-de-despesas/01-RESEARCH.md` — S6 evidence, money/date probes, name-match stats
- `.planning/phases/01-schema-e-contratos-de-despesas/01-RESEARCH.md` — `yauzl@3.4.0`, `stream-json@2.1.0`, batch 1000, upsert ON CONFLICT
- `.planning/phases/01-schema-e-contratos-de-despesas/01-fixtures-fonte.json` — 20 registros reais rotulados

### Codebase existente
- `.planning/codebase/STACK.md` — `yauzl@3.4.0`, `stream-json@2.1.0` (pin), ts-node CommonJS
- `.planning/codebase/ARCHITECTURE.md` — adapter layer, scripts com `--apenas-*`, pure compute
- `.planning/codebase/INTEGRATIONS.md` — `SENADO_ADM_BASE` já declarado, `HttpClient` configs
- `.planning/codebase/CONCERNS.md` — anti-patterns a evitar (raw SQL, `as any`, duplicated query parsing)
- `prisma/schema.prisma` — model `Despesa` (já criado na Fase 1)
- `src/lib/sync/types.ts` — `DespesaNormalizada` + contratos existentes
- `src/lib/sync/despesa-id.ts` — `derivarIdExternoDespesa` (S6)
- `src/lib/despesas.ts` — `parseBRL`, `parseDataFonte`, `ANOS_JANELA`
- `src/lib/sync/camara-name-match.ts` — Option A (id-first + fallback)
- `src/lib/sync/http-client.ts` — `camaraClient`, `senadoClient`, `portalTransparenciaClient`
- `scripts/sync-camara.ts`, `scripts/sync-senado.ts` — padrões de fase, upsert, flags
- `.github/workflows/sync-camara.yml`, `sync-senado.yml`, `vercel.json` — gatilhos e cron

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts` — singleton Prisma para scripts
- `src/lib/sync/http-client.ts` — `camaraClient` (120/min), `senadoClient` (60/min) com retry/backoff/429
- `src/lib/sync/normalizer-factory.ts` — factory (embora Phase 2 use scripts diretos sem factory)
- `src/lib/sync/types.ts` — `DespesaNormalizada` (D-08) + contratos existentes
- `src/lib/despesas.ts` — `parseBRL`, `parseDataFonte`, `ANOS_JANELA` (Fase 1)
- `src/lib/sync/despesa-id.ts` — `derivarIdExternoDespesa` S6
- `src/lib/sync/camara-name-match.ts` — Option A (id-first + fallback, `metodo` audit)
- `scripts/sync-camara.ts` — padrão de fase `--apenas-*`, upsert keyed `idExterno`, tramitações em `$transaction`
- `.github/workflows/sync-camara.yml` — phases por ano, guardrails inline, Neon cold-start tuning
- `vercel.json` — cron `0 3 * * *` → `/api/cron/sync-incremental?casa=ambas`

### Established Patterns
- Scripts usam flags `--apenas-*` para fases granulares; Phase 2 adiciona `--apenas-despesas`
- Upsert raw `INSERT ... ON CONFLICT (idExterno) DO UPDATE` batched 1000
- Streaming obrigatório: `yauzl` + `stream-json` (pin 2.x CJS)
- `HttpClient` com queue, rate limit, retry/backoff, 429 `Retry-After`
- Guardrails inline no workflow (inline `node -e` Prisma queries que falham o job)
- `CRON_SECRET` protege endpoint cron; `workflow_dispatch` via GitHub API

### Integration Points
- `prisma/schema.prisma` — model `Despesa` já existe (Fase 1)
- `src/lib/sync/types.ts` — `DespesaNormalizada` já existe (D-08)
- `src/lib/sync/despesa-id.ts` — `derivarIdExternoDespesa` S6
- `src/lib/sync/camara-name-match.ts` — Option A
- `src/lib/despesas.ts` — `parseBRL`, `parseDataFonte`, `ANOS_JANELA`
- `scripts/` — novos `sync-despesas-camara.ts`, `sync-despesas-senado.ts`
- `.github/workflows/sync-camara.yml`, `sync-senado.yml` — remover schedule 03:00, manter workflow_dispatch
- `vercel.json` — cron já dispara `/api/cron/sync-incremental?casa=ambas`

</code_context>

<specifics>
## Specific Ideas

- **Senado CEAPS bulk:** `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}` retorna array JSON direto (sem paginação, ~10 MB/ano) — uma chamada por ano, parsing streaming mesmo assim
- **Câmara bulk:** `https://www.camara.leg.br/cotas/Ano-{ano}.json.zip` (225 MB JSON 2025) → streaming `yauzl` unzip → `stream-json` parse → filtrar `idDocumento` + campos necessários
- **Senado `urlDocumento`:** **nunca presente** (0/3 anos) — `DespesaNormalizada.urlDocumento?` continua optional; UI mostrará "Não disponível" honesto (GAST-03/GAST-07)
- **Leader rows Câmara:** `siglaUF="NA"`, sem `idDeputado` (ex: `LID.GOV-CD`, `idDocumento=7877589`) → `camaraNameMatch` retorna `null` → `parlamentarId=null` gravado → UI filtra `parlamentarId != null` (já acordado Fase 1)
- **Fix 03:00 UTC:** Remover `schedule: { cron: '0 3 * * *' }` de `.github/workflows/sync-camara.yml`; `sync-senado.yml` já roda às 04:00 e não tem gatilho duplicado (Vercel cron dispara ambos via `casa=ambas`)
- **Advisory lock:** `SELECT pg_advisory_xact_lock(hashtext('sync-despesas-camara'))` no início de cada script — barato, atômico, evita double-ingestão
- **Retenção DELETE:** `DELETE FROM "Despesa" WHERE "casa" = $1 AND "ano" NOT IN ($2, $3, $4)` executado APÓS upsert bem-sucedido, dentro do mesmo script (pode ser na mesma transação se caber, ou step separado pós-commit do upsert)
- **Sanity gates:** implementados como queries Prisma pós-upsert + `if (!gate) process.exit(1)` — falham o job GH Actions visivelmente

</specifics>

<deferred>
## Deferred Ideas

- **GAST-V2-05** (link-health job amostral) — deferred para v2
- **GAST-V2-06** (monitoramento storage/bloat) — deferred
- **Logging estruturado (pino)** — declarado mas não usado; fica para milestone de observabilidade
- **Comparação/ranking de gastos** — OUT OF SCOPE (PROJECT.md)

</deferred>

---

*Phase: 2-Ingestão e Sincronização (CEAP/CEAPS)*
*Context gathered: 2026-10-10*
*Mode: --auto (all gray areas auto-selected to recommended options)*