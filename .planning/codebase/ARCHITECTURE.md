<!-- refreshed: 2026-10-09 -->
# Architecture

**Analysis Date:** 2026-10-09

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                     INGESTION (offline, batch)                       │
│  .github/workflows/sync-camara.yml (03:00 UTC) / sync-senado.yml     │
│  vercel.json crons → src/app/api/cron/sync-incremental/route.ts      │
│         │ dispatch workflow_dispatch                                 │
│         ▼                                                            │
│  scripts/sync-camara.ts · scripts/sync-senado.ts · backfill-*.ts     │
│  (CLI, ts-node, Prisma upserts)                                      │
└───────────────┬──────────────────────────────────────────────────────┘
                │ uses
┌───────────────▼──────────────────────────────────────────────────────┐
│              ADAPTER / NORMALIZATION LAYER (anti-corruption)         │
│  src/lib/sync/normalizer-factory.ts  (factory + singleton registry)  │
│  src/lib/sync/camara-adapter.ts      (Câmara API → normalized)       │
│  src/lib/sync/senado-adapter.ts      (Senado API → normalized)       │
│  src/lib/sync/http-client.ts         (rate limit, retry, queue)      │
│  src/lib/sync/types.ts               (shared normalized shapes)      │
│  src/lib/temas.ts + temas-keywords.json (theme classification)       │
└───────────────┬──────────────────────────────────────────────────────┘
                │ writes via Prisma
┌───────────────▼──────────────────────────────────────────────────────┐
│                     PERSISTENCE                                      │
│  prisma/schema.prisma → PostgreSQL (Neon / Vercel Postgres)          │
│  src/lib/prisma.ts (global singleton client)                         │
└───────────────┬──────────────────────────────────────────────────────┘
                │ reads
┌───────────────▼──────────────────────────────────────────────────────┐
│                  APPLICATION (Next.js 14 App Router)                 │
│                                                                      │
│  API layer: src/app/api/**/route.ts  (zod-validated Route Handlers)  │
│      │                                                               │
│      ├── src/lib/parlamentar-query.ts (where-builder + pagination)   │
│      ├── src/lib/dashboard.ts, produtividade.ts, frequencia.ts       │
│      │       (pure compute functions — unit tested)                  │
│      └── src/lib/parlamentar-anos.ts (raw SQL helper)                │
│                                                                      │
│  Presentation: src/app/**/page.tsx (Server Components, Prisma direct) │
│      └── src/app/**/components/*Tab.tsx ('use client', fetch /api)   │
│  Shared UI: src/components/**  +  src/components/ui/**               │
│  Styling: Tailwind + CSS custom properties (src/app/globals.css)     │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root layout | Fonts, metadata/OG, theme provider, sticky nav | `src/app/layout.tsx` |
| Home page | Marketing hero + dynamic stats/search blocks | `src/app/page.tsx` |
| Parliamentarian list | Client-side filtering/pagination against API | `src/app/parlamentares/ParlamentaresPageClient.tsx` |
| Profile shell | Server-renders header + dispatches to tab pages | `src/app/parlamentares/[id]/page.tsx` |
| Profile tabs | Client components fetching their own API route | `src/app/parlamentares/[id]/components/*Tab.tsx` |
| API routes | Validate query with zod, query Prisma, compute, JSON | `src/app/api/**/route.ts` |
| Cron trigger | Auth via `CRON_SECRET`, dispatch GitHub Actions | `src/app/api/cron/sync-incremental/route.ts` |
| Sync CLI scripts | Orchestrate adapter fetch → Prisma upsert per entity | `scripts/sync-camara.ts`, `scripts/sync-senado.ts` |
| Normalization adapters | Convert house-specific API payloads to unified shapes | `src/lib/sync/camara-adapter.ts`, `src/lib/sync/senado-adapter.ts` |
| HTTP client | Per-API rate limiting, queue, retry/backoff, 429 handling | `src/lib/sync/http-client.ts` |
| Domain computations | Pure metrics (alignment, productivity, frequency, themes) | `src/lib/dashboard.ts`, `src/lib/produtividade.ts`, `src/lib/frequencia.ts`, `src/lib/temas.ts` |
| Query builder | Prisma `where` construction + pagination helpers | `src/lib/parlamentar-query.ts` |
| Prisma singleton | Global client reuse across HMR | `src/lib/prisma.ts` |
| DB schema | 9 models + 4 enums, snake_case `@map`, indexes | `prisma/schema.prisma` |
| Seed | Partidos + UFs reference data | `prisma/seed.ts` |

## Pattern Overview

**Overall:** Layered monolith on Next.js App Router with an adapter/anti-corruption layer for external government APIs.

**Key Characteristics:**
- Single deployable: UI, HTTP API and cron trigger all live in one Next.js app (`src/app/`); batch ingestion runs separately in GitHub Actions (`scripts/`).
- Read path never touches government APIs — the app reads only its own Postgres (`CONTEXT.md` invariant).
- Write path fully decoupled from the app: adapters normalize Câmara/Senado payloads into shared types before persistence, so schema changes are absorbed in one place.
- Server Components fetch Prisma directly for page shells/metadata; interactive data lives in `'use client'` tab components that fetch JSON API routes.
- Business metrics are extracted as pure functions in `src/lib/` so Jest can test them without a database.

## Layers

**Presentation (App Router pages):**
- Purpose: Render HTML shells, metadata, and orchestrate client tabs
- Location: `src/app/**/page.tsx`, `src/app/layout.tsx`
- Contains: Server Components with `generateMetadata`, `notFound()`/`redirect()` guards
- Depends on: `@/lib/prisma` (direct reads), `@/components/*`, tab components
- Used by: Browser

**Client UI:**
- Purpose: Filters, pagination, year selectors, charts/tables with loading/error states
- Location: `src/app/parlamentares/ParlamentaresPageClient.tsx`, `src/app/votacoes/VotacoesPageClient.tsx`, `src/app/parlamentares/[id]/components/*Tab.tsx`, `src/components/**`
- Contains: `'use client'` components with `useState`/`useEffect`/`AbortController`, `fetch(..., { cache: 'no-store' })`
- Depends on: API routes, `@/lib/utils` (`cn`, `formatDate`), `@/components/ui/*`
- Used by: Pages

**API (Route Handlers):**
- Purpose: Validate input, run Prisma queries, delegate computation, return JSON
- Location: `src/app/api/**/route.ts`
- Contains: `export const dynamic = 'force-dynamic'`, zod `querySchema`, `NextResponse.json`
- Depends on: `@/lib/prisma`, `@/lib/*` compute/query helpers, `zod`
- Used by: Client UI; `e2e/` tests via the deployed site

**Domain/compute (pure logic):**
- Purpose: Testable metric math and text classification with no I/O
- Location: `src/lib/dashboard.ts`, `src/lib/produtividade.ts`, `src/lib/frequencia.ts`, `src/lib/temas.ts`, `src/lib/utils.ts`
- Contains: `computeAlinhamento`, `computeAtividadeMensal`, `computeTemas`, `calcularPontuacao`, `extrairTemaPrincipal`, formatting helpers
- Depends on: nothing (except `src/lib/frequencia.ts` which reads Prisma for the async wrapper)
- Used by: API routes, sync adapters, tab components

**Integration/ingestion:**
- Purpose: Fetch, rate-limit and normalize data from Câmara/Senado open APIs
- Location: `src/lib/sync/` (adapters, factory, http-client, types)
- Contains: `CamaraAdapter`, `SenadoAdapter`, `NormalizerFactory`, `HttpClient`, `*Normalizado` interfaces
- Depends on: global `fetch`, `crypto.createHash`, `src/lib/temas.ts`
- Used by: `scripts/*.ts` (never imported by app runtime code)

**Batch orchestration:**
- Purpose: CLI entry points that persist normalized data with idempotent upserts
- Location: `scripts/sync-camara.ts`, `scripts/sync-senado.ts`, `scripts/backfill-*.ts`
- Contains: per-entity sync phases gated by `--apenas-*` flags, `PrismaClient` local to the script
- Depends on: `NormalizerFactory`, `@prisma/client`
- Used by: GitHub Actions workflows + manual `npm run sync:*`

**Persistence:**
- Purpose: Canonical store for all normalized legislative data
- Location: `prisma/schema.prisma`, migrations in `prisma/migrations/`
- Contains: `Partido`, `Uf`, `Parlamentar`, `Votacao`, `Voto`, `Discurso`, `Proposicao`, `Tramitacao`, `Frequencia`
- Depends on: PostgreSQL (Neon), `DATABASE_URL`
- Used by: everything above

## Data Flow

### Primary Read Path (profile dashboard)

1. Route match — `src/app/parlamentares/[id]/dashboard/page.tsx:28` loads the parlamentar via Prisma, renders `ParlamentarHeader` + `DashboardTab` (Server Component shell).
2. Client fetch — `src/app/parlamentares/[id]/components/DashboardTab.tsx:72` calls `fetch('/api/parlamentares/${id}/dashboard?ano=...')` with `cache: 'no-store'` and an `AbortSignal`.
3. Validation — `src/app/api/parlamentares/[id]/dashboard/route.ts:59` parses query params with zod (arrays preserved for repeated keys), returns 400 on failure, 404 if parlamentar missing.
4. Data load — route loads votos/discursos/proposições/frequência for the year (`route.ts:108-176`), plus party votes for alignment.
5. Compute — pure functions `computeAlinhamento`, `computeAtividadeMensal`, `computeTemas` from `src/lib/dashboard.ts` turn rows into metrics.
6. Response — one JSON envelope (`route.ts:234`) with `ano`, `anos`, `filtros`, `frequencia`, `alinhamento`, `atividade`, `temas`; client renders tables/badges with skeleton states.

### Search/List Path

1. `src/app/parlamentares/page.tsx` wraps `ParlamentaresPageClient` in `<Suspense>` with a static skeleton.
2. Client builds query string and calls `GET /api/parlamentares` (`ParlamentaresPageClient.tsx:97`).
3. Route validates with zod, builds `where` via `buildParlamentarWhere` (`src/lib/parlamentar-query.ts:27`), paginates with `parsePaginacao`/`calcularPaginacao`.
4. Special `sort=produtivos` branch (`route.ts:62-188`): loads filtered IDs, runs four `groupBy` aggregations in `Promise.all`, scores in memory with `calcularPontuacao`, sorts, slices a page, re-fetches rows for that page.
5. Dropdowns come from `GET /api/partidos` and `GET /api/ufs`.

### Sync/Ingestion Path (daily)

1. GitHub Actions `schedule` (03:00 UTC Câmara / 04:00 UTC Senado) or `workflow_dispatch` — `.github/workflows/sync-camara.yml`, `sync-senado.yml`.
2. Workflow runs `npx ts-node scripts/sync-camara.ts --apenas-<fase> --ano=YYYY` per phase (partidos → parlamentares → votações → discursos → proposições → frequência) to avoid rate limits.
3. Script gets adapter from `NormalizerFactory.getCamara()` / `.getSenado()` (`scripts/sync-camara.ts:29`).
4. Adapter paginates (`async *paginate`) through house API using `camaraClient`/`senadoClient` from `src/lib/sync/http-client.ts`, classifies themes via `extrairTemaPrincipal`, returns `*Normalizado` objects.
5. Script persists with `upsert` keyed on `idExterno` (idempotent); tramitações are replaced wholesale in a `$transaction` (`scripts/sync-camara.ts:285-296`).
6. Optionally triggered indirectly: Vercel Cron (`vercel.json` → `0 3 * * *`) hits `/api/cron/sync-incremental?casa=ambas`, which authenticates with `CRON_SECRET` and POSTs `workflow_dispatch` to the GitHub API (`src/app/api/cron/sync-incremental/route.ts:47-74`).

**State Management:**
- No global client state library. Each client component owns local `useState`/`useEffect` state; server state is refetched with `cache: 'no-store'`.
- Server-side: Prisma global singleton (`src/lib/prisma.ts`), `NormalizerFactory` static `Map` of adapter instances (`src/lib/sync/normalizer-factory.ts:18`), and module-scope `ANOS_GLOBAL` cache in the dashboard route.
- Theme state via `next-themes` inside `src/components/ThemeProvider.tsx`.

## Key Abstractions

**Normalized entity types:**
- Purpose: Single contract for both legislative houses before touching the DB
- Examples: `src/lib/sync/types.ts` (`ParlamentarNormalizado`, `VotacaoNormalizado`, `VotoNormalizado`, `ProposicaoComTramitacoes`, `FrequenciaNormalizada`, `SyncResult`)
- Pattern: Plain interfaces + string-literal unions mirroring Prisma enums; adapters must return these shapes

**NormalizerFactory:**
- Purpose: Cached adapter creation keyed by `Casa`, extensible to new houses
- Examples: `src/lib/sync/normalizer-factory.ts` (`create`, `getCamara`, `getSenado`, `clearInstances`)
- Pattern: Static factory with singleton registry + `BaseAdapter` interface (`getStats`/`resetStats`)

**HttpClient:**
- Purpose: Respect free-tier limits of each government API
- Examples: `src/lib/sync/http-client.ts` — pre-built `camaraClient` (120 req/min), `senadoClient` (60/min), `portalTransparenciaClient` (350/min)
- Pattern: Internal FIFO queue, sliding-window rate limiter, exponential backoff, 429 `Retry-After` handling, 30s timeout

**Pure compute functions:**
- Purpose: Metrics without I/O so Jest covers them (`src/lib/__tests__/`)
- Examples: `computeAlinhamento`, `computeAtividadeMensal`, `computeTemas` (`src/lib/dashboard.ts`); `calcularPontuacao`, `contadoresDeGrupos` (`src/lib/produtividade.ts`); `somarFrequencias` (`src/lib/frequencia.ts`)
- Pattern: Take plain arrays/DTOs, return typed results; async DB wrapper lives in a separate exported function (`obterFrequenciaOficial`)

**Where-builder + pagination:**
- Purpose: Centralize filter semantics and paging limits
- Examples: `buildParlamentarWhere`, `parsePaginacao`, `calcularPaginacao` (`src/lib/parlamentar-query.ts`)
- Pattern: Pure function returning `Prisma.ParlamentarWhereInput`; `DEFAULT_PER_PAGE = 20`, `MAX_PER_PAGE = 50`

**Theme classifier:**
- Purpose: Assign legislative themes (economia, saúde, educação, …) to votações/discursos/proposições
- Examples: `src/lib/temas.ts` (`classificarTemas`, `extrairTemaPrincipal`, `temaCor`), keyword weights in `src/lib/temas-keywords.json`
- Pattern: Weighted keyword rules with confidence threshold, returns highest-confidence theme

## Entry Points

**Web app:**
- Location: `src/app/layout.tsx` (root), `src/app/page.tsx` (home), route tree under `src/app/**/page.tsx`
- Triggers: HTTP requests to Vercel (region `gru1`)
- Responsibilities: SSR/SSG shells, metadata, client hydration

**HTTP API:**
- Location: `src/app/api/**/route.ts` (15 route files: `parlamentares/*`, `votacoes/*`, `partidos`, `ufs`, `stats/visao-geral`, `cron/sync-incremental`)
- Triggers: `fetch` from client components; Vercel Cron for the cron route
- Responsibilities: validate → query → compute → JSON. All declare `export const dynamic = 'force-dynamic'`

**Batch sync CLIs:**
- Location: `scripts/sync-camara.ts`, `scripts/sync-senado.ts`, `scripts/backfill-status-proposicoes.ts`, `scripts/backfill-votos-faltantes.ts`
- Triggers: `npm run sync:camara` / `sync:senado` / `backfill:status`; GitHub Actions steps
- Responsibilities: fetch-normalize-persist loop with console progress logging, `process.exit(1)` on failure

**Scheduled triggers:**
- Location: `.github/workflows/sync-camara.yml` (cron `0 3 * * *`), `.github/workflows/sync-senado.yml` (cron `0 4 * * *`), `vercel.json` crons → `/api/cron/sync-incremental?casa=ambas`
- Triggers: schedule / `workflow_dispatch` / Vercel Cron
- Responsibilities: keep 3-year window (2024–2026) complete; guardrail step detects nominal votações with zero votes

**CI:**
- Location: `.github/workflows/ci.yml`
- Triggers: push/PR to `master`/`main`
- Responsibilities: `tsc --noEmit` → `lint` → `jest --coverage` (+ Codecov) → Playwright e2e against production URL

## Architectural Constraints

- **Threading/concurrency:** Single-threaded Node per serverless function; ingestion concurrency is bounded by the `HttpClient` queue (sequential requests, 100ms inter-request delay) and batch size 10 parlamentares at a time in `scripts/sync-camara.ts:221`.
- **Global state:** `src/lib/prisma.ts` stores the client on `globalThis` (dev only); `NormalizerFactory.instances` is a static `Map` (`src/lib/sync/normalizer-factory.ts:18`); `ANOS_GLOBAL` is a module-scope cache populated by **top-level await** at route-module load (`src/app/api/parlamentares/[id]/dashboard/route.ts:31-36`) — it never refreshes within a warm lambda.
- **Circular imports:** None detected. Dependency direction is strictly pages → api → lib → prisma, and scripts → `src/lib/sync` → `src/lib/temas`. `normalizer-factory.ts` re-exports both adapters but adapters do not import the factory.
- **No middleware:** `src/middleware.ts` does not exist — no auth/redirect layer (product is 100% public per `CONTEXT.md`).
- **Route params:** Dynamic routes type `params` as `Promise<{ id: string }>` and `await` it (Next 15 style running on Next 14.2 — awaiting a plain object is harmless but keep the convention when adding routes).
- **CORS:** `Access-Control-Allow-Origin: *` on all `/api/*` in both `next.config.js` and `vercel.json` — API is intentionally public.
- **No API layer caching:** every route is `force-dynamic`; client fetches use `cache: 'no-store'`. There is no ISR/revalidation anywhere.
- **DB affinity:** raw SQL uses `EXTRACT(YEAR ...)` and `"snake_case"` quoted identifiers — PostgreSQL-only (`prisma.$queryRawUnsafe` in `src/lib/parlamentar-anos.ts`, `src/app/api/stats/visao-geral/route.ts`, `src/app/api/parlamentares/[id]/dashboard/route.ts`).
- **Environment:** `DATABASE_URL` (with Neon cold-start tuning appended in workflows), `CRON_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `CAMARA_API_BASE`, `NEXT_PUBLIC_APP_URL` (referenced in code; `.env`/`.env.example` hold values — not read).

## Anti-Patterns

### `as any` casts on Prisma query results

**What happens:** `where` objects and `groupBy` results are cast with `as any` instead of typed as `Prisma.XWhereInput` / inferred row types — 12 occurrences in API routes (e.g. `src/app/api/votacoes/route.ts:60-62`, `src/app/api/parlamentares/route.ts:121-129`, `src/app/api/parlamentares/[id]/votacoes/route.ts:65`).
**Why it's wrong:** Silences type checking exactly where filters compose dynamically; a typo in a column name compiles and fails at runtime.
**Do this instead:** Build `where` as `Record<string, Prisma.VotacaoWhereInput>` or use discriminated input types as `buildParlamentarWhere` does in `src/lib/parlamentar-query.ts:27`; rely on `Promise.all` inference for `groupBy` instead of `as any[]`.

### Raw SQL via `$queryRawUnsafe` for date extraction

**What happens:** Year lists are computed with hand-written SQL in three places (`src/lib/parlamentar-anos.ts:9`, `src/app/api/stats/visao-geral/route.ts:7`, `src/app/api/parlamentares/[id]/dashboard/route.ts:21`).
**Why it's wrong:** Bypasses Prisma's schema awareness; table/column renames break silently. Only `parlamentar-anos.ts` parameterizes user input (`$1`); the others interpolate identifiers.
**Do this instead:** Keep the single shared helper `anosComDados` (`src/lib/parlamentar-anos.ts`) as the only raw-SQL island; for stats use Prisma `groupBy` on `data` with a `select` or move the query into `src/lib/` with `$queryRaw` tagged templates.

### Duplicated query-param parsing per route

**What happens:** Each route hand-rolls `searchParams` → object conversion; the dashboard route additionally reimplements array decompression (`src/app/api/parlamentares/[id]/dashboard/route.ts:45-58`) while others pass `Object.fromEntries(searchParams)` (`src/app/api/parlamentares/route.ts:32`).
**Why it's wrong:** Repeated-key (`?tipoVoto=SIM&tipoVoto=NAO`) support differs between routes, so filters behave inconsistently across tabs.
**Do this instead:** Extract a shared `parseQuery(request, schema)` helper in `src/lib/` (alongside `parsePaginacao`) that always collects repeated keys into arrays, then applies zod.

### Module-scope top-level await in a route file

**What happens:** `ANOS_GLOBAL` is awaited at import time in `src/app/api/parlamentares/[id]/dashboard/route.ts:31-36`.
**Why it's wrong:** Cold starts pay the query before the first request; warm instances serve a stale year list forever; failure mode is a silent empty array.
**Do this instead:** Compute per-request with a short TTL cache (e.g. `unstable_cache` or an in-memory timestamped memo in `src/lib/`), or derive years from the already-fetched parlamentar data.

### Near-duplicate sync scripts

**What happens:** `scripts/sync-camara.ts` (379 lines) and `scripts/sync-senado.ts` (361 lines) repeat the same phase gating, upsert, progress and summary logic with only the adapter and a few field names differing.
**Why it's wrong:** Bug fixes (e.g. the tramitação `$transaction`, batch size) must be applied twice; drift is already visible in backfill coverage (only Câmara has `backfill-votos-faltantes.ts`).
**Do this instead:** Extract a shared `runSync(adapter, casa, options)` orchestrator into `src/lib/sync/` that takes the `BaseAdapter` interface; keep per-house specifics inside the adapters.

## Error Handling

**Strategy:** Fail loudly at the edges (HTTP status codes for API, `process.exit(1)` for scripts), swallow-and-fallback for optional enrichment.

**Patterns:**
- Zod `safeParse` → `400 { error, details }` in every API route (e.g. `src/app/api/votacoes/route.ts:21-26`).
- Entity lookup failure → `404 { error }` (API) or `notFound()` / `redirect()` (pages, e.g. `src/app/parlamentares/[id]/page.tsx:44`).
- HTTP layer: retries with exponential backoff, 429 honors `Retry-After`, timeout via `AbortController` (`src/lib/sync/http-client.ts:87-143`).
- Scripts: top-level `try/catch` → `console.error` + `process.exit(1)`, `finally { prisma.$disconnect() }` (`scripts/sync-camara.ts:357-362`); per-item failures log a warning and skip (e.g. missing partido/UF at line 77-80).
- Cron route: wraps GitHub dispatch in try/catch per workflow, returns `200` with per-workflow status strings rather than failing the whole run (`src/app/api/cron/sync-incremental/route.ts:47-77`).
- Client components: `try { ... } catch { setError('Erro ao carregar ...') }` with skeleton/error rendering (e.g. `DashboardTab.tsx:64-78`).

## Cross-Cutting Concerns

**Logging:**
- Runtime routes/scripts use `console.log/warn/error` (emoji-prefixed progress banners in sync scripts). `pino` + `pino-pretty` are declared in `package.json` but **not imported anywhere in `src/` or `scripts/`** — structured logging is unused.
- Prisma logging: `['query','error','warn']` in development, `['error']` otherwise (`src/lib/prisma.ts:10`).

**Validation:**
- Zod at every API boundary (`querySchema` per route, `z.coerce` for numeric query params, `z.enum` for `Casa`/vote types).
- No request bodies exist (GET-only API) — body validation is not applicable.

**Authentication:**
- None for users (public product). Only the cron endpoint checks `Authorization: Bearer ${CRON_SECRET}` (`src/app/api/cron/sync-incremental/route.ts:8`).

**Accessibility/i18n:**
- `lang="pt-BR"` on `<html>`, aria labels on nav/breadcrumbs, `pt-BR` date/number formatting via `src/lib/utils.ts`. No i18n framework — strings are hardcoded Portuguese.

---

*Architecture analysis: 2026-10-09*
