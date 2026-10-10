Phase 04 — API de Despesas por Parlamentar

Plan ID: 04-01
Objective: Create GastosTab component showing expense table for parlamentar

Tasks:
  [T-04-01] Implement GastosTab component at src/app/parlamentares/[id]/components/GastoTab.tsx
    • Use client component pattern ('use client' on line 1)
    • Fetch from /api/parlamentares/[id]/despesas (Phase 03 route)
    • AbortController + cache: 'no-store'
    • Loading, error, empty states
    • Table with columns: data, categoria, fornecedor, valor, ver comprovante
    • Filtros: período (select ANOS_JANELA), categoria (select), busca livre
    • Resumo: total gasto, quantidade, média/mês
    • Link para comprovante: abre em nova aba, tooltip se urlDocumento undefined
    • Accessibility: aria-labels, role table, focus management
    • Dark mode support
  [T-04-02] Register GastoTab no profile page src/app/parlamentares/[id]/page.tsx
    • Add tab to abas array/componente de tabs
    • Pass parlamentarId and casa props
  [T-04-03] Verify gates: tsc --noEmit && next lint && next build
    • All checks green before commit

Definition of Done:
  - GastosTab component implemented and registered
  - Component renders despesas from API
  - Filtros funcionam corretamente
  - Resumo calculates total/quantidade/média
  - Empty/error states render properly
  - All gates: typecheck, lint, build green
  - VERIFICATION.md generated
  - REVIEW.md 12/12 requisitos

Dependencies:
  - Phase 03 completed (API route /api/parlamentares/[id]/despesas)
  - ANOS_JANELA from src/lib/despesas.ts
  - cn() from '@/lib/utils'
  - formatNumber/formatDateBR from '@/lib/utils'
  - next-themes for dark mode

Risk: Medium — new UI component, needs design consistency with 4 existing tabs