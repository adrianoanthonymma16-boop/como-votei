# Requirements — Como Votei · Módulo Gastos

**Milestone:** Gastos parlamentares (CEAP/CEAPS)
**Status:** v1 defined 2026-10-09 (research: `.planning/research/SUMMARY.md`)

## v1 Requirements

### Exibição (UI + API)

- [ ] **GAST-01**: Usuário vê o total de gastos do parlamentar no ano selecionado, com seletor de ano e breakdown por categoria em barras + tabela equivalente (acessível), com valor absoluto e percentual
- [ ] **GAST-02**: Usuário vê a lista paginada (20/página) de documentos de despesa do ano — data, categoria, fornecedor, valor — com paginação no envelope padrão do projeto
- [ ] **GAST-03**: Usuário clica no link do comprovante oficial de cada gasto (abre em nova aba, `rel="noopener"`) e vê link do dado oficial da fonte; quando o comprovante não existe na fonte, vê estado honesto "Não disponível"
- [ ] **GAST-06**: Cliente consome `GET /api/parlamentares/[id]/despesas?ano=&pagina=&limit=` com validação zod (400/404), resumo agregado e página vindos do mesmo snapshot, envelope de paginação idêntico às demais rotas
- [ ] **GAST-07**: Usuário vê nota de limitações do dado junto do dado e estados distinguíveis de loading, vazio ("não gastou"), sem dados de sync e erro — nunca um "0 gastos" enganoso (lição do bug de 0 votos, `660f01f`)

### Sincronização

- [ ] **GAST-04**: Job de sync ingere despesas dos últimos 3 anos das duas casas — Câmara via bulk `cotas/Ano-{ano}.json.zip` (streaming, nunca `JSON.parse`) e Senado via API CEAPS — com upsert idempotente que aplica correções do snapshot diário
- [ ] **GAST-05**: Após ingestão bem-sucedida, despesas fora da janela de 3 anos são apagadas (DELETE em lotes), dirigidas pela mesma constante de ano que alimenta o loop de importação — o banco nunca acumula importações passadas indefinidamente
- [ ] **GAST-08**: Ingestão falha ruidosamente (nunca silenciosa) quando o arquivo da fonte é inválido, a taxa de parlamentares sem match excede o limite, há match ambíguo, ou contagens/somas fogem das sanity gates; match é exato por nome normalizado + UF (partido só como desempate) e nunca inventa correspondência
- [ ] **OPS-01**: Syncs de despesas rodam sob lock (advisory) e com timeout por step; o gatilho duplicado das 03:00 UTC (Vercel cron × GH schedule) é corrigido no mesmo milestone, antes de qualquer delete reativo

### Qualidade / Verificação

- [ ] **QA-01**: Toda fase passa `npx tsc --noEmit && npx next lint && npx jest && npx next build` antes de commit/push
- [ ] **QA-02**: Lógica de conversão de dinheiro (`parseBRL`), name-match e agregação tem cobertura de teste unitário (Jest); valores monetários usam `Decimal(14,2)`, nunca float/`parseFloat`
- [ ] **QA-03**: Fluxo de UI de gastos validado end-to-end com Playwright (local ou produção) — total, barras, lista, links e estados

## v2 Requirements (deferred)

- [ ] **GAST-V2-01**: Evolução mensal (12 barras por ano) no mesmo endpoint — custo marginal ~0
- [ ] **GAST-V2-02**: Top fornecedores do ano no perfil
- [ ] **GAST-V2-03**: Filtro por categoria na lista de documentos
- [ ] **GAST-V2-04**: Export CSV como job (não on-request)
- [ ] **GAST-V2-05**: Job amostral de saúde de links de comprovante (`link_status`, ~500 URLs/mês, HEAD)
- [ ] **GAST-V2-06**: Monitoramento de storage/bloat (`pg_total_relation_size` vs orçamento) e estimativa de minutos de Actions no summary do job

## Out of Scope

- **Ranking/comparação de gastos entre parlamentares** — exige ADR de metodologia própria; escopo decidido como fora no PROJECT.md
- **Agregados pré-computados (ano×categoria)** — compute-on-read até profiling provar o contrário; evita tabela paralela divergente
- **Espelhar PDFs de comprovante** — dezenas de GB vs 500 MB de Neon; preservar link + metadados
- **Verba de gabinete, salário, "custo do mandato"** — fontes distintas, milestone separado
- **LLM/sumarização, dashboards analíticos avançados, gauges** — custo/complexidade sem validação
- **Login/favoritos/alertas** — produto é público (PROJECT.md)
- **Dados anteriores à janela de 3 anos** — recorte do produto (PROJECT.md)

## Traceability

<!-- Preenchido pelo roadmap: REQ-ID → phase -->

| Requirement | Phase |
|-------------|-------|
| GAST-01 | — |
| GAST-02 | — |
| GAST-03 | — |
| GAST-04 | — |
| GAST-05 | — |
| GAST-06 | — |
| GAST-07 | — |
| GAST-08 | — |
| OPS-01 | — |
| QA-01 | — |
| QA-02 | — |
| QA-03 | — |
