Phase 04 — UI Aba "Gastos" - Context

Route: GET /app/parlamentares/[id]/gastos (client component)
Purpose: Display expense (despesa) table for a specific parlamentar

Data fetching:
- Fetch from /api/parlamentares/[id]/despesas (Phase 03 route)
- Query params: página (padrão 1), itensPorPagina (padrão 20), filtros opcionais
- Use AbortController + cache: 'no-store'
- Loading state while fetching
- Error state on fetch failure

Table columns:
- Data da despesa (formato pt-BR)
- Categoria (label livre da fonte)
- Fornecedor
- Valor (formatado em BRL)
- Ação: link para urlDocumento (abrir em nova aba) — NOTE: Senado tem gap de urlDocumento

Filtros no topo:
- Período: select com anos da janela ANOS_JANELA (3 anos) + "Todos"
- Categoria: select com categorias únicas + "Todos"
- Busca livre: input de texto

Resumo embaixo da tabela:
- Total gasto (somar valores)
- Quantidade de despesas
- Média mensal (total / meses com dados)

Empty state:
- "Não há despesas oficiais para este parlamentar neste período"
- Illustration or placeholder

Error state:
- "Erro ao carregar despesas. Tente novamente mais tarde."
- Botão "Tentar novamente"

Accessibility:
- aria-label na tabela
- role="table" com headers adequados
- focus management no botão de fechar error state
- keyboard navigation (seta para cima/baixo navega linhas)

Dark mode:
- Usar next-themes provider
- Cores adaptativas via Tailwind dark:class