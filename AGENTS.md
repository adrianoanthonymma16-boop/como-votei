<!-- GSD:project-start source:PROJECT.md -->

## Project

**Como Votei**

Ferramenta de transparência legislativa gratuita e pública que permite analisar como deputados e senadores brasileiros atuam no Congresso: como votam, quais discursos fazem e quais leis propõem. Produto 100% open (sem login/cadastro), focado nos últimos 3 anos de dados, para qualquer cidadão que queira conferir o comportamento do seu representante.

**Core Value:** Dar visibilidade pública e gratuita ao comportamento parlamentar — se o dado oficial de uma votação, discurso ou proposição não estiver acessível e verificável aqui, o produto falhou.

### Constraints

- **Tech stack**: Next.js 14 + Prisma + PostgreSQL (Neon) — já em produção, sem trocar
- **Budget/tier**: 100% ferramentas gratuitas — Neon 0.5 GB, Vercel free, GH Actions free; schema de despesas precisa caber no orçamento (~+160 MB na A enxuta)
- **Fontes oficiais**: sem chave de API; bulk da Câmara pode falhar/estar indisponível — sync deve ser resiliente e retomável
- **Retenção**: dados de despesas seguem janela de 3 anos (junto com o escopo do produto); não acumular importações passadas
- **Compatibilidade**: normalização Câmara≠Senado — schemas distintos precisam de camada de adaptação (mesma exigência dos demais módulos)
- **Verificação**: `npx tsc --noEmit`, `npx next lint`, `npx jest` (93+ specs), `npx next build`, e2e Playwright — tudo verde antes de commit/push

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ~5.4 - All application code: `src/app/**`, `src/components/**`, `src/lib/**`, `scripts/*.ts`, `prisma/seed.ts`, `e2e/*.spec.ts`
- TSX (React) - Pages and components under `src/app/**/page.tsx` and `src/app/parlamentares/[id]/components/*.tsx`
- SQL - Prisma migrations in `prisma/migrations/*/migration.sql`; raw SQL embedded in `src/lib/parlamentar-anos.ts`, `src/app/api/stats/visao-geral/route.ts`, `src/app/api/parlamentares/[id]/dashboard/route.ts` (via `prisma.$queryRawUnsafe` with `$1` placeholders)
- YAML - GitHub Actions workflows in `.github/workflows/{ci,sync-camara,sync-senado}.yml`, Vercel config `vercel.json`
- JavaScript - Config files only: `next.config.js`, `jest.config.js`, `tailwind.config.js`, `postcss.config.js`

## Runtime

- Node.js 20 (CI pins `node-version: 20` in `.github/workflows/ci.yml` and sync workflows; `README.md` requires 20+)
- Deployment runtime: Vercel Serverless Functions, region `gru1` (São Paulo) — `vercel.json:7`
- Edge/middleware: Not used
- npm
- Lockfile: present (`package-lock.json`)
- CI install command: `npm ci` (all three workflows)

## Frameworks

- Next.js `14.2.0` (App Router) - `package.json:25`; all routes live in `src/app/` (pages + Route Handlers under `src/app/api/**/route.ts`)
- React `^18.3.0` / React DOM `^18.3.0` - UI rendering
- Prisma `^5.12.0` (`prisma` CLI + `@prisma/client`) - ORM / query layer; schema at `prisma/schema.prisma`
- Tailwind CSS `^3.4.0` - Styling; config in `tailwind.config.js` (`darkMode: 'class'`, custom `primary`/`secondary` palettes, `--font-atkinson` sans stack)
- Jest `^29.7.0` + `ts-jest` `^29.1.0` - Unit tests; config `jest.config.js` (`testEnvironment: 'node'`, preset `ts-jest`, alias `@/` → `src/`)
- Playwright `@playwright/test` `^1.44.0` - E2E; config `playwright.config.ts` (`testDir: ./e2e`, chromium only, auto-starts `npm run dev` outside CI)
- `next dev` / `next build` / `next start` — `package.json:6-8`
- Build pipeline: `prisma generate && (prisma migrate deploy || true) && next build` — `package.json:7` (migrations applied at build time, failure tolerated)
- ESLint `^8.57.0` + `eslint-config-next` `14.2.0` — `.eslintrc.json` extends only `next/core-web-vitals`
- Prettier `^3.2.0` + `prettier-plugin-tailwindcss` `^0.5.0` — **no `.prettierrc` / `prettier.config.*` file exists**; defaults + plugin are used
- `ts-node` `^10.9.2` — runs sync scripts with `--compiler-options '{"module":"CommonJS"}'` (see `package.json:13-16`)

## Key Dependencies

- `zod` `^3.23.0` - Query-param validation in every read API route (e.g. `src/app/api/parlamentares/route.ts:13-27` uses `z.object(...).safeParse` → 400 on failure)
- `@prisma/client` `^5.12.0` - Single data access layer; singleton at `src/lib/prisma.ts`
- `next` `14.2.0` - Server Components + Route Handlers in one app; `next/font/google` loads Atkinson Hyperlegible in `src/app/layout.tsx:8-12`
- `next-themes` `^0.4.6` - Dark mode; `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`
- `clsx` `^2.1.0` + `tailwind-merge` `^2.2.0` - Combined in `cn()` at `src/lib/utils.ts:3-5`; **use this helper for conditional classes**, do not hand-roll template strings
- `date-fns` `^3.6.0` - Declared in `package.json:24` but **not imported anywhere** in `src/`, `scripts/`, `e2e/` (formatting uses `Intl`/`toLocaleDateString` in `src/lib/utils.ts`)
- `pino` `^9.0.0`, `pino-pretty` `^11.0.0` - No imports found anywhere in the repo; logging is plain `console.*`
- `ts-node` - Executes the sync CLI scripts under `scripts/`

## Configuration

- `.env` present locally (git-ignored, `.gitignore:29-33`) — **contents never read**
- `.env.example` documents the variable contract:
- Runtime reads: `src/lib/prisma.ts:10` (`NODE_ENV` for Prisma log level), `src/app/api/cron/sync-incremental/route.ts:3,23-24`, `src/lib/sync/camara-adapter.ts:23`, `src/app/layout.tsx:15`
- GitHub Actions additionally uses repository secrets/vars: `secrets.DATABASE_URL`, `secrets.CODECOV_TOKEN`, `vars.CAMARA_API_BASE`
- `next.config.js` — `reactStrictMode`, `serverActions.bodySizeLimit: '2mb'`, `images.remotePatterns` for `**.camara.leg.br` and `**.senado.leg.br`, CORS headers on `/api/:path*`
- `vercel.json` — `buildCommand`/`devCommand`/`installCommand`, region `gru1`, `maxDuration: 30` on `src/app/api/cron/sync-incremental/route.ts`, Vercel Cron `0 3 * * *`, API CORS headers
- `tsconfig.json` — `strict: true`, `target: ES2017`, `moduleResolution: bundler`, path alias `@/*` → `./src/*`, `resolveJsonModule: true` (enables `src/lib/temas-keywords.json`)
- `postcss.config.js` — `tailwindcss` + `autoprefixer`
- `jest.config.js`, `playwright.config.ts`, `tailwind.config.js`, `.eslintrc.json` — see Frameworks above

## Platform Requirements

- Node.js 20+, npm
- PostgreSQL instance (local or Neon) — `DATABASE_URL`
- `npx prisma generate` before type-checking or running scripts (required by CI too: `.github/workflows/ci.yml`)
- Optional: GitHub repo + Actions secrets for sync jobs; `.env` for local dev
- Vercel (free tier) — deploy target, `https://como-votei.vercel.app`
- Neon / Vercel Postgres (free tier) — the sync workflows append `&connect_timeout=30&pool_timeout=60` to `DATABASE_URL` to survive Neon cold starts (`P1002`), `.github/workflows/sync-camara.yml:45`
- GitHub Actions — daily data sync (Câmara 03:00 UTC, Senado 04:00 UTC), `timeout-minutes: 360` on Câmara job
- Static artifact: `prisma/dev.db` (4.8 MB SQLite file) exists in the repo tree despite `schema.prisma` declaring `provider = "postgresql"` — legacy local DB, not used by the Postgres pipeline

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- React components: **PascalCase `.tsx`** — `src/components/ParlamentarCard.tsx`, `src/components/ui/Button.tsx`, `src/app/parlamentares/[id]/components/DashboardTab.tsx`
- Domain/logic modules: **kebab-case or single-word `.ts`** — `src/lib/parlamentar-query.ts`, `src/lib/sync/http-client.ts`, `src/lib/sync/camara-adapter.ts`, `src/lib/dashboard.ts`
- Next.js App Router files use framework names: `page.tsx`, `layout.tsx`, `route.ts` (API)
- CLI scripts: **kebab-case** — `scripts/sync-camara.ts`, `scripts/backfill-status-proposicoes.ts`
- Unit tests: **`src/lib/__tests__/<module>.test.ts`** (module name matches the source file: `dashboard.test.ts` → `src/lib/dashboard.ts`)
- E2E tests: **`e2e/<feature>.spec.ts`** — `e2e/votacoes-educacionais.spec.ts`
- `camelCase` throughout. Domain logic uses **Portuguese verb phrases** matching the domain: `calcularPaginacao`, `buildParlamentarWhere`, `somarFrequencias`, `classificarTemas`, `extrairTemaPrincipal`, `descreverTipoProposicao` (`src/lib/temas.ts`, `src/lib/parlamentar-query.ts`, `src/lib/frequencia.ts`)
- Generic computation helpers may use English: `computeFrequencia`, `computeAlinhamento`, `computeAtividadeMensal`, `mode` (`src/lib/dashboard.ts:55-196`)
- **Rule:** match the language of the file you are editing — Portuguese for domain/pure business functions, English acceptable for generic compute helpers. Never mix both styles inside one file.
- `camelCase` for locals and state: `votosRaw`, `anosAtividade`, `frequenciaOficial`, `pontuacaoById`
- **SCREAMING_SNAKE_CASE** for module-level constants and configuration: `DEFAULT_PER_PAGE`, `MAX_PER_PAGE` (`src/lib/parlamentar-query.ts:19-20`), `TIPOS_PRESENCA`, `TIPO_AUSENTE` (`src/lib/dashboard.ts:1-3`), `REGRAS` (`src/lib/temas.ts:23`), `CHAVES_FILTRO` (`src/app/parlamentares/ParlamentaresPageClient.tsx:41`)
- Literal unions use `as const` tuples, not enums: `TIPOS_PRESENCA = ['SIM', 'NAO', ...] as const` (`src/lib/dashboard.ts:1`)
- Boolean state reads as flag: `hasOnly`, `temDados`, `semDadosOficiais`, `isLoading`
- `interface` for object shapes, `type` for primitives/unions — `export type TipoVotoString = string` (`src/lib/dashboard.ts:5`), `export type GrupoTipoProposicao = ...` (`src/lib/produtividade.ts:17`)
- Result interfaces are suffixed `Result`/`Total`/`Agregado`: `FrequenciaResult`, `AlinhamentoResult`, `FrequenciaTotal`, `TemaAgregado` (`src/lib/dashboard.ts:24-53`, `src/lib/frequencia.ts:12`)
- Filter/query inputs suffixed `Filtros`: `ParlamentarFiltros` (`src/lib/parlamentar-query.ts:3`)
- Prisma entity types are imported from `@prisma/client` and extended inline with `&` when the API response adds fields: `ParlamentarCompleto = import('@prisma/client').Parlamentar & {...}` (`src/app/parlamentares/ParlamentaresPageClient.tsx:15-20`)
- **Named function declarations**, never default exports: `export function ParlamentaresPageClient() {...}` (`src/app/parlamentares/ParlamentaresPageClient.tsx:43`)
- `forwardRef` + explicit `displayName` for primitive UI components: `Button.displayName = 'Button'` (`src/components/ui/Button.tsx:44`)
- Page-level components named after the route: `VotacoesPageClient.tsx` sits beside `page.tsx` in the same segment

## Code Style

- Prettier is installed (`prettier@^3.2.0` + `prettier-plugin-tailwindcss@^0.5.0` in `package.json:45-46`) but **there is no Prettier config file, no `format` script, and no Prettier CI step** — formatting is convention-only
- Observed de-facto style: 2-space indent, single quotes, semicolons, trailing commas, 100+ char lines in dense logic, blank line between logical blocks
- Tailwind classes written inline and (mostly) sorted by utility grouping; the tailwindcss Prettier plugin would enforce ordering if configured
- Tool: `next lint` with **only** `next/core-web-vitals` (`.eslintrc.json` is 3 lines)
- Run: `npm run lint` → `next lint`
- `eslint-disable` is rare — one occurrence: `// eslint-disable-next-line react-hooks/exhaustive-deps` (`src/app/parlamentares/ParlamentaresPageClient.tsx:139`), always with the specific rule named on the line above the hook dep array
- `strict: true` in `tsconfig.json:6`; `noEmit`, `moduleResolution: "bundler"`, `target: ES2017`
- Path alias: **`@/*` → `./src/*`** (`tsconfig.json:21-23`) — this is the only alias
- Type-check gate: `npx tsc --noEmit` runs in CI before lint (`.github/workflows/ci.yml:32-36`)
- `as any` appears 14 times, mostly on Prisma `groupBy`/`$queryRawUnsafe` results in `src/app/api/parlamentares/route.ts:121-129` — acceptable only at the Prisma boundary, avoid elsewhere

## Import Organization

- Prefer the `@/` alias in app code and tests: `import { calcularPontuacao } from '@/lib/produtividade'` (`src/lib/__tests__/produtividade.test.ts:1-14`). Relative `../` appears in a few older tests (`src/lib/__tests__/frequencia.test.ts:1`, `status-proposicao.test.ts:1`) — **new tests should use `@/lib/<module>`**
- CLI scripts use relative paths into `src/`: `import { NormalizerFactory } from '../src/lib/sync/normalizer-factory'` (`scripts/sync-camara.ts:7`)
- Inline type imports: `import { type ClassValue, clsx } from 'clsx'` (`src/lib/utils.ts:2`)
- Client components start with the directive on line 1: `'use client';` (29 files under `src/`)

## Error Handling

- Validate query strings with Zod `safeParse` → **400** with flattened details:
- Not-found lookups → **404** `{ error: '<recurso> não encontrado' }` (`src/app/api/parlamentares/[id]/dashboard/route.ts:76-81`, `src/app/api/votacoes/[id]/votos/route.ts:37`)
- Cron secret check → **401** `{ error: 'Não autorizado' }` (`src/app/api/cron/sync-incremental/route.ts:9`)
- Error body shape is always `{ error: string, details?: ... }`; success bodies are either `{ data: T, ...pagination }` (list endpoints) or a plain object (dashboard-style)
- **Routes do NOT wrap Prisma calls in try/catch** — only validation and null checks are handled; unexpected DB errors bubble to Next.js. Keep new routes consistent with this (fail loudly) unless adding a shared error boundary
- Missing/official-data semantics: return zeros plus an explicit flag instead of estimating — see the `semDadosOficiais` pattern (`src/app/api/parlamentares/[id]/dashboard/route.ts:156-177`)
- Fetch with `AbortController` + `res.ok` check + `AbortError` filter:
- Tab components keep an `error: string | null` state and render a destructive-styled block: `setError(err instanceof Error ? err.message : 'Erro desconhecido')` (`src/app/parlamentares/[id]/components/DiscursosTab.tsx:36-60,129-132`)
- Loading and empty states are explicit: `{isLoading && ...}` / `{items.length === 0 && !isLoading && <empty>}` (`DiscursosTab.tsx:148-232`)
- One top-level `try/catch` around the whole run, emoji banner logs, per-step `console.log` progress (`scripts/sync-camara.ts:38-54`)
- HTTP layer handles resilience: rate-limit queue, `429` + `Retry-After`, exponential backoff, `AbortController` timeout, 3 retries — `src/lib/sync/http-client.ts:87-143`
- Prefer `null`/zero returns over throwing for invalid/missing input: `parsePaginacao(...) → null` (`src/lib/parlamentar-query.ts:57`), `somarFrequencias([]) → null` (`src/lib/frequencia.ts:39`), `mode([]) → undefined` (`src/lib/dashboard.ts:55`)

## Logging

- Sync scripts: `console.log` with emoji section headers (`🏛️`, `📋`, `⏰`) and `console.warn`/`console.error` for failures (`scripts/sync-camara.ts:42-44`)
- HTTP client: `console.warn` prefixed `[HTTP]` for rate limits and retries (`src/lib/sync/http-client.ts:116,135`)
- Client code: `console.error(err)` only inside catch blocks after AbortError filtering
- API route handlers: no logging at all — rely on Vercel request logs (see `README.md` "Monitoramento")

## Comments

- Module-level block comment stating purpose + usage on every non-trivial file: `src/lib/temas.ts:1-6`, `src/lib/sync/http-client.ts:1-4`, `scripts/sync-camara.ts:1-7` (includes how to run it and required env vars)
- Inline `//` for **business-rule rationale**, not narration — e.g. why the default year is not the current empty year (`src/app/api/parlamentares/[id]/dashboard/route.ts:83-87`), why sorting is in-memory (`src/app/api/parlamentares/route.ts:59-61`), why `.first()` is needed in Playwright (`e2e/votacoes-educacionais.spec.ts:81-83`)
- Test names/comments cite the authoritative source of fixtures: "Amostras reais de ... da API da Câmara" (`src/lib/__tests__/status-proposicao.test.ts:3-6`)
- `/** ... */` above exported functions with a one/two-line description in Portuguese; `@param`/`@returns` tags are **not** used — signature types carry that info (`src/lib/temas.ts:263-266,305-311`)
- `/** Palavras-chave ... */` doc comments on interface fields where semantics matter (`src/lib/temas.ts:15-20`)

## Function Design

- Pure functions take **plain data** (arrays/objects), never Prisma clients or `Request` — `computeAlinhamento(meusVotos, votosPartido, parlamentarId)` (`src/lib/dashboard.ts:110`)
- Parser/validators accept `unknown` and narrow: `parsePaginacao(rawPage: unknown, rawPerPage: unknown)` (`src/lib/parlamentar-query.ts:57`)
- Options objects for multi-flag operations: `SyncOptions { ano?, apenasParlamentares?, ... }` (`scripts/sync-camara.ts:10-18`)
- Always explicitly typed; return rich result objects rather than tuples
- Percentages/rates pre-rounded to 1 decimal: `taxaPresenca` (`src/lib/frequencia.ts`), `confianca` rounded to 2 (`src/lib/temas.ts:293`)
- Optional fields for "unknown" values: `rankingPartido?: number` (`src/lib/dashboard.ts:36`)

## Module Design

- **Named exports only** (exception: `src/lib/prisma.ts` exports both `export const prisma` and `export default prisma`)
- Barrel/index files: **none** — import directly from the module path (`@/lib/dashboard`, not `@/lib`)
- Constants exported from the module that owns them: `DEFAULT_PER_PAGE` lives in `src/lib/parlamentar-query.ts:19` next to the pagination logic
- `src/lib/` (pure/domain) ← `src/app/api/**/route.ts` (query + validate) ← `src/app/**/page.tsx` / client components (fetch + render)
- Adapters in `src/lib/sync/` normalize Câmara/Senado payloads into the shared model; export pure mapping functions (`mapStatusProposicao`, `mapStatusProposicaoSenado`) so they can be unit-tested without HTTP (`src/lib/sync/camara-adapter.ts`, `src/lib/sync/senado-adapter.ts`)
- UI primitives in `src/components/ui/` are presentation-only: variant maps + `cn()` class merge, no data fetching (`src/components/ui/Button.tsx:14-34`)
- Compose classes with `cn(...)` from `src/lib/utils.ts:5` (clsx + tailwind-merge) — required for `className` overrides to win
- Variants are plain object maps inside the component (`variants`, `sizes`) — follow this for any new UI primitive

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- Single deployable: UI, HTTP API and cron trigger all live in one Next.js app (`src/app/`); batch ingestion runs separately in GitHub Actions (`scripts/`).
- Read path never touches government APIs — the app reads only its own Postgres (`CONTEXT.md` invariant).
- Write path fully decoupled from the app: adapters normalize Câmara/Senado payloads into shared types before persistence, so schema changes are absorbed in one place.
- Server Components fetch Prisma directly for page shells/metadata; interactive data lives in `'use client'` tab components that fetch JSON API routes.
- Business metrics are extracted as pure functions in `src/lib/` so Jest can test them without a database.

## Layers

- Purpose: Render HTML shells, metadata, and orchestrate client tabs
- Location: `src/app/**/page.tsx`, `src/app/layout.tsx`
- Contains: Server Components with `generateMetadata`, `notFound()`/`redirect()` guards
- Depends on: `@/lib/prisma` (direct reads), `@/components/*`, tab components
- Used by: Browser
- Purpose: Filters, pagination, year selectors, charts/tables with loading/error states
- Location: `src/app/parlamentares/ParlamentaresPageClient.tsx`, `src/app/votacoes/VotacoesPageClient.tsx`, `src/app/parlamentares/[id]/components/*Tab.tsx`, `src/components/**`
- Contains: `'use client'` components with `useState`/`useEffect`/`AbortController`, `fetch(..., { cache: 'no-store' })`
- Depends on: API routes, `@/lib/utils` (`cn`, `formatDate`), `@/components/ui/*`
- Used by: Pages
- Purpose: Validate input, run Prisma queries, delegate computation, return JSON
- Location: `src/app/api/**/route.ts`
- Contains: `export const dynamic = 'force-dynamic'`, zod `querySchema`, `NextResponse.json`
- Depends on: `@/lib/prisma`, `@/lib/*` compute/query helpers, `zod`
- Used by: Client UI; `e2e/` tests via the deployed site
- Purpose: Testable metric math and text classification with no I/O
- Location: `src/lib/dashboard.ts`, `src/lib/produtividade.ts`, `src/lib/frequencia.ts`, `src/lib/temas.ts`, `src/lib/utils.ts`
- Contains: `computeAlinhamento`, `computeAtividadeMensal`, `computeTemas`, `calcularPontuacao`, `extrairTemaPrincipal`, formatting helpers
- Depends on: nothing (except `src/lib/frequencia.ts` which reads Prisma for the async wrapper)
- Used by: API routes, sync adapters, tab components
- Purpose: Fetch, rate-limit and normalize data from Câmara/Senado open APIs
- Location: `src/lib/sync/` (adapters, factory, http-client, types)
- Contains: `CamaraAdapter`, `SenadoAdapter`, `NormalizerFactory`, `HttpClient`, `*Normalizado` interfaces
- Depends on: global `fetch`, `crypto.createHash`, `src/lib/temas.ts`
- Used by: `scripts/*.ts` (never imported by app runtime code)
- Purpose: CLI entry points that persist normalized data with idempotent upserts
- Location: `scripts/sync-camara.ts`, `scripts/sync-senado.ts`, `scripts/backfill-*.ts`
- Contains: per-entity sync phases gated by `--apenas-*` flags, `PrismaClient` local to the script
- Depends on: `NormalizerFactory`, `@prisma/client`
- Used by: GitHub Actions workflows + manual `npm run sync:*`
- Purpose: Canonical store for all normalized legislative data
- Location: `prisma/schema.prisma`, migrations in `prisma/migrations/`
- Contains: `Partido`, `Uf`, `Parlamentar`, `Votacao`, `Voto`, `Discurso`, `Proposicao`, `Tramitacao`, `Frequencia`
- Depends on: PostgreSQL (Neon), `DATABASE_URL`
- Used by: everything above

## Data Flow

### Primary Read Path (profile dashboard)

### Search/List Path

### Sync/Ingestion Path (daily)

- No global client state library. Each client component owns local `useState`/`useEffect` state; server state is refetched with `cache: 'no-store'`.
- Server-side: Prisma global singleton (`src/lib/prisma.ts`), `NormalizerFactory` static `Map` of adapter instances (`src/lib/sync/normalizer-factory.ts:18`), and module-scope `ANOS_GLOBAL` cache in the dashboard route.
- Theme state via `next-themes` inside `src/components/ThemeProvider.tsx`.

## Key Abstractions

- Purpose: Single contract for both legislative houses before touching the DB
- Examples: `src/lib/sync/types.ts` (`ParlamentarNormalizado`, `VotacaoNormalizado`, `VotoNormalizado`, `ProposicaoComTramitacoes`, `FrequenciaNormalizada`, `SyncResult`)
- Pattern: Plain interfaces + string-literal unions mirroring Prisma enums; adapters must return these shapes
- Purpose: Cached adapter creation keyed by `Casa`, extensible to new houses
- Examples: `src/lib/sync/normalizer-factory.ts` (`create`, `getCamara`, `getSenado`, `clearInstances`)
- Pattern: Static factory with singleton registry + `BaseAdapter` interface (`getStats`/`resetStats`)
- Purpose: Respect free-tier limits of each government API
- Examples: `src/lib/sync/http-client.ts` — pre-built `camaraClient` (120 req/min), `senadoClient` (60/min), `portalTransparenciaClient` (350/min)
- Pattern: Internal FIFO queue, sliding-window rate limiter, exponential backoff, 429 `Retry-After` handling, 30s timeout
- Purpose: Metrics without I/O so Jest covers them (`src/lib/__tests__/`)
- Examples: `computeAlinhamento`, `computeAtividadeMensal`, `computeTemas` (`src/lib/dashboard.ts`); `calcularPontuacao`, `contadoresDeGrupos` (`src/lib/produtividade.ts`); `somarFrequencias` (`src/lib/frequencia.ts`)
- Pattern: Take plain arrays/DTOs, return typed results; async DB wrapper lives in a separate exported function (`obterFrequenciaOficial`)
- Purpose: Centralize filter semantics and paging limits
- Examples: `buildParlamentarWhere`, `parsePaginacao`, `calcularPaginacao` (`src/lib/parlamentar-query.ts`)
- Pattern: Pure function returning `Prisma.ParlamentarWhereInput`; `DEFAULT_PER_PAGE = 20`, `MAX_PER_PAGE = 50`
- Purpose: Assign legislative themes (economia, saúde, educação, …) to votações/discursos/proposições
- Examples: `src/lib/temas.ts` (`classificarTemas`, `extrairTemaPrincipal`, `temaCor`), keyword weights in `src/lib/temas-keywords.json`
- Pattern: Weighted keyword rules with confidence threshold, returns highest-confidence theme

## Entry Points

- Location: `src/app/layout.tsx` (root), `src/app/page.tsx` (home), route tree under `src/app/**/page.tsx`
- Triggers: HTTP requests to Vercel (region `gru1`)
- Responsibilities: SSR/SSG shells, metadata, client hydration
- Location: `src/app/api/**/route.ts` (15 route files: `parlamentares/*`, `votacoes/*`, `partidos`, `ufs`, `stats/visao-geral`, `cron/sync-incremental`)
- Triggers: `fetch` from client components; Vercel Cron for the cron route
- Responsibilities: validate → query → compute → JSON. All declare `export const dynamic = 'force-dynamic'`
- Location: `scripts/sync-camara.ts`, `scripts/sync-senado.ts`, `scripts/backfill-status-proposicoes.ts`, `scripts/backfill-votos-faltantes.ts`
- Triggers: `npm run sync:camara` / `sync:senado` / `backfill:status`; GitHub Actions steps
- Responsibilities: fetch-normalize-persist loop with console progress logging, `process.exit(1)` on failure
- Location: `.github/workflows/sync-camara.yml` (cron `0 3 * * *`), `.github/workflows/sync-senado.yml` (cron `0 4 * * *`), `vercel.json` crons → `/api/cron/sync-incremental?casa=ambas`
- Triggers: schedule / `workflow_dispatch` / Vercel Cron
- Responsibilities: keep 3-year window (2024–2026) complete; guardrail step detects nominal votações with zero votes
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

### Raw SQL via `$queryRawUnsafe` for date extraction

### Duplicated query-param parsing per route

### Module-scope top-level await in a route file

### Near-duplicate sync scripts

## Error Handling

- Zod `safeParse` → `400 { error, details }` in every API route (e.g. `src/app/api/votacoes/route.ts:21-26`).
- Entity lookup failure → `404 { error }` (API) or `notFound()` / `redirect()` (pages, e.g. `src/app/parlamentares/[id]/page.tsx:44`).
- HTTP layer: retries with exponential backoff, 429 honors `Retry-After`, timeout via `AbortController` (`src/lib/sync/http-client.ts:87-143`).
- Scripts: top-level `try/catch` → `console.error` + `process.exit(1)`, `finally { prisma.$disconnect() }` (`scripts/sync-camara.ts:357-362`); per-item failures log a warning and skip (e.g. missing partido/UF at line 77-80).
- Cron route: wraps GitHub dispatch in try/catch per workflow, returns `200` with per-workflow status strings rather than failing the whole run (`src/app/api/cron/sync-incremental/route.ts:47-77`).
- Client components: `try { ... } catch { setError('Erro ao carregar ...') }` with skeleton/error rendering (e.g. `DashboardTab.tsx:64-78`).

## Cross-Cutting Concerns

- Runtime routes/scripts use `console.log/warn/error` (emoji-prefixed progress banners in sync scripts). `pino` + `pino-pretty` are declared in `package.json` but **not imported anywhere in `src/` or `scripts/`** — structured logging is unused.
- Prisma logging: `['query','error','warn']` in development, `['error']` otherwise (`src/lib/prisma.ts:10`).
- Zod at every API boundary (`querySchema` per route, `z.coerce` for numeric query params, `z.enum` for `Casa`/vote types).
- No request bodies exist (GET-only API) — body validation is not applicable.
- None for users (public product). Only the cron endpoint checks `Authorization: Bearer ${CRON_SECRET}` (`src/app/api/cron/sync-incremental/route.ts:8`).
- `lang="pt-BR"` on `<html>`, aria labels on nav/breadcrumbs, `pt-BR` date/number formatting via `src/lib/utils.ts`. No i18n framework — strings are hardcoded Portuguese.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
