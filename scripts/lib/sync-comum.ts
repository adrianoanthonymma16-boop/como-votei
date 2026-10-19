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
  apenasParlamentares?: boolean;
  apenasVotacoes?: boolean;
  apenasDiscursos?: boolean;
  apenasProposicoes?: boolean;
  apenasFrequencia?: boolean;
  debug?: boolean;
}

/** Lê os argumentos `--ano=`, `--apenas-*` e `--debug` da linha de comando. */
export function parseSyncArgs(argv: string[]): SyncOptions {
  const options: SyncOptions = {};
  for (const arg of argv) {
    if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1]);
    if (arg === '--apenas-parlamentares') options.apenasParlamentares = true;
    if (arg === '--apenas-votacoes') options.apenasVotacoes = true;
    if (arg === '--apenas-discursos') options.apenasDiscursos = true;
    if (arg === '--apenas-proposicoes') options.apenasProposicoes = true;
    if (arg === '--apenas-frequencia') options.apenasFrequencia = true;
    if (arg === '--debug') options.debug = true;
  }
  return options;
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
