Phase 03 — API de Despesas por Parlamentar

Plan ID: 03-01
Objective: Create GET /api/parlamentares/[id]/despesas route with pagination

Tasks:
  [T-03-01] Implement route handler at src/app/api/parlamentares/[id]/despesas/route.ts
    • zod querySchema for { pagina, itensPorPagina }
    • zod path param validation for parlamentar ID
    • Prisma Despesa.findMany with where { parlamentarId }
    • Pagination: skip/take + total count
    • Response envelope: { data: Despesa[], meta: { pagina, totalPaginas, totalItens} }
    • 404 if parlamentar not found
    • 400 on invalid query params
    • export const dynamic = 'force-dynamic'
  [T-03-02] Write unit tests in src/lib/__tests__/despesas-api.test.ts
    • valid parlamentar with despesas
    • invalid parlamentar → 404
    • invalid query params → 400
    • empty results → empty data array + meta
  [T-03-03] Verify gates: tsc --noEmit && next lint && jest && next build
    • All checks green before commit

Definition of Done:
  - Route implemented following existing API patterns
  - Unit tests pass (new + existing)
  - All gates: typecheck, lint, test, build green
  - VERIFICATION.md generated
  - REVIEW.md 12/12 requisitos

Dependencies:
  - Phase 02 completed (ingestão e sincronização)
  - Despesa Prisma model exists (prisma/schema.prisma)
  - Helper functions in src/lib/despesas.ts, src/lib/parlamentar-query.ts

Risk: Low — follows identical pattern to 5 existing API routes in codebase