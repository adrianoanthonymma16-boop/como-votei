# ROADMAP — Como Votei

## Visão Geral
Ferramenta de transparência legislativa: votações, discursos e proposições de deputados e senadores (últimos 3 anos). Stack: Next.js + Prisma + Vercel Postgres (Neon free tier). Sync via GitHub Actions + Vercel Cron.

---

## FASES

### Fase 1: Infraestrutura + Sync Câmara (Semanas 1-2)
**Objetivo**: Projeto Next.js rodando, Prisma migrado, sync da Câmara funcional

| Ticket | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| 1.1 | `npx create-next-app@latest` com TypeScript, App Router, Tailwind, ESLint, Prettier | `npm run dev` sobe local, `npm run build` passa |
| 1.2 | Configurar Prisma + `schema.prisma` (já criado) + seed (partidos/UFs) | `npx prisma migrate dev` cria tabelas, `npx prisma db seed` popula referência |
| 1.3 | Setup Vercel Postgres (Neon) + `DATABASE_URL` no `.env` | Conexão funciona, `prisma studio` abre |
| 1.4 | Adapter `CamaraNormalizer` + tipos unificados | Transforma resposta da API Câmara → modelo Prisma |
| 1.5 | Sync job: busca deputados atuais (últimos 3 anos) + upsert no banco | 513 deputados persistidos com partido/UF corretos |
| 1.6 | Sync job: busca votações nominais (últimos 3 anos) + upsert | ~10k votações + votos persistidos |
| 1.7 | GitHub Action: `sync-camara.yml` (diário 03:00 UTC) | Action roda, logs mostram upserts, 0 erros |
| 1.8 | API Route: `GET /api/parlamentares` (listagem paginada, filtros casa/partido/uf) | Retorna 20 itens, cursor-based, filtros funcionam |

**Definição de Pronto**: `npm run build` passa, sync Câmara roda no GitHub Actions, API lista parlamentares.

---

### Fase 2: Sync Senado + Normalização Unificada (Semanas 3-4)
**Objetivo**: Dados do Senado no mesmo schema, factory de normalizadores

| Ticket | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| 2.1 | Adapter `SenadoNormalizer` (XML/JSON → modelo unificado) | Mesmo shape de saída que `CamaraNormalizer` |
| 2.2 | `NormalizerFactory.create(house)` + testes unitários | Factory retorna adapter correto, 100% coverage |
| 2.3 | Sync job: senadores atuais + upsert | 81 senadores persistidos |
| 2.4 | Sync job: votações Senado (últimos 3 anos) + upsert | Votos nominais persistidos |
| 2.5 | Sync job: proposições Senado (autoria) + tramitações | Proposições + tramitações persistidas |
| 2.6 | GitHub Action: `sync-senado.yml` (diário 04:00 UTC) | Action roda independentemente da Câmara |
| 2.7 | Métrica "dados desatualizados por fonte" (log JSON) | Log mostra `source: "senado", lastSync: ISO, records: N` |

**Definição de Pronto**: Câmara + Senado sincronizados, factory testada, actions independentes.

---

### Fase 3: API Completa + Discursos + Proposições (Semanas 5-6)
**Objetivo**: Todas as API Routes funcionais, discursos (metadados) e proposições

| Ticket | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| 3.1 | Sync discursos Câmara + Senado (metadados + resumo + url_original) | Textos completos NÃO no banco |
| 3.2 | Proxy route: `GET /api/discursos/[id]/full` → fetch API gov + cache 1h | Retorna texto completo, não estoura Postgres |
| 3.3 | Heurística categorização temática (keywords JSON) aplicada no sync | `tema` preenchido em votacoes/discursos/proposicoes |
| 3.4 | API Routes: `/parlamentares/[id]/votos`, `/discursos`, `/proposicoes` | Paginação cursor, filtros data/tema, ISR 1h |
| 3.5 | API Route: `/votacoes/[id]/alinhamento` (agregado por partido) | Usa view `alinhamento_partidario_partido` |
| 3.6 | API Route: `/busca?q=` (search unificado parlamentar) | Busca por nome/CPF, debounce 300ms |
| 3.7 | API Route: `/stats/visao-geral` (contadores p/ dashboard) | Total parlamentares, votações, discursos, proposições |

**Definição de Pronto**: Todas as rotas respondem <500ms (P95), ISR funcionando, busca funciona.

---

### Fase 4: Frontend MVP (Semanas 7-9)
**Objetivo**: UI funcional, acessível, responsiva

| Ticket | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| 4.1 | Design System: tokens (cores, spacing, tipografia), componentes base (Button, Card, Table, Badge, Select, Pagination, Skeleton) | Storybook ou página `/design-system` documenta tudo |
| 4.2 | Página `/` (Home): hero + stats + busca rápida | Carrega <2s, LCP <2.5s |
| 4.3 | Página `/parlamentares` (lista): tabela paginada, filtros laterais (casa, partido, UF, legislatura), URL shareable | Filtros combinam, paginação cursor, 60fps scroll |
| 4.4 | Página `/parlamentares/[id]` (detalhe): header + 3 tabs (Votos, Discursos, Proposições) | Tabs lazy-load, skeleton enquanto carrega |
| 4.5 | Tab Votos: tabela (data, tema, votacao, voto, alinhamento partidário %), filtro tema/data | % alinhamento vem da view, ordenação por data |
| 4.6 | Tab Discursos: cards (data, tipo, tema, resumo, link "ler na íntegra") | Link abre proxy route, texto completo carrega |
| 4.7 | Tab Proposições: cards (tipo, número/ano, ementa, status, tema, link tramitação) | Status com badge colorido, tramitação expansível |
| 4.8 | Acessibilidade: WCAG AA, navegação teclado, ARIA labels, contraste | `axe-core` 0 violations críticas |
| 4.9 | SEO: sitemap.xml, robots.txt, meta tags, Open Graph, JSON-LD (Person) | Lighthouse SEO 100 |

**Definição de Pronto**: Build de produção deployado na Vercel, todas as páginas funcionais, Lighthouse >90.

---

### Fase 5: Polish + Deploy + Observabilidade (Semana 10)
**Objetivo**: Produção estável, monitorada, documentada

| Ticket | Descrição | Critério de Aceite |
|--------|-----------|-------------------|
| 5.1 | Vercel Cron: `/api/cron/sync-incremental` (horário) chama GitHub Actions via `workflow_dispatch` | Cron executa, actions disparam, logs correlacionados |
| 5.2 | Error boundary + logging estruturado (pino) + Vercel Logs | Erros não quebram UI, logs searcháveis |
| 5.3 | Rate limit / bot protection (Vercel Bot Management free) | Bots bloqueados, usuários reais passam |
| 5.4 | Documentação: `README.md` (setup, sync, deploy), `ARCHITECTURE.md` (fluxo dados), `CONTRIBUTING.md` | Novato roda local em <15min |
| 5.5 | Smoke tests Playwright: home → busca → detalhe → 3 tabs | CI passa, 0 flakiness |
| 5.6 | Backup strategy: `pg_dump` semanal via GitHub Action → artifact | Restore testado 1x |

**Definição de Pronto**: Produção no ar em `comovotei.vercel.app`, monitoramento ativo, docs completas.

---

## MARCO ZERO (v1.0)
- ✅ Câmara + Senado sincronizados (últimos 3 anos)
- ✅ API completa + ISR
- ✅ Frontend: lista, detalhe (3 tabs), busca, stats
- ✅ Deploy Vercel + GitHub Actions sync diário
- ✅ Lighthouse >90, WCAG AA, 0 vulnerabilities `npm audit`

---

## FORA DO ESCOPO v1 (Backlog)
- Login / favoritos / alertas
- Legislaturas anteriores a 3 anos
- Sumarização LLM de discursos
- App mobile (PWA depois)
- API pública para terceiros
- Dashboard analítico avançado (gráficos de alinhamento temporal)