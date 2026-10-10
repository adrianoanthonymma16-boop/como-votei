Phase 03 — API de Despesas

Discussion Log:
- Need to create API route /api/parlamentares/[id]/despesas
- Must follow existing patterns from other despesa routes (zod validation, prisma queries, compute metrics)
- Envelope must use same pagination structure as other list endpoints
- Route should declare `export const dynamic = 'force-dynamic'`
- Must integrate with existing Despesa Prisma model
- Error handling: zod safeParse → 400, not-found → 404
- No auth required (public product per CONTEXT.md)
- Query params: paginação (página, itensPorPagina), filtros por parlamentar

Key decisions:
- Use same zod querySchema pattern as /api/parlamentares/route.ts
- Reuse compute helpers from src/lib/ ( frequencia, dashboard, temas )
- Return { data: Despesa[], meta: { pagina, totalPaginas, totalItens } } format
- Validate parlamentarId exists in DB (404 if not found)