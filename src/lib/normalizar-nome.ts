/**
 * Normalização canônica de nome parlamentar para match exato.
 *
 * Maiúsculas, sem acento colapsando o caractere (NFD + strip), espaços
 * reduzidos e trim. É a mesma regra usada pelo match de despesas da Câmara —
 * aqui isolada para reuso por emendas, sem depender de nenhum módulo de sync.
 */
export function normalizarNome(nome: unknown): string {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}
