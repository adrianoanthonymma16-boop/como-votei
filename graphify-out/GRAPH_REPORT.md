# Graph Report - 6_comoVotei  (2026-10-09)

## Corpus Check
- 133 files · ~116,003 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 756 nodes · 1289 edges · 51 communities (25 shown, 17 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Parliamentarian Profile Tabs
- Productivity and List Views
- Phase 1 Research and Contracts
- Shared UI Components
- Despesas Roadmap and Workflows
- Landing and Site Shell
- NPM Dependencies
- Dev Tooling Dependencies
- TypeScript Config
- Sync HTTP Client
- Dashboard Metrics
- Sync Orchestration Scripts
- Camara Data Adapter
- Senado Normalization Types
- Profile Header Pages
- Senado Adapter Fetchers
- Vercel Deployment Config
- Frequencia Computation
- Camara Adapter Fetchers
- Year Data Queries
- Prisma and Votes API
- Presence Card UI
- Adapter Stats Base
- Database Seed
- Speech Pages
- Discursos API
- Votes Detail API
- Partidos API
- Overall Stats API
- UF API
- Votacoes List API
- Project Branding
- ESLint Config
- Next Config
- Normalization ACL Rationale
- HTTP Resilience Rationale
- Postgres Read-Path Rationale
- Codebase Concerns Doc
- Coding Conventions Doc
- External Integrations Doc
- Tech Stack Doc
- Codebase Structure Doc

## God Nodes (most connected - your core abstractions)
1. `cn()` - 34 edges
2. `prisma` - 22 edges
3. `SenadoAdapter` - 20 edges
4. `Phase 1 Research — key gate, money/date/match contracts` - 20 edges
5. `CamaraAdapter` - 17 edges
6. `compilerOptions` - 17 edges
7. `scripts` - 15 edges
8. `Pitfalls Research — bulk government open-data ingestion` - 14 edges
9. `Badge` - 12 edges
10. `Phase 1 Context — Schema e Contratos de Despesas` - 12 edges

## Surprising Connections (you probably didn't know these)
- `API Dados Abertos da Câmara dos Deputados (v2)` --conceptually_related_to--> `Workflow Sync Câmara dos Deputados (03:00 UTC)`  [INFERRED]
  .planning/codebase/INTEGRATIONS.md → .github/workflows/sync-camara.yml
- `API Dados Abertos do Senado (legis.senado.leg.br)` --conceptually_related_to--> `Workflow Sync Senado Federal (04:00 UTC)`  [INFERRED]
  .planning/codebase/INTEGRATIONS.md → .github/workflows/sync-senado.yml
- `GET /referencias/situacoesProposicao reference enum` --conceptually_related_to--> `camaraNameMatch pure DB-free matcher`  [INFERRED]
  CAMARA_API_REFERENCE.md → .planning/phases/01-schema-e-contratos-de-despesas/01-RESEARCH.md
- `GET /deputados/{id}/despesas (Câmara REST)` --conceptually_related_to--> `Câmara CEAP bulk cotas/Ano-{ano}.json.zip (225 MB/yr)`  [INFERRED]
  CAMARA_API_REFERENCE.md → .planning/research/STACK.md
- `backfillCamara()` --calls--> `mapStatusProposicao()`  [EXTRACTED]
  scripts/backfill-status-proposicoes.ts → src/lib/sync/camara-adapter.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Codebase map (.planning/codebase/) — set de 7 documentos de análise** — _planning_codebase_architecture, _planning_codebase_concerns, _planning_codebase_conventions, _planning_codebase_integrations, _planning_codebase_stack, _planning_codebase_structure, _planning_codebase_testing [EXTRACTED 1.00]
- **Planos da Phase 1 (Schema e Contratos de Despesas) — waves 1 e 2** — _planning_phases_01_schema_e_contratos_de_despesas_01_01_plan, _planning_phases_01_schema_e_contratos_de_despesas_01_02_plan, _planning_phases_01_schema_e_contratos_de_despesas_01_03_plan [EXTRACTED 1.00]
- **Cadeia de contrato monetário float-free (QA-02 / D-07): parseBRL → DespesaNormalizada → coluna Decimal** — _planning_phases_01_schema_e_contratos_de_despesas_01_02_plan_parsebrl, _planning_phases_01_schema_e_contratos_de_despesas_01_03_plan_despesanormalizada, _planning_phases_01_schema_e_contratos_de_despesas_01_01_plan_despesa_model [INFERRED 0.95]
- **Phase 1 contract-freeze gate (schema + pure contracts)** — _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesa_model, _planning_phases_01_schema_e_contratos_de_despesas_01_research_content_fingerprint_key, _planning_phases_01_schema_e_contratos_de_despesas_01_research_parsebrl, _planning_phases_01_schema_e_contratos_de_despesas_01_research_parsedatafonte, _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesanormalizada, _planning_phases_01_schema_e_contratos_de_despesas_01_research_camara_name_match, _planning_phases_01_schema_e_contratos_de_despesas_01_research_anos_janela, _planning_phases_01_schema_e_contratos_de_despesas_01_research_derivar_id_externo [INFERRED 0.90]
- **Free-tier survival strategy (Neon 0.5 GB budget)** — _planning_research_summary_neon_budget, _planning_research_stack_prisma_decimal, _planning_research_stack_batched_on_conflict_upsert, _planning_research_architecture_pattern5_retention_delete, _planning_research_pitfalls_p10_storage_blowup, _planning_research_architecture_pattern2_streaming_parse, _planning_phases_01_schema_e_contratos_de_despesas_01_context_d01_fields [INFERRED 0.85]
- **Despesas ingestion write path (Phase 2 target)** — _planning_research_architecture_pattern1_flag_despesas_phase, _planning_research_architecture_pattern2_streaming_parse, _planning_research_stack_batched_on_conflict_upsert, _planning_research_architecture_pattern5_retention_delete, _planning_phases_01_schema_e_contratos_de_despesas_01_research_camara_name_match, _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesanormalizada [EXTRACTED 0.90]

## Communities (51 total, 17 thin omitted)

### Community 0 - "Parliamentarian Profile Tabs"
Cohesion: 0.05
Nodes (49): DashboardData, DashboardTabProps, StatCard(), Discurso, DiscursosTabProps, CORES_TIPO, Proposicao, ProposicoesTab() (+41 more)

### Community 1 - "Productivity and List Views"
Cohesion: 0.05
Nodes (50): GET(), querySchema, revalidate, dynamic, GET(), querySchema, ORDEM_GRUPOS, ProdutividadeData (+42 more)

### Community 2 - "Phase 1 Research and Contracts"
Cohesion: 0.06
Nodes (66): Phase 1 Context — Schema e Contratos de Despesas, D-01 lean column set (UI+audit only, drop detalhamento), D-02 compute-on-read (no aggregate columns/tables), D-03 namespaced natural key idExterno + zero-collision gate, D-05 source-label categories (no unified enum/mapping table), D-06 exact name+UF match, party tie-break only, ambiguity→null, D-07 defensive parseBRL + date helpers (never parseFloat), Phase 1 Discussion Log (audit trail of alternatives) (+58 more)

### Community 3 - "Shared UI Components"
Cohesion: 0.05
Nodes (46): SearchForm, DashboardFilters(), DashboardFiltersProps, FiltroDisponivel, FiltrosDisponiveis, TIPO_DISCURSO_COR, TIPO_DISCURSO_LABEL, TIPO_VOTO_COR (+38 more)

### Community 4 - "Despesas Roadmap and Workflows"
Cohesion: 0.06
Nodes (51): CI job "e2e" (Playwright contra produção), CI job "qualidade" (tsc + lint + jest + Codecov), Tuning de Neon cold-start no DATABASE_URL (connect_timeout=30 & pool_timeout=60), Guardrail inline: nominais sem votos (Câmara), Guardrail inline: proposições e tramitações da Câmara, Workflow Sync Câmara dos Deputados (03:00 UTC), Guardrail inline: proposições e tramitações do Senado, Workflow Sync Senado Federal (04:00 UTC) (+43 more)

### Community 5 - "Landing and Site Shell"
Cohesion: 0.05
Nodes (27): atkinson, metadata, viewport, StatsCards, DashboardTab(), ParlamentaresPageClient(), metadata, MODULOS (+19 more)

### Community 6 - "NPM Dependencies"
Cohesion: 0.05
Nodes (41): clsx, date-fns, next-themes, dependencies, clsx, date-fns, next, next-themes (+33 more)

### Community 7 - "Dev Tooling Dependencies"
Cohesion: 0.06
Nodes (35): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, jest (+27 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 9 - "Sync HTTP Client"
Cohesion: 0.12
Nodes (13): args, backfill(), backfillCamara(), backfillSenado(), Options, prisma, camaraClient, HttpClient (+5 more)

### Community 10 - "Dashboard Metrics"
Cohesion: 0.13
Nodes (21): ANOS_GLOBAL, dynamic, GET(), querySchema, AlinhamentoResult, computeAlinhamento(), computeAtividadeMensal(), computeFrequencia() (+13 more)

### Community 11 - "Sync Orchestration Scripts"
Cohesion: 0.12
Nodes (15): main(), prisma, args, options, prisma, syncCamara(), SyncOptions, args (+7 more)

### Community 12 - "Camara Data Adapter"
Cohesion: 0.12
Nodes (18): CamaraDeputado, CamaraDiscurso, CamaraPartido, CamaraProposicao, CamaraVotacao, CamaraVoto, hashString(), makeDiscursoIdExterno() (+10 more)

### Community 13 - "Senado Normalization Types"
Cohesion: 0.14
Nodes (16): buildUrl(), DespesaSenado, DiscursoSenado, hashString(), makeDiscursoIdExterno(), makeTramitacaoIdExterno(), mapStatusProposicaoSenado(), mapTipoDiscursoSenado() (+8 more)

### Community 14 - "Profile Header Pages"
Cohesion: 0.13
Nodes (9): coresSecao, ParlamentarHeader(), ParlamentarHeaderData, rotuloSituacao(), SecaoId, secoes, PageProps, PageProps (+1 more)

### Community 15 - "Senado Adapter Fetchers"
Cohesion: 0.22
Nodes (5): asArray(), SenadoAdapter, toDate(), ParlamentarNormalizado, VotacaoNormalizada

### Community 16 - "Vercel Deployment Config"
Cohesion: 0.15
Nodes (12): gru1, buildCommand, crons, devCommand, framework, functions, src/app/api/cron/sync-incremental/route.ts, headers (+4 more)

### Community 17 - "Frequencia Computation"
Cohesion: 0.25
Nodes (8): dynamic, GET(), FrequenciaAno, FrequenciaOficial, FrequenciaRow, FrequenciaTotal, obterFrequenciaOficial(), somarFrequencias()

### Community 18 - "Camara Adapter Fetchers"
Cohesion: 0.38
Nodes (3): CamaraAdapter, toDate(), extrairTemaPrincipal()

### Community 19 - "Year Data Queries"
Cohesion: 0.33
Nodes (7): dynamic, GET(), dynamic, GET(), querySchema, anosComDados(), prisma

### Community 20 - "Prisma and Votes API"
Cohesion: 0.20
Nodes (4): dynamic, querySchema, PageProps, globalForPrisma

### Community 21 - "Presence Card UI"
Cohesion: 0.40
Nodes (4): FrequenciaAno, FrequenciaResponse, pct(), PresencaCard()

### Community 23 - "Database Seed"
Cohesion: 0.40
Nodes (3): partidos, prisma, ufs

### Community 28 - "Overall Stats API"
Cohesion: 0.67
Nodes (3): contarPorAno(), dynamic, GET()

### Community 31 - "Project Branding"
Cohesion: 1.00
Nodes (3): Como Votei Project, Como Votei App Icon (checkmark on blue gradient rounded square), Ballot/Voting Checkmark Symbol

## Knowledge Gaps
- **259 isolated node(s):** `extends`, `next/core-web-vitals`, `nextConfig`, `name`, `version` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 342 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Year Data Queries` to `Parliamentarian Profile Tabs`, `Productivity and List Views`, `Dashboard Metrics`, `Profile Header Pages`, `Frequencia Computation`, `Prisma and Votes API`, `Speech Pages`, `Discursos API`, `Votes Detail API`, `Partidos API`, `Overall Stats API`, `UF API`, `Votacoes List API`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `cn()` connect `Shared UI Components` to `Parliamentarian Profile Tabs`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Skeleton()` connect `Parliamentarian Profile Tabs` to `Productivity and List Views`, `Shared UI Components`, `Landing and Site Shell`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `extends`, `next/core-web-vitals`, `nextConfig` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Parliamentarian Profile Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Productivity and List Views` be split into smaller, more focused modules?**
  _Cohesion score 0.053994732221246705 - nodes in this community are weakly interconnected._
- **Should `Phase 1 Research and Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.06386946386946386 - nodes in this community are weakly interconnected._