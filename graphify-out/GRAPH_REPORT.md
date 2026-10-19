# Graph Report - 6_comoVotei  (2026-10-18)

## Corpus Check
- 258 files · ~181,542 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1331 nodes · 2247 edges · 109 communities (74 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Pesquisa despesas (fase 1)
- Produtividade e listagem de parlamentares
- Roadmap e workflows de sincronização
- Dependências npm (package.json)
- stream-json: streamers base
- UI: componentes compartilhados
- Tooling de desenvolvimento (lint/test/build)
- Home e estatísticas
- Abas de perfil e ano padrão
- tsconfig e opções do compilador
- stream-json: parser
- stream-json: FlexAssembler
- stream-json: FlexAssembler (tipos)
- Prisma e páginas de perfil
- Páginas de abas do parlamentar
- Sincronização de despesas (Câmara)
- Votações globais e classificação de temas
- Adapter do Senado e HTTP client
- Scripts de sincronização (Câmara/Senado)
- Adapter da Câmara e tipos normalizados
- Cards e listagem de parlamentares
- stream-json: parser JSONC
- Dashboard do parlamentar (UI)
- stream-json: Assembler
- Layout, marca e página Sobre
- Garbage collection (GC)
- Métricas do dashboard
- stream-json: filtros
- Adapter do Senado (métodos)
- Despesa: chave natural e gate
- stream-json: Assembler (valores)
- stream-json: streamers
- Factory de normalizadores
- Aba Produtividade e skeleton
- Despesas: parsing e janela de retenção
- Sincronização de despesas (Senado)
- Utilitários e aba de gastos
- Deploy Vercel e cron
- API de dashboard e anos com dados
- API de despesas
- stream-json: stringer JSONC
- stream-json: stringer
- Adapter da Câmara (métodos)
- Backfill de status de proposições
- UI: Tabs
- stream-json: with-parser
- stream-json: utf8-stream
- Testes de streaming de despesas
- Frequência oficial
- HttpClient: fila e rate limit
- stream-json: assembler base
- stream-json: filtro replace
- Testes da chave de despesa
- stream-json: stream-array
- stream-json: filtro ignore
- stream-json: streamArray
- stream-json: streamObject
- stream-json: streamValues
- Cartão de presença
- stream-json: emit
- stream-json: verificador JSONC
- stream-json: parser JSONL
- stream-json: verificador
- stream-json: stream-base (tipos)
- Seed do banco de dados
- stream-json: disassembler
- stream-json: batch
- API de visão geral
- stream-json: filter-base (tipos)
- stream-json: parser JSONC (tipos)
- stream-json: verificador JSONC (tipos)
- stream-json: parser JSONL (tipos)
- stream-json: parser (tipos)
- stream-json: batch (tipos)
- stream-json: verificador (tipos)
- Despesas: upsert e schema
- Ícone e identidade do app
- Configuração do ESLint
- stream-json: disassembler (tipos)
- stream-json: emitter
- stream-json: filter (tipos)
- stream-json: replace (tipos)
- stream-json: stringer JSONC (tipos)
- stream-json: stringer JSONL
- stream-json: stringer JSONL (tipos)
- stream-json: streamValues (tipos)
- stream-json: stringer (tipos)
- stream-json: utf8-stream (tipos)
- Testes de gates de despesas
- Testes de lock de despesas
- Configuração do next.config.js
- stream-json: emitter (tipos)
- Docs: camada anti-corrupção
- Docs: HttpClient
- Docs: invariante do read path
- Docs: dívidas do codebase
- Docs: convenções de código
- Docs: integrações externas
- Docs: stack tecnológico
- Docs: estrutura do codebase

## God Nodes (most connected - your core abstractions)
1. `cn()` - 36 edges
2. `prisma` - 24 edges
3. `anoCorrente()` - 22 edges
4. `FlexAssembler` - 22 edges
5. `Phase 1 Research — key gate, money/date/match contracts` - 20 edges
6. `SenadoAdapter` - 20 edges
7. `scripts` - 19 edges
8. `Assembler` - 18 edges
9. `Assembler` - 18 edges
10. `FlexAssembler` - 18 edges

## Surprising Connections (you probably didn't know these)
- `GET /referencias/situacoesProposicao reference enum` --conceptually_related_to--> `camaraNameMatch pure DB-free matcher`  [INFERRED]
  CAMARA_API_REFERENCE.md → .planning/phases/01-schema-e-contratos-de-despesas/01-RESEARCH.md
- `GET /deputados/{id}/despesas (Câmara REST)` --conceptually_related_to--> `Câmara CEAP bulk cotas/Ano-{ano}.json.zip (225 MB/yr)`  [INFERRED]
  CAMARA_API_REFERENCE.md → .planning/research/STACK.md
- `API Dados Abertos da Câmara dos Deputados (v2)` --conceptually_related_to--> `Workflow Sync Câmara dos Deputados (03:00 UTC)`  [INFERRED]
  .planning/codebase/INTEGRATIONS.md → .github/workflows/sync-camara.yml
- `API Dados Abertos do Senado (legis.senado.leg.br)` --conceptually_related_to--> `Workflow Sync Senado Federal (04:00 UTC)`  [INFERRED]
  .planning/codebase/INTEGRATIONS.md → .github/workflows/sync-senado.yml
- `Como Votei product (public legislative-transparency tool)` --conceptually_related_to--> `README — Como Votei setup/sync/deploy docs`  [INFERRED]
  CONTEXT.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Despesas ingestion write path (Phase 2 target)** — _planning_research_architecture_pattern1_flag_despesas_phase, _planning_research_architecture_pattern2_streaming_parse, _planning_research_stack_batched_on_conflict_upsert, _planning_research_architecture_pattern5_retention_delete, _planning_phases_01_schema_e_contratos_de_despesas_01_research_camara_name_match, _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesanormalizada [EXTRACTED 0.90]
- **Codebase map (.planning/codebase/) — set de 7 documentos de análise** — _planning_codebase_architecture, _planning_codebase_concerns, _planning_codebase_conventions, _planning_codebase_integrations, _planning_codebase_stack, _planning_codebase_structure, _planning_codebase_testing [EXTRACTED 1.00]
- **Planos da Phase 1 (Schema e Contratos de Despesas) — waves 1 e 2** — _planning_phases_01_schema_e_contratos_de_despesas_01_01_plan, _planning_phases_01_schema_e_contratos_de_despesas_01_02_plan, _planning_phases_01_schema_e_contratos_de_despesas_01_03_plan [EXTRACTED 1.00]
- **Free-tier survival strategy (Neon 0.5 GB budget)** — _planning_research_summary_neon_budget, _planning_research_stack_prisma_decimal, _planning_research_stack_batched_on_conflict_upsert, _planning_research_architecture_pattern5_retention_delete, _planning_research_pitfalls_p10_storage_blowup, _planning_research_architecture_pattern2_streaming_parse, _planning_phases_01_schema_e_contratos_de_despesas_01_context_d01_fields [INFERRED 0.85]
- **Phase 1 contract-freeze gate (schema + pure contracts)** — _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesa_model, _planning_phases_01_schema_e_contratos_de_despesas_01_research_content_fingerprint_key, _planning_phases_01_schema_e_contratos_de_despesas_01_research_parsebrl, _planning_phases_01_schema_e_contratos_de_despesas_01_research_parsedatafonte, _planning_phases_01_schema_e_contratos_de_despesas_01_research_despesanormalizada, _planning_phases_01_schema_e_contratos_de_despesas_01_research_camara_name_match, _planning_phases_01_schema_e_contratos_de_despesas_01_research_anos_janela, _planning_phases_01_schema_e_contratos_de_despesas_01_research_derivar_id_externo [INFERRED 0.90]
- **Cadeia de contrato monetário float-free (QA-02 / D-07): parseBRL → DespesaNormalizada → coluna Decimal** — _planning_phases_01_schema_e_contratos_de_despesas_01_02_plan_parsebrl, _planning_phases_01_schema_e_contratos_de_despesas_01_03_plan_despesanormalizada, _planning_phases_01_schema_e_contratos_de_despesas_01_01_plan_despesa_model [INFERRED 0.95]

## Communities (109 total, 26 thin omitted)

### Community 0 - "Pesquisa despesas (fase 1)"
Cohesion: 0.06
Nodes (66): Phase 1 Context — Schema e Contratos de Despesas, D-01 lean column set (UI+audit only, drop detalhamento), D-02 compute-on-read (no aggregate columns/tables), D-03 namespaced natural key idExterno + zero-collision gate, D-05 source-label categories (no unified enum/mapping table), D-06 exact name+UF match, party tie-break only, ambiguity→null, D-07 defensive parseBRL + date helpers (never parseFloat), Phase 1 Discussion Log (audit trail of alternatives) (+58 more)

### Community 1 - "Produtividade e listagem de parlamentares"
Cohesion: 0.06
Nodes (47): dynamic, GET(), querySchema, dynamic, GET(), querySchema, dynamic, GET() (+39 more)

### Community 2 - "Roadmap e workflows de sincronização"
Cohesion: 0.06
Nodes (51): CI job "e2e" (Playwright contra produção), CI job "qualidade" (tsc + lint + jest + Codecov), Tuning de Neon cold-start no DATABASE_URL (connect_timeout=30 & pool_timeout=60), Guardrail inline: nominais sem votos (Câmara), Guardrail inline: proposições e tramitações da Câmara, Workflow Sync Câmara dos Deputados (03:00 UTC), Guardrail inline: proposições e tramitações do Senado, Workflow Sync Senado Federal (04:00 UTC) (+43 more)

### Community 3 - "Dependências npm (package.json)"
Cohesion: 0.04
Nodes (45): clsx, next-themes, dependencies, clsx, next, next-themes, @prisma/client, react (+37 more)

### Community 4 - "stream-json: streamers base"
Cohesion: 0.07
Nodes (28): asStream(), {asStream, none}, streamArray, StreamArrayItem, streamArray(), streamBase, withParser, withParserAsStream() (+20 more)

### Community 5 - "UI: componentes compartilhados"
Cohesion: 0.09
Nodes (28): SearchForm, StatCard(), CHAVES_FILTRO, ParlamentarCompleto, PartidoItem, SORTS, UfItem, PartidoItem (+20 more)

### Community 6 - "Tooling de desenvolvimento (lint/test/build)"
Cohesion: 0.06
Nodes (35): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, jest (+27 more)

### Community 7 - "Home e estatísticas"
Cohesion: 0.09
Nodes (19): GET(), HomePage(), StatsCards, ParlamentaresPageClient(), load(), AvisoBanner(), Estado, ITENS (+11 more)

### Community 8 - "Abas de perfil e ano padrão"
Cohesion: 0.13
Nodes (22): Discurso, DiscursosTab(), DiscursosTabProps, CORES_TIPO, Proposicao, ProposicoesTab(), ProposicoesTabProps, extrairInfoProposicao() (+14 more)

### Community 9 - "tsconfig e opções do compilador"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+19 more)

### Community 10 - "stream-json: parser"
Cohesion: 0.08
Nodes (23): ignore, make, {asStream, flushable, gen, many, none}, codes, expected, fixUtf8Stream, fromHex(), jsonParser() (+15 more)

### Community 11 - "stream-json: FlexAssembler"
Cohesion: 0.12
Nodes (5): compileFilter(), compileRules(), EventEmitter, FlexAssembler, {none}

### Community 12 - "stream-json: FlexAssembler (tipos)"
Cohesion: 0.08
Nodes (8): ArrayRule, CompiledRule, Filter, FilterFunction, FlexAssembler, FlexAssemblerOptions, ObjectRule, StackEntry

### Community 13 - "Prisma e páginas de perfil"
Cohesion: 0.10
Nodes (8): dynamic, dynamic, PageProps, PageProps, PageProps, PageProps, globalForPrisma, prisma

### Community 14 - "Páginas de abas do parlamentar"
Cohesion: 0.11
Nodes (12): DashboardTab(), coresSecao, ParlamentarHeader(), ParlamentarHeaderData, rotuloSituacao(), SecaoId, secoes, PageProps (+4 more)

### Community 15 - "Sincronização de despesas (Câmara)"
Cohesion: 0.12
Nodes (11): args, buildDiretorio(), HttpRandomAccessReader, ingestYear(), options, prisma, runSanityGates(), syncDespesasCamara() (+3 more)

### Community 16 - "Votações globais e classificação de temas"
Cohesion: 0.14
Nodes (17): metadata, ANOS, ApiResponse, ehVotacaoNominal(), extrairInfoProposicao(), gerarResumo(), getResultadoBadge(), TEMAS (+9 more)

### Community 17 - "Adapter do Senado e HTTP client"
Cohesion: 0.11
Nodes (19): portalTransparenciaClient, QueuedRequest, RateLimitConfig, RequestOptions, senadoClient, USER_AGENT, buildUrl(), DespesaSenado (+11 more)

### Community 18 - "Scripts de sincronização (Câmara/Senado)"
Cohesion: 0.28
Nodes (16): upsertDiscurso(), upsertFrequencia(), upsertParlamentar(), upsertProposicao(), upsertVotacao(), upsertVotoDoParlamentar(), criarSeletorDeFases(), imprimirCabecalho() (+8 more)

### Community 19 - "Adapter da Câmara e tipos normalizados"
Cohesion: 0.13
Nodes (19): CamaraDeputado, CamaraDiscurso, CamaraPartido, CamaraProposicao, CamaraVotacao, CamaraVoto, hashString(), makeDiscursoIdExterno() (+11 more)

### Community 20 - "Cards e listagem de parlamentares"
Cohesion: 0.13
Nodes (13): ParlamentarCard(), ParlamentarCardProps, ParlamentarWithCounts, ProdutividadeResumo, ParlamentarComProdutividade, ParlamentaresAtivos(), fetchData(), RANK_STYLE (+5 more)

### Community 21 - "stream-json: parser JSONC"
Cohesion: 0.11
Nodes (20): {asStream, flushable, gen, many, none}, codes, expected, fixUtf8Stream, fromHex(), jsoncJsonParser(), jsoncParser(), literalTokens (+12 more)

### Community 22 - "Dashboard do parlamentar (UI)"
Cohesion: 0.12
Nodes (12): DashboardFilters(), DashboardFiltersProps, FiltroDisponivel, FiltrosDisponiveis, TIPO_DISCURSO_COR, TIPO_DISCURSO_LABEL, TIPO_VOTO_COR, TIPO_VOTO_LABEL (+4 more)

### Community 24 - "Layout, marca e página Sobre"
Cohesion: 0.14
Nodes (11): atkinson, metadata, viewport, metadata, MODULOS, PRINCIPIOS, Logo(), LogoMark() (+3 more)

### Community 25 - "Garbage collection (GC)"
Cohesion: 0.18
Nodes (14): main(), parseLote(), construirCorte(), contarForaDaJanela(), CorteJanela, ESPEC_GC, EspecGc, executarGc() (+6 more)

### Community 26 - "Métricas do dashboard"
Cohesion: 0.17
Nodes (15): AlinhamentoResult, computeAlinhamento(), computeFrequencia(), FrequenciaResult, isPresenca(), MesAtividade, mode(), TemaAgregado (+7 more)

### Community 27 - "stream-json: filtros"
Cohesion: 0.18
Nodes (13): checkableTokens, filterBase(), makeStackDiffer(), {many, combineManyMut, none, flushable}, optionalTokens, regExpFilter(), stopTokens, stringFilter() (+5 more)

### Community 28 - "Adapter do Senado (métodos)"
Cohesion: 0.21
Nodes (5): asArray(), SenadoAdapter, toDate(), ParlamentarNormalizado, VotacaoNormalizada

### Community 29 - "Despesa: chave natural e gate"
Cohesion: 0.22
Nodes (13): buildDespesaData(), main(), parseDataEmissao(), parseDecimal(), prisma, registroLider, registrosTeste, executarGate() (+5 more)

### Community 31 - "stream-json: streamers"
Cohesion: 0.13
Nodes (8): streamArray, StreamArrayItem, {assembler}, Counter, {none}, streamBase(), streamObject, StreamObjectItem

### Community 32 - "Factory de normalizadores"
Cohesion: 0.19
Nodes (6): main(), prisma, AdapterType, BaseAdapter, NormalizerFactory, Casa

### Community 33 - "Aba Produtividade e skeleton"
Cohesion: 0.18
Nodes (9): ORDEM_GRUPOS, ProdutividadeData, ProdutividadeTab(), ProdutividadeTabProps, metadata, Skeleton(), SkeletonTable(), ContagemPorGrupo (+1 more)

### Community 34 - "Despesas: parsing e janela de retenção"
Cohesion: 0.22
Nodes (10): [anoAtual, anoAnterior, anoRetrasado], ANOS_JANELA, parseBRL(), parseDataFonte(), hasDb, prisma, hasDb, mockDiretorioSenado (+2 more)

### Community 35 - "Sincronização de despesas (Senado)"
Cohesion: 0.18
Nodes (10): runRetention(), ANOS_JANELA_ARR, args, options, prisma, syncDespesasSenado(), SyncOptions, deletarForaDaJanela() (+2 more)

### Community 36 - "Utilitários e aba de gastos"
Cohesion: 0.29
Nodes (10): Despesa, DespesaMeta, GastoTab(), GastoTabProps, debounce(), formatCurrency(), formatDate(), getInitials() (+2 more)

### Community 37 - "Deploy Vercel e cron"
Cohesion: 0.15
Nodes (12): gru1, buildCommand, crons, devCommand, framework, functions, src/app/api/cron/sync-incremental/route.ts, headers (+4 more)

### Community 38 - "API de dashboard e anos com dados"
Cohesion: 0.26
Nodes (10): dynamic, GET(), anosComDadosGlobais(), anosGlobais(), dynamic, GET(), querySchema, computeAtividadeMensal() (+2 more)

### Community 39 - "API de despesas"
Cohesion: 0.33
Nodes (10): dynamic, GET(), lerParametros(), querySchema, buildDespesaWhere(), calcularPaginacaoDespesa(), DEFAULT_DESPESA_PER_PAGE, DespesaFiltros (+2 more)

### Community 40 - "stream-json: stringer JSONC"
Cohesion: 0.17
Nodes (12): {asStream, flushable, none}, depthDecrement, depthIncrement, jsoncStringer(), noCommaAfter, noSpaceAfter, noSpaceBefore, replaceSymbols (+4 more)

### Community 41 - "stream-json: stringer"
Cohesion: 0.17
Nodes (12): {asStream, flushable, none}, depthDecrement, depthIncrement, noCommaAfter, noSpaceAfter, noSpaceBefore, replaceSymbols, sanitizeString() (+4 more)

### Community 42 - "Adapter da Câmara (métodos)"
Cohesion: 0.28
Nodes (3): CamaraAdapter, toDate(), SyncStats

### Community 43 - "Backfill de status de proposições"
Cohesion: 0.23
Nodes (9): args, backfill(), backfillCamara(), backfillSenado(), Options, prisma, mapStatusProposicao(), camaraClient (+1 more)

### Community 44 - "UI: Tabs"
Cohesion: 0.20
Nodes (11): Tabs(), TabsContent(), TabsContentProps, TabsContext, TabsContextValue, TabsList(), TabsListProps, TabsProps (+3 more)

### Community 45 - "stream-json: with-parser"
Cohesion: 0.23
Nodes (9): {asStream}, {asStream}, filterBase, pick, withParser, asStream(), {asStream: makeStream, gen}, parser (+1 more)

### Community 46 - "stream-json: utf8-stream"
Cohesion: 0.23
Nodes (4): process, {StringDecoder}, {Transform}, Utf8Stream

### Community 47 - "Testes de streaming de despesas"
Cohesion: 0.29
Nodes (9): camaraNameMatch(), DiretorioParlamentares, EntradaMatch, normalizarNome(), normalizarUf(), ResultadoMatch, mockDiretorio, streamArray (+1 more)

### Community 48 - "Frequência oficial"
Cohesion: 0.25
Nodes (8): dynamic, GET(), FrequenciaAno, FrequenciaOficial, FrequenciaRow, FrequenciaTotal, obterFrequenciaOficial(), somarFrequencias()

### Community 50 - "stream-json: assembler base"
Cohesion: 0.20
Nodes (5): EventEmitter, {none}, streamBase, StreamBaseConfig, StreamBaseOptions

### Community 51 - "stream-json: filtro replace"
Cohesion: 0.39
Nodes (6): asStream(), {asStream, none, isMany, getManyValues, combineManyMut, many}, {filterBase, makeStackDiffer}, replace(), withParser, withParserAsStream()

### Community 52 - "Testes da chave de despesa"
Cohesion: 0.29
Nodes (6): derivarTodas(), Entrada, expectParDiferente(), FONTES, linhasCamara, linhasSenado

### Community 53 - "stream-json: stream-array"
Cohesion: 0.52
Nodes (6): asStream(), {asStream, none}, streamArray(), streamBase, withParser, withParserAsStream()

### Community 54 - "stream-json: filtro ignore"
Cohesion: 0.48
Nodes (6): asStream(), {asStream, none}, {filterBase, makeStackDiffer}, ignore(), withParser, withParserAsStream()

### Community 55 - "stream-json: streamArray"
Cohesion: 0.52
Nodes (6): asStream(), {asStream, none}, streamArray(), streamBase, withParser, withParserAsStream()

### Community 56 - "stream-json: streamObject"
Cohesion: 0.52
Nodes (6): asStream(), {asStream, none}, streamBase, streamObject(), withParser, withParserAsStream()

### Community 57 - "stream-json: streamValues"
Cohesion: 0.52
Nodes (6): asStream(), {asStream, none}, streamBase, streamValues(), withParser, withParserAsStream()

### Community 58 - "Cartão de presença"
Cohesion: 0.40
Nodes (4): FrequenciaAno, FrequenciaResponse, pct(), PresencaCard()

### Community 59 - "stream-json: emit"
Cohesion: 0.40
Nodes (3): emit, make(), parser

### Community 60 - "stream-json: verificador JSONC"
Cohesion: 0.40
Nodes (5): {asStream, flushable, gen, none}, expected, fixUtf8Stream, jsoncVerifier(), patterns

### Community 61 - "stream-json: parser JSONL"
Cohesion: 0.53
Nodes (5): checkedParse(), fixUtf8Stream, {gen, none, asStream}, jsonlParser(), lines

### Community 62 - "stream-json: verificador"
Cohesion: 0.40
Nodes (5): {asStream, flushable, gen, none}, expected, fixUtf8Stream, patterns, verifier()

### Community 63 - "stream-json: stream-base (tipos)"
Cohesion: 0.33
Nodes (3): streamBase, StreamBaseConfig, StreamBaseOptions

### Community 64 - "Seed do banco de dados"
Cohesion: 0.40
Nodes (3): partidos, prisma, ufs

### Community 65 - "stream-json: disassembler"
Cohesion: 0.60
Nodes (4): asStream(), {asStream: makeStream}, disassembler(), dump()

### Community 66 - "stream-json: batch"
Cohesion: 0.60
Nodes (4): {asStream}, batch(), parseBatchSize(), scBatch

### Community 67 - "API de visão geral"
Cohesion: 0.67
Nodes (3): contarPorAno(), dynamic, GET()

### Community 68 - "stream-json: filter-base (tipos)"
Cohesion: 0.50
Nodes (3): filterBase, FilterBaseConfig, FilterBaseOptions

### Community 69 - "stream-json: parser JSONC (tipos)"
Cohesion: 0.50
Nodes (3): jsoncParser, JsoncParserOptions, Token

### Community 70 - "stream-json: verificador JSONC (tipos)"
Cohesion: 0.50
Nodes (3): jsoncVerifier, JsoncVerifierError, JsoncVerifierOptions

### Community 71 - "stream-json: parser JSONL (tipos)"
Cohesion: 0.50
Nodes (3): JsonlItem, jsonlParser, JsonlParserOptions

### Community 72 - "stream-json: parser (tipos)"
Cohesion: 0.50
Nodes (3): parser, ParserOptions, Token

### Community 73 - "stream-json: batch (tipos)"
Cohesion: 0.50
Nodes (3): batch, BatchOptions, BatchStream

### Community 74 - "stream-json: verificador (tipos)"
Cohesion: 0.50
Nodes (3): verifier, VerifierError, VerifierOptions

### Community 75 - "Despesas: upsert e schema"
Cohesion: 0.50
Nodes (3): DespesaNormalizada, hasDb, prisma

### Community 76 - "Ícone e identidade do app"
Cohesion: 1.00
Nodes (3): Como Votei Project, Como Votei App Icon (checkmark on blue gradient rounded square), Ballot/Voting Checkmark Symbol

## Knowledge Gaps
- **454 isolated node(s):** `AGENTS.md — GSD project/stack/conventions injection`, `CONTEXT.md — Como Votei`, `README — Como Votei setup/sync/deploy docs`, `Codebase Concerns — dívidas, bugs conhecidos, segurança, performance`, `Coding Conventions — naming, estilo, erros, logging` (+449 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 616 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `Prisma e páginas de perfil` to `Produtividade e listagem de parlamentares`, `API de visão geral`, `API de dashboard e anos com dados`, `API de despesas`, `Páginas de abas do parlamentar`, `Frequência oficial`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `anoCorrente()` connect `Home e estatísticas` to `Produtividade e listagem de parlamentares`, `UI: componentes compartilhados`, `API de dashboard e anos com dados`, `Abas de perfil e ano padrão`, `Páginas de abas do parlamentar`, `Votações globais e classificação de temas`, `Scripts de sincronização (Câmara/Senado)`, `Cards e listagem de parlamentares`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `cn()` connect `UI: componentes compartilhados` to `Aba Produtividade e skeleton`, `Utilitários e aba de gastos`, `Abas de perfil e ano padrão`, `UI: Tabs`, `Dashboard do parlamentar (UI)`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `AGENTS.md — GSD project/stack/conventions injection`, `CONTEXT.md — Como Votei`, `README — Como Votei setup/sync/deploy docs` to the rest of the system?**
  _454 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pesquisa despesas (fase 1)` be split into smaller, more focused modules?**
  _Cohesion score 0.06386946386946386 - nodes in this community are weakly interconnected._
- **Should `Produtividade e listagem de parlamentares` be split into smaller, more focused modules?**
  _Cohesion score 0.06370543541788427 - nodes in this community are weakly interconnected._
- **Should `Roadmap e workflows de sincronização` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._