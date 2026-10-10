Phase 04 — Research: UI Aba "Gastos"

Existing tab patterns researched:

1. DiscursosTab (src/app/parlamentares/[id]/components/DiscursosTab.tsx):
   - useAbortController + fetch(..., { signal, cache: 'no-store' })
   - try/catch with setError(err instanceof Error ? err.message : 'Erro desconhecido')
   - Skeleton loading while data fetches
   - Error render: destructive-styled block with details
   - Empty state: {isLoading && ...} / {items.length === 0 && !isLoading && <empty>}
   - Loading render: full-width skeleton
   - Coordinates: line 36-60 (error state), line 129-132 (error filtering)
   - Coordinates: line 148-232 (empty state)

2. VotacoesTab (src/app/parlamentares/[id]/components/VotacoesTab.tsx):
   - Same pattern: fetch + AbortController + cache: 'no-store'
   - Loading/skeleton/empty/error states

3. ProposicoesTab (src/app/parlamentares/[id]/components/ProposicoesTab.tsx):
   - Same fetch pattern

4. ParlamentaresPageClient (client-side filtering/pagination):
   - useState for filtros: search, casa, partidoId, ufId
   - useEffect para refetch quando filtros mudam
   - PaginacaoNumerica component for page navigation

Patterns to replicate for GastosTab:
- Same fetch pattern with AbortController
- Table with columns: data, categoria, fornecedor, valor, actions (link)
- Filtros: período (select com ANOS_JANELA), categoria (select), busca livre
- Resumo: total, quantidade, média/mês
- Empty: "Não há despesas oficiais"
- Error: "Erro ao carregar despesas"
- Use cn() from '@/lib/utils' for class merging
- Use formatBRL or Intl for valor formatting
- Dark mode via next-themes
- Accessibility: aria-rowindex, aria-colindex

Senado gap de urlDocumento:
- Research: Senado despesas often have urlDocumento = undefined
- Decision: mostrar "Ver comprovante" link mesmo assim, mas desabilitado ou com tooltip
- Alternativa: mostrar ícone de "sem comprovante" ao lado do link