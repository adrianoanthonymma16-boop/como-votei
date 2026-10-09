# Technology Stack

**Analysis Date:** 2026-10-09

## Languages

**Primary:**
- TypeScript ~5.4 - All application code: `src/app/**`, `src/components/**`, `src/lib/**`, `scripts/*.ts`, `prisma/seed.ts`, `e2e/*.spec.ts`
- TSX (React) - Pages and components under `src/app/**/page.tsx` and `src/app/parlamentares/[id]/components/*.tsx`

**Secondary:**
- SQL - Prisma migrations in `prisma/migrations/*/migration.sql`; raw SQL embedded in `src/lib/parlamentar-anos.ts`, `src/app/api/stats/visao-geral/route.ts`, `src/app/api/parlamentares/[id]/dashboard/route.ts` (via `prisma.$queryRawUnsafe` with `$1` placeholders)
- YAML - GitHub Actions workflows in `.github/workflows/{ci,sync-camara,sync-senado}.yml`, Vercel config `vercel.json`
- JavaScript - Config files only: `next.config.js`, `jest.config.js`, `tailwind.config.js`, `postcss.config.js`

## Runtime

**Environment:**
- Node.js 20 (CI pins `node-version: 20` in `.github/workflows/ci.yml` and sync workflows; `README.md` requires 20+)
- Deployment runtime: Vercel Serverless Functions, region `gru1` (São Paulo) — `vercel.json:7`
- Edge/middleware: Not used

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)
- CI install command: `npm ci` (all three workflows)

## Frameworks

**Core:**
- Next.js `14.2.0` (App Router) - `package.json:25`; all routes live in `src/app/` (pages + Route Handlers under `src/app/api/**/route.ts`)
- React `^18.3.0` / React DOM `^18.3.0` - UI rendering
- Prisma `^5.12.0` (`prisma` CLI + `@prisma/client`) - ORM / query layer; schema at `prisma/schema.prisma`
- Tailwind CSS `^3.4.0` - Styling; config in `tailwind.config.js` (`darkMode: 'class'`, custom `primary`/`secondary` palettes, `--font-atkinson` sans stack)

**Testing:**
- Jest `^29.7.0` + `ts-jest` `^29.1.0` - Unit tests; config `jest.config.js` (`testEnvironment: 'node'`, preset `ts-jest`, alias `@/` → `src/`)
- Playwright `@playwright/test` `^1.44.0` - E2E; config `playwright.config.ts` (`testDir: ./e2e`, chromium only, auto-starts `npm run dev` outside CI)

**Build/Dev:**
- `next dev` / `next build` / `next start` — `package.json:6-8`
- Build pipeline: `prisma generate && (prisma migrate deploy || true) && next build` — `package.json:7` (migrations applied at build time, failure tolerated)
- ESLint `^8.57.0` + `eslint-config-next` `14.2.0` — `.eslintrc.json` extends only `next/core-web-vitals`
- Prettier `^3.2.0` + `prettier-plugin-tailwindcss` `^0.5.0` — **no `.prettierrc` / `prettier.config.*` file exists**; defaults + plugin are used
- `ts-node` `^10.9.2` — runs sync scripts with `--compiler-options '{"module":"CommonJS"}'` (see `package.json:13-16`)

## Key Dependencies

**Critical:**
- `zod` `^3.23.0` - Query-param validation in every read API route (e.g. `src/app/api/parlamentares/route.ts:13-27` uses `z.object(...).safeParse` → 400 on failure)
- `@prisma/client` `^5.12.0` - Single data access layer; singleton at `src/lib/prisma.ts`
- `next` `14.2.0` - Server Components + Route Handlers in one app; `next/font/google` loads Atkinson Hyperlegible in `src/app/layout.tsx:8-12`
- `next-themes` `^0.4.6` - Dark mode; `src/components/ThemeProvider.tsx`, `src/components/ThemeToggle.tsx`

**UI utilities:**
- `clsx` `^2.1.0` + `tailwind-merge` `^2.2.0` - Combined in `cn()` at `src/lib/utils.ts:3-5`; **use this helper for conditional classes**, do not hand-roll template strings
- `date-fns` `^3.6.0` - Declared in `package.json:24` but **not imported anywhere** in `src/`, `scripts/`, `e2e/` (formatting uses `Intl`/`toLocaleDateString` in `src/lib/utils.ts`)

**Declared but unused (dead weight):**
- `pino` `^9.0.0`, `pino-pretty` `^11.0.0` - No imports found anywhere in the repo; logging is plain `console.*`

**Infrastructure:**
- `ts-node` - Executes the sync CLI scripts under `scripts/`

## Configuration

**Environment:**
- `.env` present locally (git-ignored, `.gitignore:29-33`) — **contents never read**
- `.env.example` documents the variable contract:
  - `DATABASE_URL` (PostgreSQL — Neon/Vercel Postgres)
  - `CRON_SECRET` (protects `/api/cron/*`)
  - `NEXT_PUBLIC_APP_URL` (canonical URL / `metadataBase`)
  - `CAMARA_API_BASE`, `SENADO_API_BASE` (public API bases, not secrets)
  - `GITHUB_TOKEN`, `GITHUB_REPOSITORY` (Vercel Cron → GitHub Actions dispatch)
- Runtime reads: `src/lib/prisma.ts:10` (`NODE_ENV` for Prisma log level), `src/app/api/cron/sync-incremental/route.ts:3,23-24`, `src/lib/sync/camara-adapter.ts:23`, `src/app/layout.tsx:15`
- GitHub Actions additionally uses repository secrets/vars: `secrets.DATABASE_URL`, `secrets.CODECOV_TOKEN`, `vars.CAMARA_API_BASE`

**Build:**
- `next.config.js` — `reactStrictMode`, `serverActions.bodySizeLimit: '2mb'`, `images.remotePatterns` for `**.camara.leg.br` and `**.senado.leg.br`, CORS headers on `/api/:path*`
- `vercel.json` — `buildCommand`/`devCommand`/`installCommand`, region `gru1`, `maxDuration: 30` on `src/app/api/cron/sync-incremental/route.ts`, Vercel Cron `0 3 * * *`, API CORS headers
- `tsconfig.json` — `strict: true`, `target: ES2017`, `moduleResolution: bundler`, path alias `@/*` → `./src/*`, `resolveJsonModule: true` (enables `src/lib/temas-keywords.json`)
- `postcss.config.js` — `tailwindcss` + `autoprefixer`
- `jest.config.js`, `playwright.config.ts`, `tailwind.config.js`, `.eslintrc.json` — see Frameworks above

## Platform Requirements

**Development:**
- Node.js 20+, npm
- PostgreSQL instance (local or Neon) — `DATABASE_URL`
- `npx prisma generate` before type-checking or running scripts (required by CI too: `.github/workflows/ci.yml`)
- Optional: GitHub repo + Actions secrets for sync jobs; `.env` for local dev

**Production:**
- Vercel (free tier) — deploy target, `https://como-votei.vercel.app`
- Neon / Vercel Postgres (free tier) — the sync workflows append `&connect_timeout=30&pool_timeout=60` to `DATABASE_URL` to survive Neon cold starts (`P1002`), `.github/workflows/sync-camara.yml:45`
- GitHub Actions — daily data sync (Câmara 03:00 UTC, Senado 04:00 UTC), `timeout-minutes: 360` on Câmara job
- Static artifact: `prisma/dev.db` (4.8 MB SQLite file) exists in the repo tree despite `schema.prisma` declaring `provider = "postgresql"` — legacy local DB, not used by the Postgres pipeline

---

*Stack analysis: 2026-10-09*
