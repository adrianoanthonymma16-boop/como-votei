# Como Votei

## What This Is

Ferramenta de transparência legislativa gratuita e pública que permite analisar como deputados e senadores brasileiros atuam no Congresso: como votam, quais discursos fazem e quais leis propõem. Produto 100% open (sem login/cadastro), focado nos últimos 3 anos de dados, para qualquer cidadão que queira conferir o comportamento do seu representante.

## Core Value

Dar visibilidade pública e gratuita ao comportamento parlamentar — se o dado oficial de uma votação, discurso ou proposição não estiver acessível e verificável aqui, o produto falhou.

## Requirements

### Validated

<!-- Inferidas do codebase em produção (2026-10-09) -->

- ✓ Sync de deputados e senadores com partido/UF (Câmara + Senado, upsert diário via GH Actions) — v1
- ✓ Votações nominais + votos individuais + % de alinhamento partidário (views agregadas) — v1
- ✓ Discursos como metadados/resumo com proxy de texto completo sob demanda — v1
- ✓ Proposições de autoria + tramitação — v1
- ✓ Frequência/presença em plenário por ano (scraping Câmara + API Senado, anos no dashboard) — v1
- ✓ Página `/parlamentares` com filtros + detalhe com tabs (Votações, Discursos, Proposições, Produtividade, Presença) — v1
- ✓ Busca unificada, ranking de produtivos, filtro anual reutilizável — v1
- ✓ API Routes com paginação + deploy automático Vercel + CI verde — v1

### Active

- [ ] **GAST-01**: Usuário vê na aba "Gastos" do perfil o total anual e o resumo por categoria de despesa (barras), com seletor de ano
- [ ] **GAST-02**: Usuário vê a lista de documentos de despesa (data, categoria, fornecedor, valor) do parlamentar no ano selecionado, paginada
- [ ] **GAST-03**: Cada gasto exibe **link para o comprovante oficial** (`urlDocumento` → PDF da fonte) e **link para o dado oficial** da fonte
- [ ] **GAST-04**: Sync de despesas da Câmara (bulk `cotas/Ano-{ano}.json.zip`) e do Senado (API CEAPS) para os últimos 3 anos, com upsert idempotente
- [ ] **GAST-05**: Retenção: o banco não guarda importações passadas indefinidamente — despesas fora da janela de 3 anos são apagadas no sync
- [ ] **GAST-06**: Rota `GET /api/parlamentares/[id]/despesas` com filtro de ano e paginação, mesmo padrão das demais rotas

### Out of Scope

- Login/favoritos/alertas — produto é público e sem estado de usuário (v1)
- Legislaturas anteriores à janela de 3 anos — escopo do produto é recorte de 3 anos
- Sumarização LLM de gastos/descriscrição de documentos — custo, avaliar depois
- Gastos de gabinete/servidores, diárias e passagens fora da cota CEAP/CEAPS — fontes diferentes, escopo da cota parlamentar
- Comparação/ranking de gastos entre parlamentares — estatística derivada, futura
- Guardar agregados pré-computados (ano×categoria) — a UI agrega a partir dos documentos
- App mobile, API pública para terceiros, dashboard analítico avançado — backlog v1 do ROADMAP

## Context

- **Brownfield em produção**: Next.js 14 (App Router) + TypeScript + Prisma + Vercel Postgres (Neon) + Tailwind; deploy automático via Git na Vercel; sync diário por GitHub Actions (`sync-camara.yml` 03:00 UTC, `sync-senado.yml` 04:00 UTC). Sem `VERCEL_TOKEN`.
- **Codebase map**: `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS — 2026-10-09).
- **Banco**: 84 MB de 500 MB (Neon free). Maiores tabelas: votos 29 MB, discursos 19 MB, proposições 17 MB.
- **Fontes de despesas (pesquisadas em 09/10/2026)**:
  - Câmara: REST `/deputados/{id}/despesas` está **morto** (retorna `dados: []`); fonte real = bulk `https://www.camara.leg.br/cotas/Ano-{ano}.json.zip` (209.080 reg. em 2025, JSON 225 MB, atualização diária, desde 2008).
  - Senado: `GET https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}` (23.808 reg. em 2025, 10 MB, JSON/CSV, sem chave). API `legis.senado.leg.br` não tem endpoints de gastos.
- **Mapeamento de IDs**: Senado `codSenador` = `idExterno` já usado (match direto); Câmara não expõe o id do dadosabertos no bulk (`numeroDeputadoID` é outro namespace) → match por `nomeParlamentar` + `siglaPartido` + `siglaUF` normalizados, com log de unmatched (nunca inventar correspondência).
- **Lacuna de dados conhecida**: atividade de 2025 (votações/discursos/proposições) pendente de sync — workflows em andamento; não bloqueia gastos.
- **Fixes recentes**: mensagens de "0 votos" (fila de sync vs fonte sem votos) e presença em plenário (label + anos do dashboard) — commits `660f01f`, `5873877`.
- **ROADMAP.md raiz**: 5 fases originais do v1.0 praticamente concluídas (Marco Zero); este milestone é a frente de gastos.

## Constraints

- **Tech stack**: Next.js 14 + Prisma + PostgreSQL (Neon) — já em produção, sem trocar
- **Budget/tier**: 100% ferramentas gratuitas — Neon 0.5 GB, Vercel free, GH Actions free; schema de despesas precisa caber no orçamento (~+160 MB na A enxuta)
- **Fontes oficiais**: sem chave de API; bulk da Câmara pode falhar/estar indisponível — sync deve ser resiliente e retomável
- **Retenção**: dados de despesas seguem janela de 3 anos (junto com o escopo do produto); não acumular importações passadas
- **Compatibilidade**: normalização Câmara≠Senado — schemas distintos precisam de camada de adaptação (mesma exigência dos demais módulos)
- **Verificação**: `npx tsc --noEmit`, `npx next lint`, `npx jest` (93+ specs), `npx next build`, e2e Playwright — tudo verde antes de commit/push

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Granularidade **A enxuta** (documento a documento) para despesas | Usuário exige comprovante clicável (`urlDocumento`); só a granularidade de documento guarda o PDF — agregado C não entrega | — Pending (cabe: 84+160≈244/500 MB) |
| Retenção de 3 anos com limpeza de importações passadas | Banco free tier não pode crescer indefinidamente; coerente com recorte de 3 anos do produto | — Pending |
| Fonte Câmara = bulk `cotas/Ano-{ano}.json.zip` | REST de despesas está morta (`dados: []`); bulk é fonte canônica diária oficial | ✓ Good (verificado 09/10/2026) |
| Fonte Senado = API CEAPS (`adm.senado.gov.br`) | Única API oficial de gastos por senador; `legis.senado.leg.br` não tem endpoints de gastos | ✓ Good (verificado 09/10/2026) |
| Mapeamento Câmara por nome (partido+UF), Senado por `codSenador` | Bulk da Câmara não traz o id do dadosabertos; nunca inventar correspondência — unmatched é logado e pulado | — Pending |
| Escopo do milestone: só feature de gastos | Usuário escolheu escopo enxuto (pendências do ROADMAP v1: backup, rate limit, logging — ficam para depois) | ✓ Good |
| Workflows GH Actions sem `NODE_ENV=production` | `npm ci` precisava de devDependencies (ts-node); já corrigido e validado | ✓ Good |

---

*Last updated: 2026-10-09 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
