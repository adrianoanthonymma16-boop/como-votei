# External Integrations

**Analysis Date:** 2026-10-09

## APIs & External Services

**Legislative data — Câmara dos Deputados:**
- Dados Abertos da Câmara API v2 - Source of deputies, parties, roll-call votes, speeches, proposals, and (via HTML page) attendance
  - SDK/Client: none — raw `fetch` through the in-repo `HttpClient` (`src/lib/sync/http-client.ts`), wrapper `src/lib/sync/camara-adapter.ts`
  - Base URL: `process.env.CAMARA_API_BASE || 'https://dadosabertos.camara.leg.br/api/v2'` (`src/lib/sync/camara-adapter.ts:23`)
  - Auth: none (no API key)
  - Endpoints consumed:
    - `GET /deputados` (paginated, legislatura 57) — `camara-adapter.ts:288`
    - `GET /deputados/{id}` (detail enrichment: `situacao`) — `camara-adapter.ts:321`
    - `GET /partidos` — `camara-adapter.ts:339`
    - `GET /votacoes?ano=` and `GET /votacoes/{id}/votos` — `camara-adapter.ts:356,391`
    - `GET /deputados/{id}/discursos?dataInicio&dataFim` — `camara-adapter.ts:407`
    - `GET /proposicoes`, `/proposicoes/{id}`, `/proposicoes/{id}/autores`, `/proposicoes/{id}/tramitacoes` — `camara-adapter.ts:442,464,475,489`
  - Non-API dependency: HTML scrape of `https://www.camara.leg.br/deputados/{id}/presenca-plenario/{ano}` for attendance, plain `fetch` **outside** the rate-limit queue — `src/lib/sync/camara-adapter.ts:547-548`
  - Outbound links generated: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=...` (`camara-adapter.ts:528`)
  - Rate limit: `camaraClient` = 120 req/min, burst 10, 100 ms spacing, 429 → `Retry-After`/exponential backoff — `src/lib/sync/http-client.ts:167-170,112-119`

**Legislative data — Senado Federal:**
- Dados Abertos do Senado (legis) - Source of senators, votes, speeches, authorships, bill status
  - SDK/Client: none — raw `fetch` via `senadoClient` + direct `fetch` for enrichment, `src/lib/sync/senado-adapter.ts`
  - Base URL: `https://legis.senado.leg.br/dadosabertos` (const, `senado-adapter.ts:20`); `SENADO_ADM_BASE = https://adm.senado.gov.br/adm-dadosabertos/api/v1` declared at `senado-adapter.ts:21` but **never used**
  - Auth: none; responses requested as JSON via `Accept: application/json` header (no XML parsing in the codebase)
  - Endpoints consumed:
    - `GET /senador/lista/atual`, `GET /senador/{id}` — `senado-adapter.ts:299,333`
    - `GET /votacao?dataInicio&dataFim&...` and vote detail — `senado-adapter.ts:387,417`
    - `GET /senador/{id}/discursos` — `senado-adapter.ts:447`
    - `GET /senador/{id}/autorias` — `senado-adapter.ts:602`
    - `GET /materia/situacaoatual/{codigo}` and `GET /materia/movimentacoes/{codigo}` — `senado-adapter.ts:555,573`
  - Known deprecation risk documented in code: `/materia/*` services flagged for removal 2026-02-01, substitute `/dadosabertos/processo/{idProcesso}` (`senado-adapter.ts:505-519`); enrichment handles 404/410 by returning `null`
  - Rate limit: `senadoClient` = 60 req/min conservative (official limit ~10 req/s), `senado-adapter.ts:516-519` documents parallel enrichment in batches of 8 with 429 backoff — `src/lib/sync/http-client.ts:172-175`, `senado-adapter.ts:523-545`
  - Outbound links generated: `https://www25.senado.leg.br/web/atividade/materias/-/materia/{codigo}` (`senado-adapter.ts:645`)

**GitHub:**
- GitHub REST API (`api.github.com`) - Vercel Cron triggers the daily sync workflows
  - SDK/Client: raw `fetch`
  - Auth: `GITHUB_TOKEN` env var (Bearer) — `src/app/api/cron/sync-incremental/route.ts:23,54`
  - Call: `POST /repos/{owner}/{repo}/actions/workflows/{sync-camara.yml|sync-senado.yml}/dispatches` with `ref: 'main'` — `route.ts:49-63`
  - Repository: `GITHUB_REPOSITORY` env var (`owner/repo`)

**Unused client:**
- `portalTransparenciaClient` (350 req/min) exported from `src/lib/sync/http-client.ts:177-180` — **no consumer anywhere in the repo**

## Data Storage

**Databases:**
- PostgreSQL (Neon / Vercel Postgres, free tier)
  - Connection: `DATABASE_URL` env var (`prisma/schema.prisma:5-8`)
  - Client: Prisma ORM — singleton `src/lib/prisma.ts`, schema `prisma/schema.prisma`, migrations `prisma/migrations/`
  - Migrations: `20260902041125_postgresql_init` (real), `20261009034942_temp` (empty); applied via `prisma migrate deploy` in CI with 5× retry (Neon cold start `P1002`) — `.github/workflows/sync-camara.yml:66-75`
  - Models: `Partido`, `Uf`, `Parlamentar`, `Votacao`, `Voto`, `Discurso`, `Proposicao`, `Tramitacao`, `Frequencia`
  - Raw SQL: `prisma.$queryRawUnsafe` with positional `$1` parameters in `src/lib/parlamentar-anos.ts`, `src/app/api/stats/visao-geral/route.ts`, `src/app/api/parlamentares/[id]/dashboard/route.ts`
- SQLite file `prisma/dev.db` (4.8 MB) committed in tree — legacy, not wired to `schema.prisma` (`provider = "postgresql"`)

**File Storage:**
- Local filesystem only; no S3/blob integration. Static assets in `src/app/` (`icon.svg`, `globals.css`)

**Caching:**
- None external (no Redis/CDN KV). In-app: `export const revalidate = 3600` on some Route Handlers (`src/app/api/partidos/route.ts:15`, `src/app/api/ufs/route.ts:15`, `src/app/api/parlamentares/[id]/{votacoes,discursos,proposicoes}/route.ts`) alongside `export const dynamic = 'force-dynamic'` on the rest; client fetches often use `cache: 'no-store'`
- Next.js image optimization caches remote parliament photos (`next.config.js:9-19`)

## Authentication & Identity

**Auth Provider:**
- **None — the product is fully public** (per `CONTEXT.md`: no login, no accounts)
- Browser-facing routes have no auth middleware
- Only machine-to-machine protection: cron endpoint checks `Authorization: Bearer ${CRON_SECRET}` — `src/app/api/cron/sync-incremental/route.ts:3-10` (skipped when `CRON_SECRET` is unset)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry/Datadog/Logtail SDK)

**Logs:**
- `console.log` / `console.warn` / `console.error` (e.g. `src/lib/sync/http-client.ts:116,135`, `src/app/api/cron/sync-incremental/route.ts:87`)
- `pino` + `pino-pretty` are declared in `package.json:27-28` but never imported — structured logging is a declared-but-unrealized intent
- Prisma query/error/warn logging in development only — `src/lib/prisma.ts:10`
- Coverage reports uploaded to **Codecov** in CI: `codecov/codecov-action@v5` with `secrets.CODECOV_TOKEN` — `.github/workflows/ci.yml:44-50`
- README positions "Vercel Logs" + "GitHub Actions logs" as the monitoring surface (`README.md:200-204`)

## CI/CD & Deployment

**Hosting:**
- Vercel (free tier) — `vercel.json`, `.vercel/project.json` present (git-ignored), production URL `https://como-votei.vercel.app`
- Region: `gru1` (São Paulo); function `maxDuration: 30` for the cron route

**CI Pipeline:**
- GitHub Actions — repo `adrianoanthonymma16-boop/como-votei`
  - `.github/workflows/ci.yml` — on push/PR to `master`/`main`: `npm ci` → `prisma generate` → `tsc --noEmit` → `next lint` → `jest --coverage` → Codecov; separate `e2e` job runs Playwright against **production** (`PLAYWRIGHT_BASE_URL: https://como-votei.vercel.app`)
  - `.github/workflows/sync-camara.yml` — `schedule: 0 3 * * *` (03:00 UTC) + `workflow_dispatch`; phases per year 2024/2025/2026; `timeout-minutes: 360`; post-run guardrails via inline `node -e` Prisma queries that fail the job on data anomalies
  - `.github/workflows/sync-senado.yml` — `schedule: 0 4 * * *` (04:00 UTC, after Câmara) + `workflow_dispatch`; same phased structure and guardrails
- Deploy: automatic on push to `main` (Vercel git integration)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` — PostgreSQL connection (Vercel + GitHub Actions secret)
- `CRON_SECRET` — bearer token protecting `/api/cron/*`
- `NEXT_PUBLIC_APP_URL` — canonical URL (`src/app/layout.tsx:15`)
- `GITHUB_TOKEN` + `GITHUB_REPOSITORY` — Cron → Actions dispatch (Vercel env)
- `CAMARA_API_BASE` / `SENADO_API_BASE` — API bases (public constants; `CAMARA_API_BASE` also a GitHub Actions *variable*)
- CI-only: `CODECOV_TOKEN`, `PLAYWRIGHT_BASE_URL`
- Local-only: `NODE_ENV` (Prisma logging)

**Secrets location:**
- `.env` local file (git-ignored) + documented template `.env.example`
- Vercel Environment Variables (project settings)
- GitHub Actions Secrets (`secrets.DATABASE_URL`, `secrets.CODECOV_TOKEN`) and Variables (`vars.CAMARA_API_BASE`)

## Webhooks & Callbacks

**Incoming:**
- None from third parties. The only inbound trigger is **Vercel Cron**: `GET /api/cron/sync-incremental?casa=ambas` at `0 3 * * *` (`vercel.json:13-18`) — auth via `CRON_SECRET`

**Outgoing:**
- `POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches` — fired from `src/app/api/cron/sync-incremental/route.ts:50`
- No webhook receivers, no payment/notifications/CRM callbacks

---

*Integration audit: 2026-10-09*
