Phase 04 — Validation Criteria

Must pass:
- [ ] npx tsc --noEmit — TypeScript type-check green
- [ ] npx next lint — no ESLint warnings or errors
- [ ] npx next build — Next.js build succeeds
- [ ] GastosTab renders without errors
- [ ] Table loads despesas from /api/parlamentares/[id]/despesas
- [ ] Filtros funcionam: período, categoria, busca livre
- [ ] Resumo calculates total, quantidade, média/mês corretamente
- [ ] Empty state renders when no despesas for selected period
- [ ] Error state renders on fetch failure
- [ ] Link para comprovante abre em nova aba (ou tooltip se urlDocumento undefined)
- [ ] Dark mode support (cores adaptativas)
- [ ] Accessibility: aria-labels na tabela, role adequado, focus management
- [ ] Route params typed: params.id is string (Promise<{ id: string }>)

Success = all gates green + VERIFICATION.md generated + REVIEW.md 12/12 requisitos