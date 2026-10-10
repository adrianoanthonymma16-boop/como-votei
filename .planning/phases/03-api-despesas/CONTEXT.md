Phase 03 — API de Despesas por Parlamentar

Context:
- Route: GET /api/parlamentares/[id]/despesas
- Purpose: List all despesas (expenses) for a specific parlamentar (MP/Deputado/Senador)
- Input: parlamentar ID (path parameter), query params: página (default 1), itensPorPagina (default 20, max 50)
- Output: Paginated list of despesas with metadata
- Data source: Prisma Despesa model filtered by parlamentarId = path param
- Must follow existing API patterns in src/app/api/**/route.ts
- No authentication (public product)
- Must return 404 if parlamentar not found
- Must validate query params with Zod
- Must use same pagination envelope as other routes

Key dependencies:
- @/lib/prisma - Prisma client singleton
- @/lib/parlamentar-query - pagination where builder
- @/lib/despesas - parseBRL, parseDataFonte helpers
- @/components/ui - UI primitives for rendering
- zod - query validation