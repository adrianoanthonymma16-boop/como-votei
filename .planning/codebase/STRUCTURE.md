# Codebase Structure

**Analysis Date:** 2026-10-09

## Directory Layout

```text
como-votei/
├── .github/workflows/     # CI + daily sync jobs (Actions)
├── e2e/                   # Playwright specs
├── prisma/                # Schema, migrations, seed, dev.db (legacy SQLite)
├── scripts/               # ts-node batch sync/backfill CLIs
├── src/
│   ├── app/               # Next.js App Router (pages + API routes)
│   │   ├── api/           # Route Handlers (GET-only JSON API)
│   │   ├── parlamentares/ # List page + [id] profile with tab sub-routes
│   │   ├── votacoes/      # Votações listing (server page + client)
│   │   ├── sobre/         # Static about page
│   │   ├── layout.tsx     # Root layout (fonts, nav, theme)
│   │   ├── page.tsx       # Home
│   │   └── globals.css    # Tailwind layers + CSS custom properties
│   ├── components/        # Shared cross-page components
│   │   └── ui/            # Primitives (Badge, Button, Table, Tabs, ...)
│   └── lib/               # Domain logic, Prisma client, sync adapters
│       ├── sync/          # Câmara/Senado adapters, HTTP client, types
│       ├── __tests__/     # Jest unit tests (colocated under lib)
│       └── temas-keywords.json
├── .env / .env.example    # Env config (values not tracked/read here)
├── next.config.js         # Images allowlist, CORS headers for /api
├── vercel.json            # Cron, region gru1, function maxDuration
├── jest.config.js         # ts-jest, @/ path alias
├── playwright.config.ts   # e2e, chromium only
├── tailwind.config.js     # primary/secondary palettes, darkMode: class
├── tsconfig.json          # strict, paths: @/* -> ./src/*
└── package.json           # scripts: dev/build/sync:*/test/e2e
```

## Directory Purposes

**`src/app/` — Routes (pages + API):**
- Purpose: Everything URL-addressable. Follows App Router convention — a folder per route, `page.tsx` for UI, `route.ts` for the API.
- Contains: Server Component pages with `generateMetadata`, `export const dynamic = 'force-dynamic'` route handlers.
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/api/cron/sync-incremental/route.ts`.

**`src/app/parlamentares/[id]/` — Profile module:**
- Purpose: Five tab sub-routes (`votacoes`, `proposicoes`, `discursos`, `dashboard`, `produtividade`) sharing one header.
- Contains: `page.tsx` (redirects to `/votacoes`), one `page.tsx` per tab, `components/` with the client tab components (`*Tab.tsx`), `ParlamentarHeader.tsx`, `DashboardFilters.tsx`.
- Key files: `src/app/parlamentares/[id]/components/DashboardTab.tsx` (largest client component, 488 lines).

**`src/app/api/` — JSON API:**
- Purpose: All runtime data access for the browser. GET-only, zod-validated.
- Contains: 15 `route.ts` files grouped `parlamentares/`, `votacoes/`, `stats/`, plus `partidos/`, `ufs/`, `cron/`.
- Key files: `src/app/api/parlamentares/route.ts` (list + produtividade ranking), `src/app/api/parlamentares/[id]/dashboard/route.ts` (richest payload).

**`src/components/` — Shared UI:**
- Purpose: Components reused across pages (cards, banners, theme, search).
- Contains: 14 components + `ui/` primitives.
- Key files: `src/components/StatsCards.tsx`, `src/components/ParlamentarCard.tsx`, `src/components/ThemeProvider.tsx`.

**`src/components/ui/` — Primitives:**
- Purpose: Generic building blocks with `forwardRef` + `cn()` class merging.
- Contains: `Badge`, `Button`, `Input`, `Select`, `Table`, `Tabs`, `Skeleton`, `Pagination`, `PaginacaoNumerica`.
- Key files: `src/components/ui/Badge.tsx` (variant map pattern shared by others).

**`src/lib/` — Domain + infrastructure:**
- Purpose: Framework-agnostic logic (pure functions) plus Prisma and sync plumbing.
- Contains: `dashboard.ts`, `produtividade.ts`, `frequencia.ts`, `temas.ts`, `parlamentar-query.ts`, `parlamentar-anos.ts`, `utils.ts`, `prisma.ts`, `sync/`, `__tests__/`, `temas-keywords.json`.
- Key files: `src/lib/prisma.ts` (singleton), `src/lib/sync/types.ts` (canonical normalized shapes).

**`src/lib/sync/` — Ingestion adapters:**
- Purpose: Translate house-specific APIs into unified `*Normalizado` types; never imported by app runtime code.
- Contains: `camara-adapter.ts` (618 lines), `senado-adapter.ts` (727 lines), `http-client.ts`, `normalizer-factory.ts`, `types.ts`.
- Key files: `src/lib/sync/normalizer-factory.ts` (entry point for scripts).

**`scripts/` — Batch CLIs:**
- Purpose: Offline ingestion and repair, run by GitHub Actions or manually via `npm run sync:*`.
- Contains: `sync-camara.ts`, `sync-senado.ts`, `backfill-status-proposicoes.ts`, `backfill-votos-faltantes.ts`.
- Key files: `scripts/sync-camara.ts` (reference implementation of the phase-gated sync loop).

**`prisma/` — Database:**
- Purpose: Schema source of truth, migrations, seed data.
- Contains: `schema.prisma` (9 models, 4 enums), `migrations/` (incl. `20261009034942_temp`), `seed.ts` (partidos + UFs), `dev.db` (leftover SQLite file — production is PostgreSQL).
- Key files: `prisma/schema.prisma`.

**`e2e/` — Playwright specs:**
- Purpose: Browser flows against deployed app (`PLAYWRIGHT_BASE_URL`).
- Contains: `votacoes-educacionais.spec.ts`.
- Key files: `e2e/votacoes-educacionais.spec.ts`.

**`.github/workflows/` — Automation:**
- Purpose: Quality gate + daily data sync.
- Contains: `ci.yml` (types/lint/jest/coverage/e2e), `sync-camara.yml` (03:00 UTC, 360min timeout), `sync-senado.yml` (04:00 UTC, 180min timeout).

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout — fonts, metadata, nav, theme provider
- `src/app/page.tsx`: Home page (dynamic `StatsCards`/`SearchForm`)
- `src/app/api/**/route.ts`: 15 API endpoints
- `scripts/sync-camara.ts`, `scripts/sync-senado.ts`: ingestion CLIs

**Configuration:**
- `tsconfig.json`: strict mode, `@/*` → `./src/*` path alias
- `next.config.js`: image `remotePatterns` for `*.camara.leg.br` / `*.senado.leg.br`, CORS on `/api/*`
- `vercel.json`: cron `0 3 * * *` → `/api/cron/sync-incremental?casa=ambas`, region `gru1`, 30s max for cron fn
- `jest.config.js`, `playwright.config.ts`, `tailwind.config.js`, `.eslintrc.json` (`next/core-web-vitals`)
- `.env` / `.env.example`: environment config (existence noted; contents not read)

**Core Logic:**
- `src/lib/dashboard.ts`: alignment, monthly activity, theme aggregation
- `src/lib/produtividade.ts`: weighted scoring model (PEC > PLP > PL > PDL/PRC > REQ > INC)
- `src/lib/frequencia.ts`: official frequency summation
- `src/lib/temas.ts` + `src/lib/temas-keywords.json`: theme classification
- `src/lib/parlamentar-query.ts`: `buildParlamentarWhere`, pagination helpers
- `src/lib/sync/http-client.ts`: rate-limited fetch queue

**Testing:**
- `src/lib/__tests__/*.test.ts`: 8 Jest suites (unit, node env)
- `e2e/votacoes-educacionais.spec.ts`: Playwright
- Coverage collected from `src/lib/**/*.ts` except `src/lib/prisma.ts`

## Naming Conventions

**Files:**
- Pages: `page.tsx`; API handlers: `route.ts` (App Router mandated)
- Components: PascalCase matching the export — `ParlamentarCard.tsx` → `ParlamentarCard`
- Tab components: `<Name>Tab.tsx` (`VotacoesTab.tsx`, `DiscursosTab.tsx`, `DashboardTab.tsx`)
- Client pages: `<Name>PageClient.tsx` (`ParlamentaresPageClient.tsx`, `VotacoesPageClient.tsx`)
- Lib modules: kebab-case, domain noun — `parlamentar-query.ts`, `http-client.ts`, `normalizer-factory.ts`
- Tests: `<module>.test.ts` inside `src/lib/__tests__/`
- Scripts: `sync-<casa>.ts`, `backfill-<thing>.ts`

**Directories:**
- Portuguese domain names throughout: `parlamentares`, `votacoes`, `discursos`, `proposicoes`, `frequencia`, `sobre`
- Dynamic segments in brackets: `[id]`
- API folders mirror page folders: `api/parlamentares/[id]/votacoes` ↔ `parlamentares/[id]/votacoes`

**Code identifiers:**
- Functions/vars: camelCase; types/interfaces: PascalCase (`ParlamentarNormalizado`, `ContadoresProdutividade`)
- DB columns: snake_case in SQL via `@map` (`data_apresentacao`), camelCase in Prisma
- External IDs: `idExterno` everywhere (unique per house)
- Vote/status enums: SCREAMING_SNAKE (`ABSTENCAO`, `EM_TRAMITACAO`, `APROVADA_CAMARA`)
- Exports: named functions preferred; default export only in `src/components/Logo.tsx` (redundant with its named export)

## Where to Add New Code

**New profile tab (e.g. "Audiências"):**
- Page: `src/app/parlamentares/[id]/audiencias/page.tsx` (copy `votacoes/page.tsx` — server fetch parlamentar, `generateMetadata`, render header + tab)
- Client component: `src/app/parlamentares/[id]/components/AudienciasTab.tsx` (`'use client'`, own fetch loop)
- API: `src/app/api/parlamentares/[id]/audiencias/route.ts` (`export const dynamic = 'force-dynamic'`, zod `querySchema`, delegate compute to `src/lib/`)
- Register tab in `secoes` + `coresSecao` of `src/app/parlamentares/[id]/components/ParlamentarHeader.tsx`
- Pure logic: `src/lib/<domain>.ts` + tests in `src/lib/__tests__/<domain>.test.ts`

**New API endpoint:**
- Location: `src/app/api/<resource>/route.ts` (or `[id]/route.ts` for detail)
- Pattern: zod schema at top → `safeParse` → Prisma query → `NextResponse.json`; reuse `parsePaginacao`/`calcularPaginacao` from `src/lib/parlamentar-query.ts` for paging
- Note: build `where` with typed objects (avoid `as any` — see `ARCHITECTURE.md` anti-patterns)

**New shared component:**
- Location: `src/components/<Name>.tsx` (page-specific) or `src/components/ui/<Name>.tsx` (generic primitive)
- Pattern: named export `export function Name(props: NameProps)`, `'use client'` only when it uses hooks/interaction, Tailwind classes merged with `cn()` from `@/lib/utils`

**New sync source or entity:**
- Adapter: `src/lib/sync/<source>-adapter.ts` returning `*Normalizado` types; register in `src/lib/sync/normalizer-factory.ts`
- Types: add/extend interfaces in `src/lib/sync/types.ts`
- Orchestration: extend `scripts/sync-camara.ts`/`sync-senado.ts` phase gating (`--apenas-*` flag + workflow input in `.github/workflows/sync-*.yml`)
- Schema: `prisma/schema.prisma` → `npx prisma migrate dev --name <desc>`

**Utilities:**
- Shared helpers: `src/lib/utils.ts` (`cn`, `formatDate`, `formatNumber`, `debounce`)
- Domain constants: alongside the domain module (e.g. `PESO_APRESENTACAO` in `src/lib/produtividade.ts`)

**Tests:**
- Unit: `src/lib/__tests__/<name>.test.ts` (Jest, `@/lib/...` imports)
- E2E: `e2e/<flow>.spec.ts` (Playwright, aria-label based selectors)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: Dependencies
- Generated: Yes
- Committed: No

**`prisma/dev.db`:**
- Purpose: Leftover local SQLite database from early development; schema provider is `postgresql`
- Generated: Yes
- Committed: Yes (should be candidates for cleanup — production uses `DATABASE_URL` Postgres)

**`coverage/`:**
- Purpose: Jest coverage reports (uploaded to Codecov in CI)
- Generated: Yes
- Committed: No

**`.planning/`:**
- Purpose: GSD planning state + codebase maps (this document lives in `.planning/codebase/`)
- Generated: Partly (by agent workflows)
- Committed: Yes

**`.vercel/`:**
- Purpose: Vercel link metadata
- Generated: Yes
- Committed: Yes

**`tsconfig.tsbuildinfo`:**
- Purpose: TypeScript incremental build cache
- Generated: Yes
- Committed: Yes (untracked-in-practice noise candidate)

---

*Structure analysis: 2026-10-09*
