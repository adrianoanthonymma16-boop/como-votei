# Coding Conventions

**Analysis Date:** 2026-10-09

## Naming Patterns

**Files:**
- React components: **PascalCase `.tsx`** — `src/components/ParlamentarCard.tsx`, `src/components/ui/Button.tsx`, `src/app/parlamentares/[id]/components/DashboardTab.tsx`
- Domain/logic modules: **kebab-case or single-word `.ts`** — `src/lib/parlamentar-query.ts`, `src/lib/sync/http-client.ts`, `src/lib/sync/camara-adapter.ts`, `src/lib/dashboard.ts`
- Next.js App Router files use framework names: `page.tsx`, `layout.tsx`, `route.ts` (API)
- CLI scripts: **kebab-case** — `scripts/sync-camara.ts`, `scripts/backfill-status-proposicoes.ts`
- Unit tests: **`src/lib/__tests__/<module>.test.ts`** (module name matches the source file: `dashboard.test.ts` → `src/lib/dashboard.ts`)
- E2E tests: **`e2e/<feature>.spec.ts`** — `e2e/votacoes-educacionais.spec.ts`

**Functions:**
- `camelCase` throughout. Domain logic uses **Portuguese verb phrases** matching the domain: `calcularPaginacao`, `buildParlamentarWhere`, `somarFrequencias`, `classificarTemas`, `extrairTemaPrincipal`, `descreverTipoProposicao` (`src/lib/temas.ts`, `src/lib/parlamentar-query.ts`, `src/lib/frequencia.ts`)
- Generic computation helpers may use English: `computeFrequencia`, `computeAlinhamento`, `computeAtividadeMensal`, `mode` (`src/lib/dashboard.ts:55-196`)
- **Rule:** match the language of the file you are editing — Portuguese for domain/pure business functions, English acceptable for generic compute helpers. Never mix both styles inside one file.

**Variables:**
- `camelCase` for locals and state: `votosRaw`, `anosAtividade`, `frequenciaOficial`, `pontuacaoById`
- **SCREAMING_SNAKE_CASE** for module-level constants and configuration: `DEFAULT_PER_PAGE`, `MAX_PER_PAGE` (`src/lib/parlamentar-query.ts:19-20`), `TIPOS_PRESENCA`, `TIPO_AUSENTE` (`src/lib/dashboard.ts:1-3`), `REGRAS` (`src/lib/temas.ts:23`), `CHAVES_FILTRO` (`src/app/parlamentares/ParlamentaresPageClient.tsx:41`)
- Literal unions use `as const` tuples, not enums: `TIPOS_PRESENCA = ['SIM', 'NAO', ...] as const` (`src/lib/dashboard.ts:1`)
- Boolean state reads as flag: `hasOnly`, `temDados`, `semDadosOficiais`, `isLoading`

**Types:**
- `interface` for object shapes, `type` for primitives/unions — `export type TipoVotoString = string` (`src/lib/dashboard.ts:5`), `export type GrupoTipoProposicao = ...` (`src/lib/produtividade.ts:17`)
- Result interfaces are suffixed `Result`/`Total`/`Agregado`: `FrequenciaResult`, `AlinhamentoResult`, `FrequenciaTotal`, `TemaAgregado` (`src/lib/dashboard.ts:24-53`, `src/lib/frequencia.ts:12`)
- Filter/query inputs suffixed `Filtros`: `ParlamentarFiltros` (`src/lib/parlamentar-query.ts:3`)
- Prisma entity types are imported from `@prisma/client` and extended inline with `&` when the API response adds fields: `ParlamentarCompleto = import('@prisma/client').Parlamentar & {...}` (`src/app/parlamentares/ParlamentaresPageClient.tsx:15-20`)

**Components:**
- **Named function declarations**, never default exports: `export function ParlamentaresPageClient() {...}` (`src/app/parlamentares/ParlamentaresPageClient.tsx:43`)
- `forwardRef` + explicit `displayName` for primitive UI components: `Button.displayName = 'Button'` (`src/components/ui/Button.tsx:44`)
- Page-level components named after the route: `VotacoesPageClient.tsx` sits beside `page.tsx` in the same segment

## Code Style

**Formatting:**
- Prettier is installed (`prettier@^3.2.0` + `prettier-plugin-tailwindcss@^0.5.0` in `package.json:45-46`) but **there is no Prettier config file, no `format` script, and no Prettier CI step** — formatting is convention-only
- Observed de-facto style: 2-space indent, single quotes, semicolons, trailing commas, 100+ char lines in dense logic, blank line between logical blocks
- Tailwind classes written inline and (mostly) sorted by utility grouping; the tailwindcss Prettier plugin would enforce ordering if configured

**Linting:**
- Tool: `next lint` with **only** `next/core-web-vitals` (`.eslintrc.json` is 3 lines)
- Run: `npm run lint` → `next lint`
- `eslint-disable` is rare — one occurrence: `// eslint-disable-next-line react-hooks/exhaustive-deps` (`src/app/parlamentares/ParlamentaresPageClient.tsx:139`), always with the specific rule named on the line above the hook dep array

**TypeScript:**
- `strict: true` in `tsconfig.json:6`; `noEmit`, `moduleResolution: "bundler"`, `target: ES2017`
- Path alias: **`@/*` → `./src/*`** (`tsconfig.json:21-23`) — this is the only alias
- Type-check gate: `npx tsc --noEmit` runs in CI before lint (`.github/workflows/ci.yml:32-36`)
- `as any` appears 14 times, mostly on Prisma `groupBy`/`$queryRawUnsafe` results in `src/app/api/parlamentares/route.ts:121-129` — acceptable only at the Prisma boundary, avoid elsewhere

## Import Organization

**Order (observed consistently in `src/app/**/route.ts` and `src/lib/**`):**
1. Framework/external packages: `next/server`, `react`, `zod`, `@prisma/client`
2. Internal aliased modules: `@/lib/...`, `@/components/...`
3. Relative siblings only when inside the same tree

```typescript
// src/app/api/parlamentares/[id]/dashboard/route.ts:1-10
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { computeAlinhamento, ..., type AlinhamentoResult } from '@/lib/dashboard';
import { anosComDados } from '@/lib/parlamentar-anos';
```

**Rules:**
- Prefer the `@/` alias in app code and tests: `import { calcularPontuacao } from '@/lib/produtividade'` (`src/lib/__tests__/produtividade.test.ts:1-14`). Relative `../` appears in a few older tests (`src/lib/__tests__/frequencia.test.ts:1`, `status-proposicao.test.ts:1`) — **new tests should use `@/lib/<module>`**
- CLI scripts use relative paths into `src/`: `import { NormalizerFactory } from '../src/lib/sync/normalizer-factory'` (`scripts/sync-camara.ts:7`)
- Inline type imports: `import { type ClassValue, clsx } from 'clsx'` (`src/lib/utils.ts:2`)
- Client components start with the directive on line 1: `'use client';` (29 files under `src/`)

## Error Handling

**API routes (Next.js Route Handlers):**
- Validate query strings with Zod `safeParse` → **400** with flattened details:
  ```typescript
  // src/app/api/parlamentares/route.ts:32-39
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  ```
- Not-found lookups → **404** `{ error: '<recurso> não encontrado' }` (`src/app/api/parlamentares/[id]/dashboard/route.ts:76-81`, `src/app/api/votacoes/[id]/votos/route.ts:37`)
- Cron secret check → **401** `{ error: 'Não autorizado' }` (`src/app/api/cron/sync-incremental/route.ts:9`)
- Error body shape is always `{ error: string, details?: ... }`; success bodies are either `{ data: T, ...pagination }` (list endpoints) or a plain object (dashboard-style)
- **Routes do NOT wrap Prisma calls in try/catch** — only validation and null checks are handled; unexpected DB errors bubble to Next.js. Keep new routes consistent with this (fail loudly) unless adding a shared error boundary
- Missing/official-data semantics: return zeros plus an explicit flag instead of estimating — see the `semDadosOficiais` pattern (`src/app/api/parlamentares/[id]/dashboard/route.ts:156-177`)

**Client components:**
- Fetch with `AbortController` + `res.ok` check + `AbortError` filter:
  ```typescript
  // src/app/parlamentares/ParlamentaresPageClient.tsx:85-113
  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok) throw new Error('Falha ao carregar parlamentares');
  ...
  } catch (err) {
    if ((err as Error).name !== 'AbortError') console.error(err);
  } finally {
    if (!controller.signal.aborted) setIsLoading(false);
  }
  ```
- Tab components keep an `error: string | null` state and render a destructive-styled block: `setError(err instanceof Error ? err.message : 'Erro desconhecido')` (`src/app/parlamentares/[id]/components/DiscursosTab.tsx:36-60,129-132`)
- Loading and empty states are explicit: `{isLoading && ...}` / `{items.length === 0 && !isLoading && <empty>}` (`DiscursosTab.tsx:148-232`)

**Sync scripts (`scripts/*.ts`):**
- One top-level `try/catch` around the whole run, emoji banner logs, per-step `console.log` progress (`scripts/sync-camara.ts:38-54`)
- HTTP layer handles resilience: rate-limit queue, `429` + `Retry-After`, exponential backoff, `AbortController` timeout, 3 retries — `src/lib/sync/http-client.ts:87-143`

**Library functions:**
- Prefer `null`/zero returns over throwing for invalid/missing input: `parsePaginacao(...) → null` (`src/lib/parlamentar-query.ts:57`), `somarFrequencias([]) → null` (`src/lib/frequencia.ts:39`), `mode([]) → undefined` (`src/lib/dashboard.ts:55`)

## Logging

**Framework:** `console.*` — 89 call sites in `src/` + `scripts/`. `pino` and `pino-pretty` are declared in `package.json:27-28` but **never imported anywhere** (dead dependency).

**Patterns:**
- Sync scripts: `console.log` with emoji section headers (`🏛️`, `📋`, `⏰`) and `console.warn`/`console.error` for failures (`scripts/sync-camara.ts:42-44`)
- HTTP client: `console.warn` prefixed `[HTTP]` for rate limits and retries (`src/lib/sync/http-client.ts:116,135`)
- Client code: `console.error(err)` only inside catch blocks after AbortError filtering
- API route handlers: no logging at all — rely on Vercel request logs (see `README.md` "Monitoramento")

## Comments

**When to Comment:**
- Module-level block comment stating purpose + usage on every non-trivial file: `src/lib/temas.ts:1-6`, `src/lib/sync/http-client.ts:1-4`, `scripts/sync-camara.ts:1-7` (includes how to run it and required env vars)
- Inline `//` for **business-rule rationale**, not narration — e.g. why the default year is not the current empty year (`src/app/api/parlamentares/[id]/dashboard/route.ts:83-87`), why sorting is in-memory (`src/app/api/parlamentares/route.ts:59-61`), why `.first()` is needed in Playwright (`e2e/votacoes-educacionais.spec.ts:81-83`)
- Test names/comments cite the authoritative source of fixtures: "Amostras reais de ... da API da Câmara" (`src/lib/__tests__/status-proposicao.test.ts:3-6`)

**JSDoc/TSDoc:**
- `/** ... */` above exported functions with a one/two-line description in Portuguese; `@param`/`@returns` tags are **not** used — signature types carry that info (`src/lib/temas.ts:263-266,305-311`)
- `/** Palavras-chave ... */` doc comments on interface fields where semantics matter (`src/lib/temas.ts:15-20`)

## Function Design

**Size:** Small and single-purpose. Even dense route handlers are broken into named steps with comments; computation lives outside the route in `src/lib/`.

**Parameters:**
- Pure functions take **plain data** (arrays/objects), never Prisma clients or `Request` — `computeAlinhamento(meusVotos, votosPartido, parlamentarId)` (`src/lib/dashboard.ts:110`)
- Parser/validators accept `unknown` and narrow: `parsePaginacao(rawPage: unknown, rawPerPage: unknown)` (`src/lib/parlamentar-query.ts:57`)
- Options objects for multi-flag operations: `SyncOptions { ano?, apenasParlamentares?, ... }` (`scripts/sync-camara.ts:10-18`)

**Return Values:**
- Always explicitly typed; return rich result objects rather than tuples
- Percentages/rates pre-rounded to 1 decimal: `taxaPresenca` (`src/lib/frequencia.ts`), `confianca` rounded to 2 (`src/lib/temas.ts:293`)
- Optional fields for "unknown" values: `rankingPartido?: number` (`src/lib/dashboard.ts:36`)

## Module Design

**Exports:**
- **Named exports only** (exception: `src/lib/prisma.ts` exports both `export const prisma` and `export default prisma`)
- Barrel/index files: **none** — import directly from the module path (`@/lib/dashboard`, not `@/lib`)
- Constants exported from the module that owns them: `DEFAULT_PER_PAGE` lives in `src/lib/parlamentar-query.ts:19` next to the pagination logic

**Layering:**
- `src/lib/` (pure/domain) ← `src/app/api/**/route.ts` (query + validate) ← `src/app/**/page.tsx` / client components (fetch + render)
- Adapters in `src/lib/sync/` normalize Câmara/Senado payloads into the shared model; export pure mapping functions (`mapStatusProposicao`, `mapStatusProposicaoSenado`) so they can be unit-tested without HTTP (`src/lib/sync/camara-adapter.ts`, `src/lib/sync/senado-adapter.ts`)
- UI primitives in `src/components/ui/` are presentation-only: variant maps + `cn()` class merge, no data fetching (`src/components/ui/Button.tsx:14-34`)

**Styling convention:**
- Compose classes with `cn(...)` from `src/lib/utils.ts:5` (clsx + tailwind-merge) — required for `className` overrides to win
- Variants are plain object maps inside the component (`variants`, `sizes`) — follow this for any new UI primitive

---

*Convention analysis: 2026-10-09*
