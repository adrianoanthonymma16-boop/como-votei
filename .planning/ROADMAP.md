# Roadmap: Como Votei — Gastos parlamentares (CEAP/CEAPS)

## Overview

Milestone enxuto que adiciona o módulo de despesas parlamentares ao produto em produção, em ordem orientada a dados: primeiro congelar o contrato de dados (schema `Despesa`, chave natural, name-match, conversão de dinheiro), depois ingerir 3 anos das duas casas com upsert idempotente, retenção e guardrails que falham ruidosamente, em seguida expor a rota de leitura com resumo e página do mesmo snapshot, e só então renderizar a aba "Gastos" no perfil — total anual, barras por categoria, lista paginada, comprovantes clicáveis e estados honestos. Nenhuma fase de UI começa antes de os dados serem confiáveis: a lição do bug "0 votos" (`660f01f`) vale para "0 gastos". Toda fase fecha com o mesmo gate de verificação.

**Gate de verificação (herdado por todas as fases — QA-01):** `npx tsc --noEmit && npx next lint && npx jest && npx next build`

**Nota de cobertura:** a Phase 1 é uma fase de base sem requisito GAST próprio — seus critérios habilitam GAST-04, GAST-06 e GAST-08 (mapeados nas fases 2 e 3). QA-01 é herdada por todas as fases; QA-02 começa na Phase 1 (`parseBRL`, name-match) e é completada na Phase 3 (agregação).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Schema e Contratos de Despesas** - Modelo, chave natural, name-match e parse de dinheiro congelados e testados antes de qualquer dado entrar
- [ ] **Phase 2: Ingestão e Sincronização (CEAP/CEAPS)** - Bulk da Câmara + API CEAPS do Senado nos últimos 3 anos, com upsert idempotente, retenção, guardrails e sync sob lock
- [ ] **Phase 3: API de Despesas** - Rota `GET /api/parlamentares/[id]/despesas` com resumo e página do mesmo snapshot, envelope padrão
- [ ] **Phase 4: UI — Aba "Gastos"** - Aba no perfil com total anual, barras por categoria, lista paginada, comprovantes e estados honestos

## Phase Details

### Phase 1: Schema e Contratos de Despesas

**Goal**: Contrato de dados de despesas congelado e validado — schema Prisma, chave natural sem colisões, name-match que nunca inventa correspondência e conversão de dinheiro à prova de float, prontos para ingestão.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: QA-01, QA-02 — *fase de base: habilita GAST-04, GAST-06, GAST-08*
**Success Criteria** (what must be TRUE):

  1. Migração do modelo `Despesa` aplica limpa em Postgres com `Decimal(14,2)`, `@@unique` de `idExterno` com namespace por casa e índices `(parlamentarId, ano, data)` e `(casa, ano)`; `npx prisma migrate` + build passam
  2. Chave natural candidata passa no **teste de colisão zero** em fixture real de um ano inteiro da Câmara (~209k linhas) antes de o `@@unique` ser congelado — zero colisões, nunca `numDocumento` sozinho
  3. `parseBRL` e `camara-name-match` têm cobertura Jest (acentos, caixa, divergência partido/UF, ambiguidade → `null`); nenhum `parseFloat` em dado externo e nenhum fuzzy/Levenshtein no match (QA-02)
  4. Gate `npx tsc --noEmit && npx next lint && npx jest && npx next build` verde (QA-01)

**Plans**: 2/3 plans executed

Plans:

- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [ ] 01-03-PLAN.md

**Wave 1**

- [x] 01-01: Tracer da chave natural `despesa-id` + modelo `Despesa` + gate de colisão full-year + migração (checkpoint de decisão da chave, D-03 one-way)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-02: `parseBRL`, `parseDataFonte` e `ANOS_JANELA` em `src/lib/despesas.ts` (TDD)
- [ ] 01-03: `camara-name-match` (checkpoint id-first, D-06) e tipo `DespesaNormalizada` (D-08)

### Phase 2: Ingestão e Sincronização (CEAP/CEAPS)

**Goal**: Despesas dos últimos 3 anos das duas casas no banco, com ingestão resiliente, upsert que aplica correções do snapshot diário, retenção que nunca acumula anos velhos e sync que falha ruidosamente.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: GAST-04, GAST-05, GAST-08, OPS-01
**Success Criteria** (what must be TRUE):

  1. Backfill manual carrega 3 anos de Câmara (bulk `cotas/Ano-{ano}.json.zip` em streaming, nunca `JSON.parse`) e Senado (API CEAPS) sem OOM, com contagens e somas dentro das sanity gates
  2. Re-execução do job no mesmo dia não duplica linhas e aplica correções do snapshot diário (upsert em lote `ON CONFLICT DO UPDATE`)
  3. Após ingestão bem-sucedida, despesas fora da janela de 3 anos são apagadas em lotes — dirigidas pela mesma constante que alimenta o loop de importação; o banco nunca acumula importações passadas
  4. Job falha ruidosamente (exit ≠ 0) em arquivo inválido, taxa de unmatched acima do limite, match ambíguo ou contagem/soma fora da gate — com log de unmatched, nunca `catch` silencioso; taxa de name-match medida no primeiro backfill e limiar ajustado contra dado real (research flag)
  5. Syncs rodam sob advisory lock com timeout por step, e o gatilho duplicado das 03:00 UTC (Vercel cron × GH schedule) está corrigido **antes** de qualquer delete reativo existir — nenhuma execução concorrente

**Plans**: 3 plans

Plans:

- [ ] 02-01: Pipeline de download/streaming do bulk (`yauzl` + `stream-json@2.1.0`) e adapter CEAPS do Senado
- [ ] 02-02: Fase `--apenas-despesas` nos dois syncs: upsert em lotes, guardrails (GAST-08) e retenção de 3 anos (GAST-05)
- [ ] 02-03: Integração nos workflows: advisory lock + timeouts, correção do gatilho duplicado (OPS-01) e backfill manual de validação

### Phase 3: API de Despesas

**Goal**: Rota de leitura de despesas que serve resumo e página do mesmo snapshot, com o envelope de paginação idêntico às demais rotas do produto.
**Mode:** mvp
**Depends on**: Phase 1 (independente da Phase 2 — pode ser construída em paralelo; verificada contra as linhas do backfill quando elas chegarem)
**Requirements**: GAST-06 — *complementa QA-02 (agregação)*
**Success Criteria** (what must be TRUE):

  1. `GET /api/parlamentares/[id]/despesas?ano=&pagina=&limit=` responde 200 com envelope de paginação idêntico às demais rotas; 400 com detalhes em query inválida (zod) e 404 para parlamentar inexistente
  2. Resumo (total + por categoria) e a página de documentos vêm do **mesmo snapshot**: a soma das linhas exibidas bate com o total mostrado
  3. Total, percentuais por categoria e formatação vivem numa função pura em `src/lib/despesas.ts` com cobertura Jest (complementa QA-02)
  4. Rota lê exclusivamente do Postgres (nunca API do governo em tempo real), é `force-dynamic`, e o gate de verificação fica verde (QA-01)

**Plans**: 3 plans

Plans:

- [ ] 03-01: Rota `GET /api/parlamentares/[id]/despesas` com zod, `groupBy` de resumo e envelope de paginação
- [ ] 03-02: `src/lib/despesas.ts` — cálculo puro de total, % por categoria e formatação, com testes Jest
- [ ] 03-03: Consistência resumo × página (snapshot único) + gate de verificação

### Phase 4: UI — Aba "Gastos"

**Goal**: Cidadão abre o perfil de um parlamentar e responde "quanto gastou, com o quê e onde está o comprovante" — com estados que distinguem honestamente "não gastou" de "sync não rodou".
**Mode:** mvp
**Depends on**: Phase 3 (e dados da Phase 2)
**Requirements**: GAST-01, GAST-02, GAST-03, GAST-07, QA-03
**Success Criteria** (what must be TRUE):

  1. Usuário abre a aba "Gastos" do perfil e vê o total anual, troca o ano pelo seletor, e lê o breakdown por categoria em barras **e** tabela equivalente acessível, com valor absoluto e percentual (GAST-01)
  2. Usuário pagina pela lista de documentos do ano — data, categoria, fornecedor, valor — 20 por página, no mesmo padrão de paginação das demais abas (GAST-02)
  3. Usuário clica no comprovante oficial (abre em nova aba com `rel="noopener"`) e vê o link do dado oficial da fonte em cada linha; sem comprovante na fonte, vê "Não disponível" — nunca link quebrado fingindo existir (GAST-03)
  4. Estados são distinguíveis e honestos: loading, vazio ("não gastou"), sem dados de sync e erro — nunca um "0 gastos" enganoso — e a nota de limitações do dado fica visível junto do dado (GAST-07)
  5. Fluxo de gastos validado end-to-end com Playwright (total, barras, lista, links e estados) e gate de verificação verde (QA-03, QA-01)

**Plans**: 3 plans
**UI hint**: yes

Plans:

- [ ] 04-01: `despesas/page.tsx` + `DespesasTab.tsx` + registro da seção `despesas` no `ParlamentarHeader`
- [ ] 04-02: Seletor de ano, barras + tabela por categoria, lista paginada, links de comprovante/dado oficial, nota de limitações e estados
- [ ] 04-03: Playwright e2e do fluxo de gastos + gate de verificação

**Open product decision (Phase 4):** o CEAPS do Senado **não expõe** `urlDocumento` (verificado em JSON e CSV) — decidir se a aba renderiza apenas "dado oficial" para documentos do Senado ou se pesquisa uma URL de transparência por documento; a rota e a aba devem tolerar `urlDocumento = null`.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 (Phase 3 pode ser construída em paralelo com a Phase 2 após a Phase 1)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema e Contratos de Despesas | 2/3 | In Progress|  |
| 2. Ingestão e Sincronização (CEAP/CEAPS) | 0/3 | Not started | - |
| 3. API de Despesas | 0/3 | Not started | - |
| 4. UI — Aba "Gastos" | 0/3 | Not started | - |
