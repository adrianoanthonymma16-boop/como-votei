# Codebase Concerns

**Analysis Date:** 2026-10-09

## Tech Debt

**Route segment config conflict (dead ISR):**
- Issue: `src/app/api/partidos/route.ts:5,15` and `src/app/api/ufs/route.ts:5,15` export both `dynamic = 'force-dynamic'` and `revalidate = 3600` — mutually contradictory; `revalidate` is ignored. `src/app/api/parlamentares/[id]/votacoes/route.ts:157`, `.../discursos/route.ts:127` and `.../proposicoes/route.ts:177` export `revalidate = 3600` without `force-dynamic`, but read `request.nextUrl.searchParams`, so they are dynamic anyway — also dead.
- Files: `src/app/api/partidos/route.ts`, `src/app/api/ufs/route.ts`, `src/app/api/parlamentares/[id]/{votacoes,discursos,proposicoes}/route.ts`
- Impact: README (`README.md:118-130`) documents these routes as "ISR 1h"; nothing is cached. Misleading to contributors and hides a real perf opportunity.
- Fix approach: pick one model per route. For truly static lists (`/api/partidos`, `/api/ufs`) remove `force-dynamic`, keep `revalidate = 3600`, and stop passing `searchParams`. For query-driven routes, remove `revalidate` and keep `force-dynamic`.

**README / ROADMAP drift (documentation debt):**
- Issue: `README.md:66-70` documents DB views `alinhamento_partidario*` that do not exist in `prisma/schema.prisma` or `prisma/migrations/*/migration.sql`; `README.md:125-127` documents `/api/discursos/[id]/full`, `/api/votacoes/[id]/alinhamento`, `/api/busca?q=` — none of these files exist under `src/app/api/`; `README.md:135-136` documents cursor pagination while `src/app/api/parlamentares/route.ts:190-207` uses offset (`skip`/`take`); `README.md:174` claims `axe-core 0 violations` (no a11y test in repo); `README.md:104-107` shows `scripts/lib/*-normalizer.ts` but adapters live in `src/lib/sync/`.
- Files: `README.md`, `ROADMAP.md`
- Impact: onboarding and planning commands (`/gsd-plan-phase`) trust these docs and may plan work against nonexistent endpoints/views.
- Fix approach: re-verify README against `src/app/api/` before each phase; either implement the missing routes or mark them "Backlog".

**Copy-paste duplication in tabs and list pages:**
- Issue: fetch/pagination/error boilerplate reimplemented per component; helper functions duplicated verbatim.
- Evidence: `extrairInfoProposicao` + `gerarResumo` in both `src/app/votacoes/VotacoesPageClient.tsx:63,76` and `src/app/parlamentares/[id]/components/VotacoesTab.tsx:34,49`; `const PER_PAGE = 10` in `DiscursosTab.tsx:29`, `VotacoesTab.tsx:31`, `ProposicoesTab.tsx:42`, `VotacoesPageClient.tsx:30`; `CORES_TIPO` defined locally in `ProposicoesTab.tsx:32`.
- Impact: bug fixes must be applied N times; inconsistencies already drift (error handling differs per tab).
- Fix approach: extract a `usePagedList(fetcher, params)` hook into `src/lib/`, and shared presentation helpers (`gerarResumo`, `extrairInfoProposicao`, badge maps) into `src/lib/utils.ts` or a `src/components/votacao/` module.

**Widespread `any` casts:**
- Issue: Prisma query builders cast through `any` to bypass typing; adapters type JSON as `any`.
- Evidence: `where as any` in `src/app/api/votacoes/route.ts:60,62`, `src/app/api/votacoes/[id]/votos/route.ts:55,57`, `src/app/api/parlamentares/[id]/{discursos,votacoes,proposicoes}/route.ts`; `faltas as any` / `propGroups as any[]` in `src/app/api/parlamentares/route.ts:121-129,175`; `options: any` in `scripts/sync-camara.ts:367`; `asArray<any>` and `(r: any)` throughout `src/lib/sync/senado-adapter.ts:45,427,523,557-614` and `src/lib/sync/camara-adapter.ts:263,478,492`.
- Impact: type safety lost exactly where schema errors occur (Prisma `where` objects, external API shapes). `npx tsc --noEmit` currently passes, but the casts make it pass vacuously.
- Fix approach: build the `where` object as `Prisma.VotacaoWhereInput` incrementally (no cast needed), and define narrow response interfaces for adapter JSON (or `zod` schemas — `zod` is already a dependency).

**Empty / ad-hoc migration:**
- Issue: `prisma/migrations/20261009034942_temp/migration.sql` contains only `-- This is an empty migration.`; name `temp` is not descriptive.
- Files: `prisma/migrations/20261009034942_temp/`
- Impact: harmless today, but empty migrations pollute deploy history and hide the real change that presumably happened outside Prisma (e.g. via Neon console).
- Fix approach: never commit empty migrations (`prisma migrate dev` has `--create-only` for deliberate cases); if schema changed manually, generate a real migration matching the DB state.

**`prisma/dev.db` committed to git:**
- Issue: 4.7 MB SQLite file tracked (`git ls-files` shows `prisma/dev.db`) although `prisma/schema.prisma:5-8` declares `provider = "postgresql"`.
- Impact: repo bloat, confusion for new contributors, risk of stale local data being mistaken for source of truth.
- Fix approach: `git rm --cached prisma/dev.db` and add `prisma/*.db` to `.gitignore`.

**Build script masks migration failures:**
- Issue: `package.json:7` — `"build": "prisma generate && (prisma migrate deploy || true) && next build"`. The `|| true` means a failed migration still produces a "successful" deploy.
- Files: `package.json`, `vercel.json` (`buildCommand: npm run build`)
- Impact: schema drift between code and Neon surfaces later as runtime Prisma errors in production instead of failing the deploy.
- Fix approach: let `prisma migrate deploy` fail the build; the retry loops already exist in `.github/workflows/sync-camara.yml` ("Run migrations", 5 attempts) — rely on those, not on swallowing errors.

**Large client components:**
- Issue: `src/app/votacoes/VotacoesPageClient.tsx` (559 lines), `src/app/parlamentares/[id]/components/DashboardTab.tsx` (488), `VotacoesTab.tsx` (371), `ProposicoesTab.tsx` (337) mix data fetching, filtering, badge renderers, and layout in one file.
- Impact: hard to navigate, hard to test, all shipped to the browser bundle.
- Fix approach: split presentational subcomponents (badges, accordion item, filter bar) out; keep only state + fetch in the container.

## Known Bugs

**`HttpClient` can throw `undefined` after repeated 429s:**
- Symptoms: sync job crashes with `undefined` error (no message) when the API rate-limits every attempt.
- Files: `src/lib/sync/http-client.ts:99-142` — `let lastError: Error;` is only assigned in the `catch` block; the `429` branch (`:112-119`) `continue`s without assigning it, so after the retry loop `throw lastError!` throws `undefined`.
- Trigger: external API returns 429 on all `retries+1` attempts (Senado "conservative" 60/min queue during bulk sync).
- Additional defects in the same function: (a) the `AbortController` timeout is created once and `clearTimeout` runs after the first resolved fetch (`:110`), so retries have **no timeout** and can hang for the queue's lifetime; (b) `RateLimitConfig.burstLimit` (`:35`) is stored but never enforced — dead config.
- Fix approach: initialize `lastError` with a generic Error, reset/recreate the timeout controller per attempt, delete or implement `burstLimit`.

**Module-scope DB query caches stale data for the life of the lambda:**
- Symptoms: default year on the dashboard stops advancing (e.g. still preferring 2026 long after data exists for the next year) until the function cold-starts; also runs during `next build` module evaluation.
- Files: `src/app/api/parlamentares/[id]/dashboard/route.ts:20-36` — `ANOS_GLOBAL = await anosComDadosGlobais()` executes at import time, result memoized in module scope, never refreshed; consumed at `:99` to choose the default `ano`.
- Trigger: long-lived serverless instance; new year's data synced by GitHub Actions.
- Fix approach: move the query inside `GET` (or TTL-cache it with a timestamp, e.g. 1h), and add `export const revalidate`/`dynamic` explicitly so build never evaluates it.

**Double fetch when changing filters on profile tabs:**
- Symptoms: every filter change fires the same request twice (two DB hits, flicker of loading state).
- Files: `DiscursosTab.tsx:66-68,83-87`, `VotacoesTab.tsx:100-102,117+`, `ProposicoesTab.tsx:89-91,111-117` — the handler calls `loadData(1, novoFiltro)` explicitly *and* the filter lives in `loadData`'s `useCallback` deps, so `useEffect(() => loadData(1), [loadData])` fires again.
- Trigger: selecting ano/tema/aprovada in any tab filter.
- Fix approach: single source of truth — keep filters in state and let only the effect trigger `loadData` (remove the direct call), or move filters into `loadData` refs.

**Collapsed accordions still fetch their data:**
- Symptoms: opening `/votacoes` fires ~10 parallel `/api/votacoes/[id]/votos` requests per page even though all accordions are visually collapsed.
- Files: `src/app/votacoes/VotacoesPageClient.tsx:515-537` — `VotosDaVotacao` is always mounted; the collapse is CSS-only (`grid-rows-[0fr]`). `VotosDaVotacao` fetches in `useEffect` on mount (`:140-161`).
- Trigger: every page view / pagination click on `/votacoes`.
- Fix approach: mount `VotosDaVotacao` only when `aberta === true` (`{aberta && <VotosDaVotacao .../>}`), keeping the CSS wrapper for the animation.

**Race conditions from un-aborted fetches:**
- Symptoms: fast filter/pagination changes can render a stale (older) response over a newer one.
- Files: `DiscursosTab.tsx:42-64`, `VotacoesTab.tsx:76-98`, `ProposicoesTab.tsx:59-87`, `VotacoesPageClient.tsx:145-161,286+` — no `AbortController`. Contrast with the correct pattern in `ParlamentaresPageClient.tsx:85-113` and `DashboardTab.tsx:95-100`.
- Trigger: rapid clicking of pagination or filter controls on slow network.
- Fix approach: adopt the `ParlamentaresPageClient` pattern (controller + `cleanup()` in effect) in the shared hook proposed above.

**E2E depends on a hardcoded production record:**
- Symptoms: CI e2e job goes red if that parlamentar is removed, renamed, or has no votes anymore.
- Files: `e2e/votacoes-educacionais.spec.ts:5` (`/parlamentares/cmtjl8hum002nwod5zhw6h2ny/votacoes`); `.github/workflows/ci.yml` `e2e` job runs against `PLAYWRIGHT_BASE_URL: https://como-votei.vercel.app`.
- Trigger: data re-sync / production change; also any prod deploy during CI.
- Fix approach: look the parlamentar up via `/api/parlamentares?limit=1` inside the test, and run e2e against a preview build (`next build && next start`) instead of production.

**Duplicate daily sync triggers:**
- Symptoms: Câmara sync runs twice concurrently at 03:00 UTC (schedule + Vercel cron dispatch), doubling API load and GitHub Actions minutes.
- Files: `vercel.json` `crons` (`0 3 * * *` → `/api/cron/sync-incremental?casa=ambas`) vs `.github/workflows/sync-camara.yml` (`schedule: '0 3 * * *'`) and `sync-senado.yml` (`'0 4 * * *'`).
- Trigger: every day.
- Fix approach: keep one trigger — either the GitHub `schedule` or the Vercel cron with `workflow_dispatch`, not both (stagger times if both are wanted).

## Security Considerations

**`next@14.2.0` pinned exactly — critical advisories:**
- Risk: `npm audit --omit=dev` reports **3 vulnerabilities (2 high, 1 critical)** covering ~37 advisories for `next`: cache poisoning, middleware/proxy authorization bypass, image-optimizer DoS/content injection, request smuggling, unauthenticated RCE on Windows-hosted servers and via AVIF image optimization.
- Files: `package.json:25` (`"next": "14.2.0"` — exact pin prevents patch pickup), lockfile `package-lock.json`.
- Current mitigation: deployment is Vercel/Linux (Windows RCE path not applicable), no custom middleware (`src/middleware.ts` absent), but `next.config.js` `images.remotePatterns` enables the image optimizer against `*.camara.leg.br` / `*.senado.leg.br`.
- Recommendations: bump to `next@14.2.35`+ (in-range patch, `npm audit fix` says it installs it) and re-run `npm audit`; re-check before every release.

**Cron endpoint fails open when `CRON_SECRET` is unset:**
- Risk: `src/app/api/cron/sync-incremental/route.ts:8` — `if (CRON_SECRET && authHeader !== \`Bearer ${CRON_SECRET}\`)` skips the check entirely if the env var is missing; the route then dispatches GitHub workflows using `GITHUB_TOKEN` (`:23-63`) for any anonymous caller → workflow-run spam / token abuse.
- Files: `src/app/api/cron/sync-incremental/route.ts`, `vercel.json` (crons), `.env.example` (documents `CRON_SECRET` but cannot enforce it).
- Current mitigation: only correct if `CRON_SECRET` is actually set in Vercel env; nothing verifies it at boot.
- Recommendations: fail closed — if `!CRON_SECRET` return 500 (`"CRON_SECRET não configurado"`); add a startup assertion; document required env in README deploy section.

**Over-permissive CORS, defined twice:**
- Risk: `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true` is an invalid/contradictory combination (browsers reject credentials with `*`), and the wildcard lets any site read all API responses.
- Files: `vercel.json` `headers` and `next.config.js` `async headers()` — duplicated, so the two can drift.
- Current mitigation: all endpoints are public read-only GET data (no auth, no cookies), so practical impact is low; still a bad default to inherit for future write endpoints.
- Recommendations: single source of truth (prefer `next.config.js`), drop `Allow-Credentials` unless cookies are introduced, keep methods limited to `GET`.

**No rate limiting / bot protection on API routes:**
- Risk: 15 unauthenticated routes (`src/app/api/**`) backed by Neon free tier; a scraper or a single misbehaving client can exhaust the connection pool. ROADMAP 5.3 ("Rate limit / bot protection") is still open.
- Files: all of `src/app/api/**/route.ts`; `ROADMAP.md:88`.
- Current mitigation: pagination caps exist (`src/lib/parlamentar-query.ts:20` `MAX_PER_PAGE = 50`, `src/app/api/votacoes/route.ts:14` `limit.max(50)`); Vercel WAF defaults.
- Recommendations: add per-IP limiting (Vercel middleware or `next-rate-limit`) before promoting traffic; keep `MAX_PER_PAGE` enforced everywhere.

**Raw SQL usage (`$queryRawUnsafe`):**
- Risk: three call sites use the "unsafe" helper; if a future edit interpolates user input, it becomes injection.
- Files: `src/lib/parlamentar-anos.ts:9-16` (parameterized `$1` — safe), `src/app/api/parlamentares/[id]/dashboard/route.ts:21-27` (static SQL — safe), `src/app/api/stats/visao-geral/route.ts:7-12` (table/column names interpolated, currently only from hardcoded literals — safe today).
- Current mitigation: no user input reaches any of them now; values verified 2026-10-09.
- Recommendations: switch to `prisma.$queryRaw` + `Prisma.sql` template; for `contarPorAno`, use a whitelist map (`{ votacoes: '"data"', ... }`) instead of string interpolation.

**Secrets hygiene:**
- Status: OK — `.env` is gitignored (`.gitignore:27`) and not tracked; `.env.example` contains only placeholders; no credentials found in tracked files.
- Watch: `.github/workflows/sync-*.yml` pass `DATABASE_URL: ${{ secrets.DATABASE_URL }}&connect_timeout=30&pool_timeout=60`; the append assumes the secret already contains `?` (true for Neon's `?sslmode=require`). If the secret format changes, connections break silently — see Fragile Areas.

**Dependency vulnerabilities (dev toolchain):**
- Status: full `npm audit` = **51 vulnerabilities (7 moderate, 42 high, 2 critical)**, mostly in Jest/Babel/istanbul chains (`js-yaml`, `source-map-js`, nested `postcss`).
- Impact: build-time only, but `source-map-js`/`postcss` ship inside `next`'s tree too.
- Recommendations: `npm audit fix` for non-breaking; schedule a `dependency-audit` pass (Regra 9) before the next release.

## Performance Bottlenecks

**Sync scripts: N+1 DB round-trips per vote (and per senator for Senado):**
- Problem: for every vote the script issues `parlamentar.findUnique` + `votacao.findUnique` + `voto.upsert` (3 queries), with no in-memory lookup cache.
- Files: `scripts/sync-camara.ts:179-211`, `scripts/sync-senado.ts:144-170`. Senado is worse: `senado.fetchVotosVotacao(senadorIdExterno, votacaoIdExterno)` (`src/lib/sync/senado-adapter.ts:415-439`) issues one HTTP request **per senator per votação**, so requests scale as senators × votações × 3 years (81 × hundreds × 3), through the serial `HttpClient` queue (60 req/min + 100 ms gap in `src/lib/sync/http-client.ts:66-82`). The same `votacao.upsert` is also executed once per senator (`scripts/sync-senado.ts:123-136`).
- Cause: row-by-row persistence instead of batched writes; no `Map` cache of already-resolved ids.
- Improvement path: preload `idExterno → id` maps for parlamentares/votacoes before the loop; use `prisma.voto.createMany({ data, skipDuplicates: true })` per batch; for Senado, fetch the votação's full nominal sheet once instead of per senator (or at least hoist the per-senator HTTP call outside the votação loop). This also shortens the `timeout-minutes: 360` window in `.github/workflows/sync-camara.yml`.

**Dashboard route loads a full year of rows into memory:**
- Problem: `src/app/api/parlamentares/[id]/dashboard/route.ts:108-127` fetches *all* votes + all discursos of the year (no `take`), then re-applies the same type filter in JS at `:153-154` (filter applied twice — once in Prisma `where`, once in memory); `:193-199` then loads every party colleague's vote for those votações.
- Cause: aggregation (`computeAlinhamento`, `computeAtividadeMensal`, `computeTemas` in `src/lib/dashboard.ts`) is done in JS rather than SQL.
- Improvement path: acceptable at current scale (~800 parlamentares × a few hundred votos/ano), but move `groupBy`/count aggregates into Prisma `groupBy` or SQL before the dataset grows (3-year window is bounded, so this is a watch item, not an emergency).

**Stats endpoint runs 14 queries per request, uncached:**
- Problem: `src/app/api/stats/visao-geral/route.ts:17-47` — 7 `count()` + 4 `groupBy` + 3 raw `GROUP BY` scans on every call, under `force-dynamic`, and the homepage card fetches it with `cache: 'no-store'` (`src/components/StatsCards.tsx:70`).
- Improvement path: add `export const revalidate = 3600` (stats change only with syncs) or compute once per build/sync and store in a tiny `Stat` table.

**Client-side data fetching waterfalls:**
- Problem: pages fetch through API routes from the browser instead of server components reading Prisma directly. Homepage fires independent requests: `/api/stats/visao-geral` (`StatsCards.tsx:70`), `/api/partidos` + `/api/ufs` (`SearchForm.tsx:34`), `/api/parlamentares?sort=...` (`ParlamentaresAtivos.tsx:54`, `ParlamentaresRecent.tsx:21`). Profile tabs each fetch their own list + `/anos` (`DiscursosTab.tsx:52,72`, `VotacoesTab.tsx:86,106`, `ProposicoesTab.tsx:72,95`).
- Cause: architecture choice — API routes as the only data layer, all rendering `'use client'`.
- Improvement path: for first paint (homepage, profile header) fetch in the server component and pass props; keep API routes for client-side filter/pagination updates. Cuts TTFB and removes the request storm on Neon free tier.

**Unindexed text search:**
- Problem: `mode: 'insensitive' contains` filters run as `ILIKE '%term%'` scans — `src/lib/parlamentar-query.ts:39-47`, `src/app/api/votacoes/route.ts:49-57`.
- Cause: no `pg_trgm` GIN index on `nome`, `descricao`, `ementa`.
- Improvement path: add `CREATE EXTENSION pg_trgm` + GIN indexes via migration if search latency shows up; at ~800 parlamentares it is fine, `votacoes` is the table to watch.

**GitHub Actions runtime vs free tier:**
- Problem: scheduled jobs re-run 3-year syncs daily per phase (`sync-camara.yml` loops `2024 2025 2026` for votações/discursos/proposições/frequência) with `timeout-minutes: 360`, and `sync-senado.yml` with `180`; plus the duplicate Vercel-cron dispatch (see Known Bugs). GitHub free tier = 2000 min/month.
- Improvement path: sync only "yesterday onward" on schedule, keep full 3-year loops for `workflow_dispatch`; drop the duplicate trigger.

## Fragile Areas

**Sync adapters (highest fragility in the repo):**
- Files: `src/lib/sync/senado-adapter.ts` (727 lines), `src/lib/sync/camara-adapter.ts` (618 lines), `src/lib/sync/http-client.ts`, `src/lib/sync/normalizer-factory.ts`.
- Why fragile: coverage 8.75% / 12.5% / 11.4% / 0% (see Test Coverage Gaps); nearly every fetch path swallows errors — `catch { return [] }` (`senado-adapter.ts:436`, `camara-adapter.ts:392`) or `return null` (`senado-adapter.ts:541,671,725`, `camara-adapter.ts:553,592`) — so a broken upstream endpoint silently yields *empty* data that looks like "parliamentarian did nothing".
- Additional documented risk: `senado-adapter.ts:512-517` states the proposição services (v3/v7) are marked deprecated with `DataDesativacaoCompleta 2026-02-01` (a date already past) and only "respondem normalmente hoje"; the replacement endpoint is known but unwritten.
- Safe modification: never widen a `catch`; convert silent `[]`/`null` returns into thrown errors surfaced by the sync job stats + workflow guardrails (`.github/workflows/sync-*.yml` already check proposição/tramitação counts — extend that pattern to votos and discursos); add adapter unit tests with fixture JSON before touching parsing logic.

**Heuristic data classification:**
- Files: nominal-vote detection `src/app/votacoes/VotacoesPageClient.tsx:49` (`ehVotacaoNominal`), the CI guardrail `sync-camara.yml` ("nominais sem votos", `descricao ILIKE '%Sim:%'`), `scripts/backfill-votos-faltantes.ts:95` (same ILIKE), theme classification `src/lib/temas.ts:16+` (keyword weights + thresholds) and `src/lib/temas-keywords.json`.
- Why fragile: correctness of user-visible features (which votações show individual votes, how votações are tagged) depends on free-text patterns in government data; wording changes upstream silently change classification.
- Safe modification: keep the "tolerance" guardrails (currently `c > 15` orphans fails the job); add golden-file tests in `src/lib/__tests__/temas.test.ts` style before tweaking weights; when Senado/Câmara wording changes, update fixtures first.

**Workflow env var string concatenation:**
- Files: `.github/workflows/sync-camara.yml` and `sync-senado.yml` — `DATABASE_URL: ${{ secrets.DATABASE_URL }}&connect_timeout=30&pool_timeout=60`.
- Why fragile: appends with `&` relies on the secret already containing a `?query`; works today with Neon URLs (`?sslmode=require`), breaks (connection to wrong dbname) if the secret is regenerated differently, or if the secret is empty (produces the literal `&connect_timeout=...`).
- Safe modification: set the params in Prisma URL form explicitly (`?connect_timeout=30&pool_timeout=60` appended only when `?` present) or via `prisma` datasource `connection_limit`; add a workflow step that validates `DATABASE_URL` starts with `postgresql://` before running migrations.

**Inline `node -e` guardrails:**
- Files: `.github/workflows/sync-camara.yml` (two guardrail steps), `.github/workflows/sync-senado.yml` (one).
- Why fragile: multi-line JS embedded in YAML with escaped `\$queryRaw` — untestable, easy to break on edit, invisible to `tsc`.
- Safe modification: move to `scripts/guardrails/*.ts` run via `ts-node`, same as the sync scripts.

**Caching / invalidation assumptions:**
- Files: `src/app/api/parlamentares/[id]/dashboard/route.ts:31-36` (module-scope cache, see Known Bugs) and the dead `revalidate = 3600` exports (see Tech Debt).
- Why fragile: three different caching approaches coexist (module memo, `revalidate`, `force-dynamic`) with no single documented policy; sync runs daily so any real cache must outlive or be invalidated by it.

**CI does not run `next build`:**
- Files: `.github/workflows/ci.yml` runs `tsc --noEmit`, `next lint`, `jest`, Playwright against production. No `next build` step.
- Why fragile: build-time failures (e.g. Prisma client generation, route segment config conflicts, RSC bundling issues) only surface during the Vercel deploy.
- Safe modification: add `npx prisma generate && npx next build` (with a dummy `DATABASE_URL`) to the `qualidade` job.

## Scaling Limits

**Neon free tier (database):**
- Current capacity: free tier connection pool (typically ~100 simultaneous, compute suspends when idle).
- Limit: cold-start connection failures are already mitigated ad hoc — `.github/workflows/sync-*.yml` append `connect_timeout=30&pool_timeout=60` and retry `migrate deploy` 5× (comment: "Neon free tier suspende o compute parado... P1002"). Serverless functions + client fetch storms compete for the same pool.
- Scaling path: move API reads to a pooled connection string (`?pgbouncer=true`), reduce per-page request count (see Performance), add response caching before raising traffic.

**GitHub Actions minutes:**
- Current capacity: 2000 min/month (free); jobs declare `timeout-minutes: 360` (Câmara) and `180` (Senado) and run daily × 2 triggers.
- Limit: sustained full 3-year syncs + duplicate dispatches can exceed the monthly quota, after which syncs stop silently (data goes stale).
- Scaling path: incremental sync windows, single trigger, self-hosted runner only if minutes cost grows.

**Vercel free tier:**
- Current capacity: daily cron + API functions; `src/app/api/cron/sync-incremental/route.ts` capped at `maxDuration: 30` (`vercel.json`).
- Limit: the cron route only *dispatches* workflows (safe under 30 s), but any future move of sync logic into the route will hit the limit; serverless DB connections per request also count against Neon.
- Scaling path: keep heavy sync in GitHub Actions (current design); add `revalidate` caching to hot routes.

**Data volume:**
- Status: 3-year window is bounded (CONTEXT.md); `Discurso.resumo` is `@db.Text` but truncated to 1000 chars at insert (`senado-adapter.ts:483`); full speech text intentionally not stored (CONTEXT.md "Pontos de Atenção"). No immediate storage risk.

## Dependencies at Risk

**`next` 14.2.0 (exact pin):**
- Risk: critical/high advisories (see Security).
- Impact: app runtime on Vercel — image optimizer, cache, server components.
- Migration plan: `"next": "14.2.35"` (patch line, no breaking changes), then re-run `npm run lint && npx tsc --noEmit && npx jest && npm run test:e2e`.

**`postcss` (bundled under `next`) ≤ 8.5.22 + `source-map-js`:**
- Risk: high-severity advisories (XSS via unescaped `</style>`, source-map path traversal / DoS).
- Impact: build-time CSS processing.
- Migration plan: resolved by the `next` bump; verify with `npm audit` afterwards.

**`pino` / `pino-pretty` (`package.json:27-28`):**
- Risk: declared dependencies that are never imported — logging is `console.*` everywhere (`src/lib/sync/http-client.ts:116,135`, adapters, `src/app/api/cron/sync-incremental/route.ts:87`).
- Impact: dead weight in the serverless bundle; ROADMAP 5.2 ("logging estruturado (pino)") is unfulfilled.
- Migration plan: either wire `pino` into a `src/lib/logger.ts` used by routes/cron, or remove both deps.

**`prisma` / `@prisma/client` ^5.12.0:**
- Risk: older 5.x line; schema uses `@db.Text`, enums, and raw queries that are stable, so no urgent issue.
- Impact: misses query-engine fixes/perf improvements.
- Migration plan: bump to latest 5.x in a dedicated phase (`prisma generate` + `migrate diff` to confirm no schema drift).

**Prisma CLI vs deployed schema:**
- Risk: `prisma/migrations/20261009034942_temp` empty migration plus `|| true` on migrate deploy means drift between `schema.prisma` and Neon may already exist undetected.
- Migration plan: run `npx prisma migrate diff --from-migrations --to-schema-datamodel prisma/schema.prisma` and reconcile before the next schema change.

## Missing Critical Features

**App Router error handling:**
- Problem: no `src/app/error.tsx`, no `src/app/not-found.tsx`, no `src/app/loading.tsx` (verified absent 2026-10-09). A thrown error in any server component renders Next's default error page; unknown parlamentar ids `redirect('/parlamentares')` (`src/app/parlamentares/[id]/page.tsx:38-43`) but bad API ids only return JSON 404s.
- Blocks: ROADMAP 5.2 ("Error boundary... erros não quebram UI") and ROADMAP 4.9 (SEO: sitemap/robots also absent — no `src/app/sitemap.ts`, `src/app/robots.ts`).

**Structured logging & observability:**
- Problem: only `console.*` calls (10 sites, see Dependencies); no request ids, no log correlation between Vercel cron → GitHub Actions run (the cron returns `resultados` JSON but nothing ingests it).
- Blocks: ROADMAP 5.2, "Métrica `dados_desatualizados_por_fonte`" (README:203) — no such metric is emitted anywhere.

**Documented-but-absent API endpoints:**
- Problem: `/api/discursos/[id]/full` (proxy to government API for full text), `/api/votacoes/[id]/alinhamento`, `/api/busca?q=` are listed in `README.md:125-127` but do not exist.
- Blocks: full-speech reading UX (tabs link straight to `urlOriginal` instead) and the alignment-by-party view promised in ROADMAP 3.5.

**Backup strategy:**
- Problem: no `pg_dump` workflow, no restore procedure (ROADMAP 5.6).
- Blocks: recovery from accidental data loss / bad sync overwrite (upserts are idempotent, but `tramitacao.deleteMany` in `scripts/sync-camara.ts:285-296` deletes-then-recreates history on every sync — a failed run mid-transaction path can lose rows).

**Rate limiting / bot protection:**
- Problem: see Security — ROADMAP 5.3 open.

## Test Coverage Gaps

**Overall coverage (measured 2026-10-09, `npx jest --coverage`):**
- Statements 36.84% / Branches 24.24% / Functions 33.10% / Lines 38.21%. 93 tests in 8 suites, all passing — but `collectCoverageFrom` in `jest.config.js` is limited to `src/lib/**/*.ts`, so API routes and components are **not counted at all** (0% in reality).

**Sync layer (`src/lib/sync/` — 10.15% stmts):**
- What's not tested: `camara-adapter.ts` (12.5%), `senado-adapter.ts` (8.75%), `http-client.ts` (11.42%), `normalizer-factory.ts` (0%). These are the most fragile files (see Fragile Areas) and the only code touching external government APIs.
- Risk: parsing regressions after upstream format changes ship undetected; guardrails in workflows are the only safety net.
- Priority: **High** — add fixture-based tests for `mapTipoVotoSenado`, proposição status mapping, pagination/`hasNext` logic (`camara-adapter.ts:263`), and `HttpClient` retry/429 behavior (would have caught the `throw undefined` bug).

**`src/lib/parlamentar-anos.ts` (0%):**
- What's not tested: the raw SQL year aggregation used by `/anos` and the dashboard default-year logic.
- Priority: Medium — needs a DB (testcontainers or a CI Postgres service) or SQL-text assertion tests.

**API routes (`src/app/api/**` — untested):**
- What's not tested: validation (zod schemas), pagination math, 404 paths, the `ANOS_GLOBAL` staleness, `where as any` behavior. E.g. `src/app/api/parlamentares/route.ts` produtividade ranking path (60+ lines of aggregation) has no test.
- Risk: contract changes break the frontend silently — client components parse responses by position/shape (`ParlamentaresPageClient.tsx:100-103`, `VotacoesPageClient.tsx:152-158`).
- Priority: **High** — add route-level tests with `prisma` mocked (extend `jest.config.js` `collectCoverageFrom` to `src/app/api/**/*.ts`).

**React components (untested):**
- What's not tested: tab double-fetch behavior, accordion state, filter/pagination interplay — all currently verified only by the single Playwright spec.
- Priority: Medium — component tests for the tabs once the shared hook refactor lands.

**E2E (1 spec, production-bound):**
- Files: `e2e/votacoes-educacionais.spec.ts` only; `.github/workflows/ci.yml` runs it against `https://como-votei.vercel.app` with a hardcoded parlamentar id.
- Risk: false confidence (happy path only) + flakiness from live production/data.
- Priority: Medium — add flows for `/votacoes` filtering, `/parlamentares` pagination/filters, and run against a local build.

**Accessibility & build checks (claimed but absent):**
- What's not tested: `axe-core` (README:174 claims 0 critical violations) and `next build` (CI never builds).
- Priority: High for `next build` in CI; Medium for axe integration test.

---

*Concerns audit: 2026-10-09*
