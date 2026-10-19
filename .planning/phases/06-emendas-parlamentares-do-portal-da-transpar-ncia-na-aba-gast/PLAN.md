Phase 06 — Emendas parlamentares (Portal da Transparência) na aba Gastos

Fonte: GET https://api.portaldatransparencia.gov.br/api-de-dados/emendas?ano=YYYY&pagina=N
Header: chave-api-dados: $PORTAL_API_KEY · 15 registros/página, sem total informado.

Plan ID: 06-01
Objective: Contrato de dados de emendas congelado — schema, parser de localidade e aliases

Tasks:
  [T-06-01-1] `src/lib/ufs.ts` — fonte única das 27 UFs (reuso pelo seed e pelo parser)
  [T-06-01-2] Modelo `Emenda` em prisma/schema.prisma + migração
    20261019130000_add_emenda (aplicada) + relação `Parlamentar.emendas`
  [T-06-01-3] `src/lib/emendas.ts` (TDD): parseLocalidadeGasto (Município - UF /
    Estado (UF) / Nacional / Múltiplo / Exterior), urlEmenda, totalizarEmendas,
    agruparPorFuncao, agruparPorLocalidade, valoresDaEmenda
  [T-06-01-4] `src/lib/emendas-match.ts` (TDD): match exato por nome normalizado,
    sufixo entre parênteses descartado, ambiguidade → null, aliases curados

Definition of Done:
  - Migração aplica limpa; parser e match com cobertura Jest (nunca fuzzy)
  - Aceita valores negativos com espaço ("- 37.729,24") e Decimal do Prisma

Plan ID: 06-02
Objective: Sync de emendas com backfill de 3 anos, retenção e step diário

Tasks:
  [T-06-02-1] `scripts/sync-emendas.ts --ano=YYYY --apenas-emendas` — paginação até
    a primeira página vazia, upsert em lote por codigoEmenda, retenção 3 anos,
    log de autores sem match
  [T-06-02-2] `emendas` em ESPEC_GC (retenção) + npm run sync:emendas
  [T-06-02-3] `.github/workflows/sync-emendas.yml` — cron 05:00 UTC + dispatch com
    `--ano`, secret PORTAL_API_KEY, guardrail (total > 0, match > 50%,
    localidade não parseada ≤ 20%)
  [T-06-02-4] Backfill 2024–2026

Definition of Done:
  - 2024/2025/2026 ingeridos, match de autoria > 90%
  - Re-execução idempotente; anos fora da janela removidos
  - Guardrail do workflow passa

Plan ID: 06-03
Objective: Rota de leitura de emendas no envelope padrão

Tasks:
  [T-06-03-1] `GET /api/parlamentares/[id]/emendas` — zod (400), 404, force-dynamic,
    meta com anos, funções, total, porFuncao, porLocalidade, semDadosOficiais

Definition of Done:
  - Quebras (total/porFuncao/porLocalidade) são o retrato do ano; `funcao` filtra a lista
  - Gate verde

Plan ID: 06-04
Objective: Bloco de emendas na aba Gastos + e2e

Tasks:
  [T-06-04-1] `EmendasBlock.tsx` — total separado da cota, pago em destaque +
    empenhado ao lado, top funções e top localidades em barras, lista paginada com
    link para o Portal, filtros ano + função, estados honestos
  [T-06-04-2] Integração no `GastoTab.tsx`
  [T-06-04-3] e2e `e2e/emendas-gastos.spec.ts`
  [T-06-04-4] Gate: tsc --noEmit && next lint && jest && next build

Definition of Done:
  - Cidadão vê pago/empenhado e verifica cada emenda no Portal
  - Sem dados → "sem dados oficiais"; nunca estimativa
  - Gate verde
