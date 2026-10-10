Phase 04 — UI Aba "Gastos"

Discussion Log:
- Need to create aba "Gastos" no perfil do parlamentar
- ABA deve listar despesas do parlamentar com tabela paginada
- Filtros: por categoria, fornecedor, data, tipo de despesa
- Barras de resumo: total gasto, quantidade de despesas, média mensal
- Link para comprovantes (urlDocumento - embora Senado tenha gap)
- Integração com nova API /api/parlamentares/[id]/despesas (Phase 03)
- Loading e empty states explícitos
- Aba client component com useAbortController + fetch { cache: 'no-store' }
- Consistente com outras abas (Discursos, Votacoes, Proposicoes)

Key decisions:
- Usar same pattern das outras abas: DiscursosTab, VotacoesTab
- Tabela com columns: data, categoria, fornecedor, valor, urlDocumento
- Filtros no topo: período (select), categoria (select), busca livre
- Resumo embaixo da tabela: total, quantidade, média/mês
- Dark mode support (next-themes)
- Links para comprovantes abrem em nova aba
- Error state: "Não há dados oficiais para este período"
- Accessibility: aria-labels, focus management, keyboard navigation