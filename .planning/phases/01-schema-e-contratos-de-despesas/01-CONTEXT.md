# Phase 1: Schema e Contratos de Despesas - Context

**Gathered:** 2026-10-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Congelar o contrato de dados do módulo de despesas ANTES de qualquer linha no banco: model Prisma `Despesa` + migração (Decimal money, chave natural namespaced, índices), tipo `DespesaNormalizada`, helpers puros de conversão (dinheiro/datas) e o name-match da Câmara — tudo testado e com o gate `tsc && lint && jest && build` verde. Não ingere dados, não expõe rota, não cria UI nesta fase.

</domain>

<decisions>
## Implementation Decisions

### Campos do schema (orçamento de storage)
- **D-01:** Guardar somente colunas mostradas pela UI + audit: `idExterno` (namespaced), `parlamentarId`, `ano`, `mes`, `data`, `categoria` (label original da fonte), `fornecedor`, `cpfCnpj`, `documento` (número/tipo), `valor` (`Decimal(14,2)`, signed), `valorGlosa?`, `urlDocumento?`, `casa`, `nomeParlamentarRaw` (audit do match), `importedAt`. **DROP `detalhamento`** (texto livre Senado ~1 KB × ~71k linhas, não mostrado na UI) e qualquer coluna sem consumo previsto — Neon free é 0.5 GB com write-block. — **Reversibility:** costly — adicionar coluna depois exige re-import dos ~670k documentos pra popular; remover depois exige migration + perda de dado
- **D-02:** Sem colunas agregadas nem tabela de resumo — compute-on-read (decisão de produto já travada no PROJECT.md)

### Chave natural e namespacing
- **D-03:** Chave = `idDocumento` da Câmara e `id` do Senado, guardada como `idExterno` **namespaced** (`CAMARA:7877589` / `SENADO:12345`) com `@@unique` global. **Gate obrigatório antes do freeze da migração:** teste de colisão zero numa fixture real de 1 ano da Câmara (o spec oficial avisa que o bulk não segue convenções do portal; `numDocumento` sozinho NÃO é único — original + estorno compartilham); se colidir, cair para `@@unique([casa, idExterno])`. — **Reversibility:** one-way — trocar a chave depois exige re-import, reescrita de índices e reprocessamento da retenção
- **D-04:** `importedAt` (não `updatedAt` de UI) marca a última escrita — suporte à retenção/reconciliação futura

### Categorias entre casas
- **D-05:** Manter o **label original da fonte** (Câmara `descricao`/subcota, Senado `tipoDespesa`) como string livre — **sem enum unificado e sem tabela de mapeamento**. Cada parlamentar pertence a uma casa só, então a UI agrupa por label vindo da rota; fiel à fonte, zero perda, zero distorção de tradução. — **Reversibility:** costly — normalizar depois exige migration de dados sobre 670k linhas

### Contratos puros (testáveis sem DB)
- **D-06:** `src/lib/sync/camara-name-match.ts` — função pura: normaliza nome (minúsculas, sem acentos, espaços colapsados), **bloqueia por nome + UF**, partido é apenas desempate (nunca predicado obrigatório — troca de partido no meio do mandato é rotina), **match exato (nunca fuzzy/Levenshtein)**, **ambiguidade → `null`** (nunca inventa correspondência). Retorna `{ parlamentarId, metodo } | null`. Testes com fixtures reais: partido divergente, acentos, caixa, homônimos. — **Reversibility:** reversible
- **D-07:** `parseBRL` defensivo em `src/lib/` — aceita string `"1.234,56"` e number da API, **nunca `parseFloat` de locale externo**, devolve string pronta pro `new Prisma.Decimal(...)`; valores **signed** (estornos negativos preservados). Helper de datas: ISO da Câmara / formato Senado → `Date`, com teste. — **Reversibility:** reversible
- **D-08:** `DespesaNormalizada` em `src/lib/sync/types.ts` segue o padrão existente (plain interface + unions espelhando enums Prisma); adapters continuam **DB-free** (invariante do codebase)

### the agent's Discretion
- Local exato das constantes compartilhadas (`ANOS_JANELA`) entre `scripts/` e `src/lib/` — planner decide seguindo o padrão de constantes exportadas do módulo que as possui
- Tamanho de batch do upsert (500–1000, todos seguros sob o cap de 65.535 params) — planner pode parametrizar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` § Phase 1 — goal, success criteria (gate de colisão zero, fixtures de name-match)
- `.planning/REQUIREMENTS.md` — GAST-04, GAST-06, GAST-08, QA-01, QA-02 (traceability)
- `.planning/PROJECT.md` — Key Decisions (A enxuta, retenção 3 anos, fontes) e Constraints (free tier, verificação)

### Pesquisa (já feita — não re-researchar)
- `.planning/research/SUMMARY.md` — síntese: stack, upsert, name-match, gates
- `.planning/research/STACK.md` — `yauzl@3.4.0`, `stream-json@2.1.0` (pin 2.x CJS), `Decimal @db.Decimal(14,2)`, batched `INSERT … ON CONFLICT DO UPDATE`
- `.planning/research/PITFALLS.md` — pitfalls 2 (money), 3 (chave natural), 4 (name-match), 5 (constante de ano)
- `.planning/research/ARCHITECTURE.md` — bordas de componentes e fluxo de dados

### Padrões do codebase existente
- `.planning/codebase/STACK.md` — Prisma ^5.12, ts-node CommonJS, Jest + ts-jest
- `.planning/codebase/ARCHITECTURE.md` — camada adapter DB-free, scripts com flags `--apenas-*`, pure compute em `src/lib/`
- `.planning/codebase/INTEGRATIONS.md` — fontes Câmara/Senado já consumidas, `SENADO_ADM_BASE` declarado mas não usado (linha 26)
- `prisma/schema.prisma` — convenções: snake_case `@map`, `@@index`, enums
- `src/lib/sync/types.ts` — padrão de contratos `*Normalizado`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/sync/types.ts`: adicionar `DespesaNormalizada` ao lado dos `*Normalizado` existentes
- `src/lib/sync/senado-adapter.ts:21`: `SENADO_ADM_BASE = https://adm.senado.gov.br/adm-dadosabertos/api/v1` já declarado (nunca usado) — base exata da API CEAPS
- `src/lib/prisma.ts`: singleton reaproveitado pelos scripts de sync
- Padrão `upsert` keyed em `idExterno` (`scripts/sync-camara.ts`) — o upsert raw de despesas substitui `createMany` mas mantém a semântica idempotente

### Established Patterns
- Adapters são puros (sem Prisma) e testáveis sem DB; persistência mora nos `scripts/`
- Testes unitários em `src/lib/__tests__/<mod>.test.ts` importando via `@/lib/<mod>`
- Schema com `@map` snake_case, `@@index`, `Decimal` para dinheiro (novo neste model)
- Gate de verificação: `npx tsc --noEmit && npx next lint && npx jest && npx next build`

### Integration Points
- `prisma/schema.prisma` + `prisma/migrations/` — novo model `Despesa`
- `src/lib/sync/camara-adapter.ts` / `senado-adapter.ts` — hooks `fetchDespesas(ano)` futuros (Phase 2)
- `scripts/sync-*.ts` — fase `--apenas-despesas` futura (Phase 2); Phase 1 só entrega os contratos

</code_context>

<specifics>
## Specific Ideas

- **Research flag obrigatório desta fase:** baixar 1 ano real da Câmara (bulk `cotas/Ano-2025.json.zip`) e provar **colisão zero** da chave natural candidata antes de congelar o `@@unique` — o spec oficial avisa que o bulk não segue as convenções do portal
- Coluna `nomeParlamentarRaw` existe por causa do Core Value: auditoria de "quem foi casado com quem" quando a taxa de match for questionada
- Valores signed: estornos/restituições da fonte são negativos e devem continuar negativos em tela e em soma

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope (captura automática em modo --auto; ingestão, rota e UI pertencem às fases 2–4)

</deferred>

---

*Phase: 1-Schema e Contratos de Despesas*
*Context gathered: 2026-10-09*
