Phase 03 — Research: API de Despesas

Existing route patterns researched:

1. /api/parlamentares/route.ts (list endpoint):
   - zod querySchema with page, perPage params
   - validate with safeParse → 400 on failure
   - Prisma where clause with buildParlamentarWhere
   - Pagination: .skip((page-1)*perPage).take(perPage)
   - Response: { data: T[], meta: { page, perPage, total} }
   - export const dynamic = 'force-dynamic'
   - Not-found → 404 { error: '... não encontrado' }

2. /api/parlamentares/[id]/dashboard/route.ts (profile dashboard):
   - ANOS_GLOBAL module-scope cache via top-level await
   - raw SQL with $queryRawUnsafe for date extraction
   - Missing data → return zeros + semDadosOficiais flag
   - Error: notFound() or redirect()

3. /api/votacoes/[id]/votos/route.ts (votos lookup):
   - Entity lookup → 404 { error: '... não encontrado' }
   - AbortController + res.ok check
   - Error body: { error: string, details?: ... }

4. /api/cron/sync-incremental/route.ts (cron):
   - Auth: Authorization: Bearer ${CRON_SECRET}
   - Dispatch GitHub Actions for sync
   - Per-workflow status strings, never fails whole run

Patterns to replicate for /api/parlamentares/[id]/despesas:
- zod querySchema for { pagina, itensPorPagina }
- zod path param validation for parlamentar ID
- Prisma Despesa.findMany with where { parlamentarId }
- Pagination: skip/take
- Response envelope: { data: Despesa[], meta: {...} }
- 404 if parlamentar not found
- 400 if query params invalid
- force-dynamic + cache: 'no-store' on client fetches