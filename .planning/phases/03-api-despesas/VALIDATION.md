Phase 03 — Validation Criteria

Must pass:
- [ ] npx tsc --noEmit — TypeScript type-check green
- [ ] npx next lint — no ESLint warnings or errors
- [ ] npx jest — all unit tests pass (210+ specs)
- [ ] npx next build — Next.js build succeeds
- [ ] Route returns 200 with paginated despesas for valid parlamentar ID
- [ ] Route returns 404 { error: 'parlamentar não encontrado' } for invalid ID
- [ ] Route returns 400 { error, details } on invalid query params (zod safeParse failure)
- [ ] Route declares export const dynamic = 'force-dynamic'
- [ ] Response envelope matches pattern: { data: T[], meta: { pagina, totalPaginas, totalItens} }
- [ ] Route validates parlamentar exists before querying despesas
- [ ] Uses @/lib/prisma singleton
- [ ] Uses zod for query param validation
- [ ] No try/catch wrapping Prisma calls (bubbles loudly per codebase convention)
- [ ] Unit test covers: valid parlamentar, invalid parlamentar, invalid query params, empty results

Success = all gates green + VERIFICATION.md generated + REVIEW.md 12/12 requisitos