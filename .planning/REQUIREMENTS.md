# Requirements — Como Votei · Módulo Gastos

**Milestone:** Gastos parlamentares (CEAP/CEAPS)
**Status:** v1 complete 2026-10-19 (fases 1–6; cobertura + emendas incluídas) — research: `.planning/research/SUMMARY.md`

## v1 Requirements

### Exibição (UI + API)

- [x] **GAST-01**: Usuário vê o total de gastos do parlamentar no ano selecionado, com seletor de ano e breakdown por categoria em barras + tabela equivalente (acessível), com valor absoluto e percentual
- [x] **GAST-02**: Usuário vê a lista paginada (20/página) de documentos de despesa do ano — data, categoria, fornecedor, valor — com paginação no envelope padrão do projeto
- [x] **GAST-03**: Usuário clica no link do comprovante oficial de cada gasto (abre em nova aba, `rel="noopener"`) e vê link do dado oficial da fonte; quando o comprovante não existe na fonte, vê estado honesto "Não disponível"
- [x] **GAST-06**: Cliente consome `GET /api/parlamentares/[id]/despesas?ano=&pagina=&limit=` com validação zod (400/404), resumo agregado e página vindos do mesmo snapshot, envelope de paginação idêntico às demais rotas
- [x] **GAST-07**: Usuário vê nota de limitações do dado junto do dado e estados distinguíveis de loading, vazio ("não gastou"), sem dados de sync e erro — nunca um "0 gastos" enganoso (lição do bug de 0 votos, `660f01f`)

### Sincronização

- [x] **GAST-04**: Job de sync ingere despesas dos últimos 3 anos das duas casas — Câmara via bulk `cotas/Ano-{ano}.json.zip` (streaming, nunca `JSON.parse`) e Senado via API CEAPS — com upsert idempotente que aplica correções do snapshot diário
- [x] **GAST-05**: Após ingestão bem-sucedida, despesas fora da janela de 3 anos são apagadas (DELETE em lotes), dirigidas pela mesma constante de ano que alimenta o loop de importação — o banco nunca acumula importações passadas indefinidamente
- [x] **GAST-08**: Ingestão falha ruidosamente (nunca silenciosa) quando o arquivo da fonte é inválido, a taxa de parlamentares sem match excede o limite, há match ambíguo, ou contagens/somas fogem das sanity gates; match é exato por nome normalizado + UF (partido só como desempate) e nunca inventa correspondência
- [x] **OPS-01**: Syncs de despesas rodam sob lock (advisory) e com timeout por step; o gatilho duplicado das 03:00 UTC (Vercel cron × GH schedule) é corrigido no mesmo milestone, antes de qualquer delete reativo

### Cobertura de dados (Phase 5)

- [x] **COV-01**: Relatório de cobertura por casa/ano/dataset (votações, votos, proposições, discursos) com contagem, presença e variação ano a ano; sai ≠ 0 quando dataset com fonte disponível está zerado
- [x] **COV-02**: Lacunas da fonte (Senado 2024/2026, Câmara 2025/2026) preenchidas ou documentadas com evidência em `05-GAPS.md`
- [x] **COV-03**: UI distingue "sem dados oficiais" (fonte não publica) de "nenhum registro" (fonte publica e não há)

### Emendas parlamentares (Phase 6)

- [x] **EMEN-01**: Modelo `Emenda` com `codigoEmenda @unique`, `parlamentarId` nullable, `ano`, tipo, função, subfunção, localidade bruta + `uf`/`municipio`/`localidadeTipo`, seis valores `Decimal(14,2)` e índices para consulta por parlamentar/ano
- [x] **EMEN-02**: Sync `--apenas-emendas` ingere 2024–2026 via API do Portal (15/página, para na primeira página vazia), upsert idempotente
- [x] **EMEN-03**: Retenção de 3 anos + gate de contagem e de unmatched; step diário no workflow com `PORTAL_API_KEY`
- [x] **EMEN-04**: Match exato por nome normalizado + aliases curados à mão; nunca fuzzy; unmatched logados e não atribuídos
- [x] **EMEN-05**: `GET /api/parlamentares/[id]/emendas` com zod (400/404), envelope padrão, resumo (pago, empenhado, por função, por localidade) e página do mesmo snapshot
- [x] **EMEN-06**: Bloco "Emendas parlamentares" na aba Gastos, com total separado da cota, pago em destaque, empenhado ao lado, top funções e top localidades
- [x] **EMEN-07**: Lista paginada com código, tipo, localidade, função, valores e link `.../emendas?codigoEmenda=`; filtros ano + função; estados honestos
- [x] **EMEN-08**: Jest das funções puras (parse de localidade, agregações, alias) + Playwright do bloco

### Qualidade / Verificação

- [x] **QA-01**: Toda fase passa `npx tsc --noEmit && npx next lint && npx jest && npx next build` antes de commit/push
- [x] **QA-02**: Lógica de conversão de dinheiro (`parseBRL`), name-match e agregação tem cobertura de teste unitário (Jest); valores monetários usam `Decimal(14,2)`, nunca float/`parseFloat`
- [x] **QA-03**: Fluxo de UI de gastos validado end-to-end com Playwright (local ou produção) — total, barras, lista, links e estados

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
| GAST-01 | Phase 4 |
| GAST-02 | Phase 4 |
| GAST-03 | Phase 4 |
| GAST-04 | Phase 2 |
| GAST-05 | Phase 2 |
| GAST-06 | Phase 3 |
| GAST-07 | Phase 4 |
| COV-01 | Phase 5 |
| COV-02 | Phase 5 |
| COV-03 | Phase 5 |
| EMEN-01 | Phase 6 |
| EMEN-02 | Phase 6 |
| EMEN-03 | Phase 6 |
| EMEN-04 | Phase 6 |
| EMEN-05 | Phase 6 |
| EMEN-06 | Phase 6 |
| EMEN-07 | Phase 6 |
| EMEN-08 | Phase 6 |
| GAST-08 | Phase 2 |
| OPS-01 | Phase 2 |
| QA-01 | Phase 1 (gate herdado por todas as fases) |
| QA-02 | Phase 1 (agregação completada na Phase 3) |
| QA-03 | Phase 4 |
