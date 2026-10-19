/**
 * Utilitários compartilhados pelos scripts de sync (Câmara e Senado):
 * parsing de CLI, seleção de fases e resumo final.
 *
 * Antes, cada script repetia integralmente o mesmo bloco de argumentos, o
 * mesmo seletor de fases e o mesmo resumo — qualquer ajuste exigia mudar os
 * dois em sincronia. Aqui fica a fonte única.
 */
import type { SyncStats } from '../../src/lib/sync/types';

export interface SyncOptions {
  ano?: number;
  /** Índice inicial (0-based) na lista de parlamentares ativos — retomada por faixa. */
  offset?: number;
  /** Quantidade máxima de parlamentares a processar a partir do offset. */
  limite?: number;
  /**
   * Usa os arquivos JSON em lote da Câmara para proposições e votações.
   * Troca O(deputados × proposições) requests por 5 downloads por ano.
   */
  bulk?: boolean;
  apenasParlamentares?: boolean;
  apenasVotacoes?: boolean;
  apenasDiscursos?: boolean;
  apenasProposicoes?: boolean;
  apenasFrequencia?: boolean;
  debug?: boolean;
}

/** Lê os argumentos `--ano=`, `--offset=`, `--limite=`, `--apenas-*`, `--bulk` e `--debug`. */
export function parseSyncArgs(argv: string[]): SyncOptions {
  const options: SyncOptions = {};
  for (const arg of argv) {
    if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--offset=')) options.offset = parseInt(arg.split('=')[1]);
    if (arg.startsWith('--limite=')) options.limite = parseInt(arg.split('=')[1]);
    if (arg === '--apenas-parlamentares') options.apenasParlamentares = true;
    if (arg === '--apenas-votacoes') options.apenasVotacoes = true;
    if (arg === '--apenas-discursos') options.apenasDiscursos = true;
    if (arg === '--apenas-proposicoes') options.apenasProposicoes = true;
    if (arg === '--apenas-frequencia') options.apenasFrequencia = true;
    if (arg === '--bulk') options.bulk = true;
    if (arg === '--debug') options.debug = true;
  }
  return options;
}

/**
 * Recorta a lista de parlamentares para a faixa pedida (`--offset`/`--limite`).
 *
 * Motivo: as fases por parlamentar (proposições, discursos, frequência) gastam
 * vários requests por item e passam do teto de 6h do runner do GitHub Actions
 * quando rodam sobre os 513 deputados. A faixa permite quebrar o mesmo ano em
 * vários jobs retomáveis, sem repetir o que já foi feito (upserts idempotentes).
 *
 * `offset` e `limite` inválidos (negativos/NaN) são ignorados.
 */
export function aplicarFaixa<T>(lista: T[], options: SyncOptions): T[] {
  const offset = Number.isFinite(options.offset) && (options.offset as number) > 0 ? (options.offset as number) : 0;
  const limite =
    Number.isFinite(options.limite) && (options.limite as number) > 0 ? (options.limite as number) : undefined;
  return limite === undefined ? lista.slice(offset) : lista.slice(offset, offset + limite);
}

/** Descreve a faixa em uso, para o log do sync. */
export function descreverFaixa(total: number, selecionados: number, options: SyncOptions): string {
  if (options.offset === undefined && options.limite === undefined) return `${selecionados}/${total}`;
  const inicio = options.offset ?? 0;
  return `${selecionados}/${total} (offset ${inicio}, limite ${options.limite ?? '∞'})`;
}

/**
 * Regra das fases: sem nenhum `--apenas-*`, sincroniza tudo; com um ou mais,
 * sincroniza somente os marcados.
 */
export function criarSeletorDeFases(options: SyncOptions): (flag?: boolean) => boolean {
  const hasOnly = [
    options.apenasParlamentares,
    options.apenasVotacoes,
    options.apenasDiscursos,
    options.apenasProposicoes,
    options.apenasFrequencia,
  ].some(Boolean);
  return (flag?: boolean) => !hasOnly || !!flag;
}

/** Cabeçalho padrão do sync. */
export function imprimirCabecalho(casa: string, ano: number): void {
  console.log(`\n🏛️  INICIANDO SYNC ${casa} - Ano ${ano}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('='.repeat(60));
}

/** Resumo final padrão (tempo + contadores por entidade). */
export function imprimirResumo(casa: string, stats: SyncStats, startTime: number): void {
  const tempoTotal = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESUMO DO SYNC ${casa}`);
  console.log('='.repeat(60));
  console.log(`⏱️  Tempo total: ${tempoTotal} min`);
  console.log(`👥 Parlamentares: ${stats.parlamentares}`);
  console.log(`🗳️  Votações: ${stats.votacoes} | Votos: ${stats.votos}`);
  console.log(`🎤 Discursos: ${stats.discursos}`);
  console.log(`📋 Proposições: ${stats.proposicoes} | Tramitações: ${stats.tramitacoes}`);
  console.log(`📅 Frequências: ${stats.frequencias}`);
  console.log(`\n✅ Sync ${casa} concluído em ${tempoTotal} min`);
}
