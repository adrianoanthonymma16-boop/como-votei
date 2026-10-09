# Testing Patterns

**Analysis Date:** 2026-10-09

## Test Framework

**Runner:**
- Unit: **Jest 29** with **ts-jest** preset — config: `jest.config.js`
- E2E: **@playwright/test 1.44** — config: `playwright.config.ts`

**Assertion Library:**
- Jest built-ins (`expect().toBe/toEqual/toBeCloseTo/toBeNull`)
- Playwright's `expect` for E2E (`toBeVisible`, `toHaveClass`)

**Run Commands:**
```bash
npm run test              # Jest — all unit suites (8 suites, 93 tests, ~0.6s)
npm run test:watch        # Jest watch mode
npx jest --coverage       # Coverage (what CI runs; no npm script for this)
npm run test:e2e          # Playwright — starts `npm run dev` webServer locally
```

**Jest config (`jest.config.js`):**
```javascript
testEnvironment: 'node',
preset: 'ts-jest',
testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
collectCoverageFrom: ['src/lib/**/*.ts', '!src/lib/prisma.ts'],
transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
```
Note: `testEnvironment: 'node'` — **no DOM**, so React component tests would require config changes.

## Test File Organization

**Location:**
- Unit tests are **co-located with the code they test** in a sibling `__tests__/` folder: `src/lib/__tests__/*.test.ts` (only `src/lib/` has tests today)
- E2E specs live in top-level `e2e/*.spec.ts` (Playwright `testDir: './e2e'`)

**Naming:**
- `*.test.ts` for unit (matches `testMatch`), `*.spec.ts` for Playwright
- Test file name = source module name: `dashboard.test.ts` ↔ `src/lib/dashboard.ts`, `status-senado.test.ts` ↔ `mapStatusProposicaoSenado` in `src/lib/sync/senado-adapter.ts`

**Structure:**
```
src/lib/
├── dashboard.ts
├── __tests__/
│   ├── dashboard.test.ts        # matches ../dashboard
│   ├── status-senado.test.ts    # tests a function from ../sync/senado-adapter
│   └── ...
e2e/
└── votacoes-educacionais.spec.ts
```

## Test Structure

**Suite Organization:**
One `describe` per exported function, nested under a topic group when the module has related functions; `it()` (never `test()`) with a Portuguese behavior sentence:

```typescript
// src/lib/__tests__/dashboard.test.ts:10-18, 33-67
describe('mode', () => {
  it('retorna o valor mais frequente', () => {
    expect(mode(['SIM', 'NAO', 'SIM', 'ABSTENCAO', 'SIM'])).toBe('SIM');
  });
  it('retorna undefined para lista vazia', () => {
    expect(mode([])).toBe(undefined);
  });
});

describe('computeFrequencia', () => {
  it('calcula presença e taxas corretamente', () => { /* ... */ });
  it('retorna zero quando não há votos', () => { /* ... */ });
  it('não ultrapassa 100% quando há vários votos no mesmo dia', () => { /* ... */ });
});
```

**Patterns:**
- **Setup:** inline — fixtures are built inside each `it`, no `beforeEach` data factories
- **Teardown:** only for fake timers — `afterEach(() => jest.useRealTimers())` (`src/lib/__tests__/utils.test.ts:63-68`)
- **Assertion style:** one behavior per `it`; edge cases get their own `it` (empty input, zero division, out-of-range values); exact `toEqual` on result objects rather than field-by-field when practical
- Names encode the *rule being protected*, e.g. `'recalcula a taxa sobre o somatório (não herda média)'` (`src/lib/__tests__/frequencia.test.ts:18`) and `'não conta a mesma votação duas vezes'` (`src/lib/__tests__/dashboard.test.ts:146`)

## Mocking

**Framework:** None — **no `jest.mock` / `jest.spyOn` anywhere in the repo.**

**Patterns:**
```typescript
// The only "mock" is a bare jest.fn() for the debounce test
// src/lib/__tests__/utils.test.ts:70-79
const fn = jest.fn();
const debounced = debounce(fn, 300);
debounced('a'); debounced('b'); debounced('c');
jest.advanceTimersByTime(300);
expect(fn).toHaveBeenCalledTimes(1);
expect(fn).toHaveBeenCalledWith('c');
```

**Fake timers:**
```typescript
// src/lib/__tests__/utils.test.ts:63-68
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });
```

**What to Mock:** nothing today. The strategy is to design testable units instead: all tested code is pure and DB/HTTP-free.

**What NOT to Mock:**
- Do NOT mock Prisma or `fetch` in unit tests — the repo's convention is that functions taking Prisma results are **not tested**; instead, extract the computation into a pure function in `src/lib/` (like `computeAlinhamento`) and test that. Follow this when adding tests for API routes: extract the query-free logic first, then test the extraction.

## Fixtures and Factories

**Test Data:** built as inline literals inside each test, shaped exactly like the Prisma/API rows the function receives:

```typescript
// src/lib/__tests__/frequencia.test.ts:5-8
const total = somarFrequencias([
  { ano: 2024, totalSessoes: 100, presencas: 90, faltasJustificadas: 7, faltasInjustificadas: 3 },
  { ano: 2023, totalSessoes: 100, presencas: 80, faltasJustificadas: 10, faltasInjustificadas: 10 },
]);
```

```typescript
// src/lib/__tests__/dashboard.test.ts:35-40 — Date objects constructed explicitly (excerpt)
const votos = [
  { tipo: 'SIM', data: new Date(2024, 0, 10) },
  { tipo: 'AUSENTE', data: new Date(2024, 0, 12) },
];
```

**Location:** no shared fixtures/factories directory — fixtures are per-test-file.

**Provenance convention:** when a test encodes external-world mapping rules, the file documents where the samples came from: "Amostras reais de `statusProposicao.descricaoSituacao` da API da Câmara (100 proposições 2022/2024) + estados oficiais de /referencias/situacoesProposicao" (`src/lib/__tests__/status-proposicao.test.ts:3-6`). Do the same for any new Câmara/Senado mapping test.

## Coverage

**Requirements:** **no threshold enforced** (nothing in `jest.config.js`); coverage is informational via Codecov.

**Collection scope:** `src/lib/**/*.ts` only, excluding `src/lib/prisma.ts` — **API routes, components, and scripts are out of scope by config.**

**Current baseline (verified 2026-10-09):**
| Scope | Stmts | Branch | Lines |
|---|---|---|---|
| All collected files | 36.84% | 24.24% | 38.21% |
| `src/lib/` (core) | 91.93% | 85.21% | 94.63% |
| `src/lib/sync/` (adapters) | 10.15% | 10.30% | 10.11% |

Per-file highlights: `temas.ts` 100%, `dashboard.ts` 96.7%, `produtividade.ts` 97%, `parlamentar-query.ts` 94%; `parlamentar-anos.ts` and `normalizer-factory.ts` 0%; `senado-adapter.ts` 8.75%, `camara-adapter.ts` 12.5%, `http-client.ts` 11.4%.

**View Coverage:**
```bash
npx jest --coverage --coverageReporters=text        # terminal
npx jest --coverage --coverageReporters=json-summary # → coverage/coverage-summary.json (CI/Codecov)
```

## Test Types

**Unit Tests:**
- Scope: **pure functions in `src/lib/` only** — computation (`dashboard.ts`, `produtividade.ts`, `frequencia.ts`), query building (`parlamentar-query.ts`), formatting (`utils.ts`), classification (`temas.ts`), and the status-mapping functions exported by the sync adapters
- Approach: input → exact expected output; boundary/edge cases enumerated as separate `it`s; no DB, no HTTP, no timers (except the one debounce test)
- Suites: 8 files / 93 tests, all passing as of 2026-10-09

**Integration Tests:**
- **Not present.** API Route Handlers (`src/app/api/**/route.ts`), Prisma queries, and sync scripts have no automated tests.

**E2E Tests:**
- Framework: Playwright, **chromium only**, `fullyParallel`, `retries: 2` in CI, `workers: 1` in CI (`playwright.config.ts:5-9`)
- Local run starts the dev server automatically (`webServer: npm run dev`, `reuseExistingServer: true`); CI runs against production: `PLAYWRIGHT_BASE_URL: https://como-votei.vercel.app` (`.github/workflows/ci.yml:66-69`)
- One spec, 6 tests: `e2e/votacoes-educacionais.spec.ts` (accordion expansion, manifesto toggle, produtividade accordion, presence card, vote badges, dashboard filter chips)

**Component Tests:**
- **Not used** — React Testing Library is not installed; `testEnvironment: 'node'` means component tests would not run as-is.

## Common Patterns

**Async Testing (E2E):**
```typescript
// e2e/votacoes-educacionais.spec.ts:6-22
await page.goto('/parlamentares/cmtjl8hum002nwod5zhw6h2ny/votacoes');
await page.waitForSelector('ol[aria-label="Votações do parlamentar"]');
const itens = page.locator('ol[aria-label="Votações do parlamentar"] > li');
await expect(itens.first()).toBeVisible();
const primeiroAccordion = itens.first().locator('button[aria-expanded]');
await primeiroAccordion.click();
await expect(itens.first().locator('[id^="votacao-"]')).toBeVisible();
```

**Locator rules established in this repo (follow them):**
- Prefer `aria-label` and ARIA roles over CSS/text: `page.getByRole('heading', { name: 'Alinhamento Partidário' })` (`e2e/votacoes-educacionais.spec.ts:139`)
- Append `.first()` when a text selector matches multiple nodes — Playwright strict mode fails otherwise (commented at `e2e/votacoes-educacionais.spec.ts:81-83,137-138`)
- Generous timeouts for data-dependent UI: `toBeVisible({ timeout: 15000 })` (`e2e/votacoes-educacionais.spec.ts:101`)

**Error Testing:**
```typescript
// src/lib/__tests__/parlamentar-query.test.ts:65-75 — invalid input returns null, not throw
it('rejeita página menor que 1', () => {
  expect(parsePaginacao('0', '20')).toBeNull();
});
it('rejeita valores não numéricos', () => {
  expect(parsePaginacao('abc', '20')).toBeNull();
});
```

**Float/Rounding Testing:**
```typescript
// src/lib/__tests__/frequencia.test.ts:38-43
expect(total?.taxaPresenca).toBeCloseTo(66.7, 1);
```

**Mapping-table Testing (adapters):**
```typescript
// src/lib/__tests__/status-senado.test.ts:4-8 — one `it` per source state family
it('norma jurídica / sanção / promulgação → SANCIONADA', () => {
  expect(mapStatusProposicaoSenado('TRANSFORMADA EM NORMA JURÍDICA', 'Não')).toBe('SANCIONADA');
  expect(mapStatusProposicaoSenado('AGUARDANDO SANÇÃO', 'Sim')).toBe('SANCIONADA');
});
```

## CI Integration

`.github/workflows/ci.yml` runs two jobs on push/PR to `master`/`main`:

1. **`qualidade`** (lint, tipos e testes): `npm ci` → `npx prisma generate` → **`npx tsc --noEmit`** → `npm run lint` → **`npx jest --coverage`** → Codecov upload (`codecov-action@v5`, `fail_ci_if_error: false`)
2. **`e2e`**: `npm ci` → `npx playwright install --with-deps chromium` → `npx playwright test` against the production URL

A failing unit suite or type error blocks the merge; coverage upload failures do not.

---

*Testing analysis: 2026-10-09*
