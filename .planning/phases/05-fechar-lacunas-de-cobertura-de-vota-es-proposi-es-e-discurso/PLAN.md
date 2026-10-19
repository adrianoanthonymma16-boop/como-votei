Phase 05 — Cobertura de dados (votações, votos, proposições, discursos)

Plan ID: 05-01
Objective: Relatório de cobertura por casa/ano/dataset com gate de lacuna real

Tasks:
  [T-05-01-1] scripts/lib/coverage.ts — lógica pura (chaveCelula, variacaoPercentual,
    statusCelula, montarRelatorio, variacoesSuspeitas, LACUNAS documentadas)
  [T-05-01-2] scripts/coverage.ts — contagens SQL por casa/ano/dataset + nominais órfãs
    + bloco de emendas (total, % com autor, localidade sem UF)
  [T-05-01-3] Testes Jest de coverage.ts; sair ≠ 0 quando dataset com fonte está zerado
    ou quando >15 nominais sem votos

Definition of Done:
  - `npm run coverage` imprime todas as células 2024–2026 das duas casas
  - Lacuna sem evidência reprova; lacuna comprovada fica "documentada" com motivo
  - Gate verde

Plan ID: 05-02
Objective: Fechar os gaps reais de ingestão das duas casas na janela de 3 anos

Tasks:
  [T-05-02-1] Bug estrutural do sync de votos do Senado: `fetchVotacoesAnoSenado(ano)`
    (1 request/ano devolve todas as votações + todos os votos) substitui o loop
    85 senadores × N votações; `mapTipoVotoSenado` exportada; `MIS` → MISSAO
  [T-05-02-2] Novo enum `VOTOU` (voto registrado sem direção divulgada) + migração
    20261019120000_add_votou_enum; `TIPOS_PRESENCA` inclui VOTOU; alinhamento exclui
  [T-05-02-3] `upsertVotosEmLote` (INSERT ... ON CONFLICT, lotes de 1000) +
    `retentar()` (P1017/P1001/P1002/P2024) + try/catch por parlamentar
  [T-05-02-4] Backfill de votos órfãos da Câmara (`backfill-votos-faltantes.ts`)
  [T-05-02-5] Senado discursos 2024; Câmara discursos 2025/2026; Senado proposições
    2024/2026

Definition of Done:
  - Senado votos 2024/2025/2026 > 0 (6.952 / 9.656 / 4.926)
  - Câmara discursos 2026 > 0; Senado proposições 2024/2026 > 0
  - Nominais sem votos ≤ 15
  - Gate verde

Plan ID: 05-03
Objective: Estado honesto "sem dados oficiais" na UI onde a fonte não publica

Tasks:
  [T-05-03-1] Confirmar que votações/proposições/discursos distinguem "sem dados
    oficiais" de "nenhum registro" (padrão `semDadosOficiais` já existente)
  [T-05-03-2] Registrar em 05-GAPS.md somente lacunas com evidência de fonte
  [T-05-03-3] Gate: tsc --noEmit && next lint && jest && next build

Definition of Done:
  - Nenhum "0" enganoso apresentado ao usuário
  - 05-GAPS.md lista apenas lacunas comprovadas
  - Gate verde
