/**
 * Match exato de despesa da Câmara para parlamentar do diretório.
 * Nunca similaridade aproximada; ambiguidade → null; diretório é argumento puro.
 *
 * Ordem de resolução (Option A — id-first com fallback nome+UF):
 * 1. idDeputado → porIdExterno (metodo: 'idExterno')
 *    O espaço de id é `Parlamentar.idExterno` (string) — NUNCA `numeroDeputadoID`.
 * 2. Rejeita linhas de liderança/vazias (uf 'NA', uf vazio, nome vazio → null)
 * 3. Chave exata `${nomeNormalizado}|${ufNormalizado}` em porNomeUf:
 *    - 0 candidatos → null
 *    - 1 candidato → match (metodo: 'nomeUf')
 *    - ≥2 candidatos → desempate exato por partidoSigla via partidosPorId (senão null)
 *
 * Retorna `ResultadoMatch` com `metodo` para auditoria (alimenta `nomeParlamentarRaw`, D-01).
 */

export type ResultadoMatch =
  | { parlamentarId: string; metodo: 'idExterno' | 'nomeUf' }
  | null;

export interface DiretorioParlamentares {
  porIdExterno: Record<string, string>;        // idExterno (string) → parlamentarId
  porNomeUf: Record<string, string[]>;         // `${nomeNormalizado}|${ufNormalizado}` → parlamentarId[]
  partidosPorId: Record<string, string>;       // parlamentarId → partidoSigla
}

export interface EntradaMatch {
  idDeputado?: number | string;
  nomeParlamentar: string;
  uf: string;
  partidoSigla?: string;
}

/**
 * Normaliza nome seguindo o mesmo idiom do senado-adapter (NFD strip)
 * + lowercase + collapse spaces (D-06).
 * Fonte: src/lib/sync/senado-adapter.ts:94-99
 */
function normalizarNome(nome: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza UF: trim + uppercase.
 */
function normalizarUf(uf: string): string {
  return String(uf || '').trim().toUpperCase();
}

export function camaraNameMatch(
  entrada: EntradaMatch,
  diretorio: DiretorioParlamentares
): ResultadoMatch {
  // 1. id-first: idDeputado → porIdExterno
  if (entrada.idDeputado !== undefined && entrada.idDeputado !== null && entrada.idDeputado !== '') {
    const idExterno = String(entrada.idDeputado);
    const parlamentarId = diretorio.porIdExterno[idExterno];
    if (parlamentarId) {
      return { parlamentarId, metodo: 'idExterno' };
    }
    // id não encontrado no diretório → cai para fallback nome+UF
  }

  // 2. Rejeita linhas de liderança/vazias ANTES de consultar porNomeUf
  const nomeNormalizado = normalizarNome(entrada.nomeParlamentar);
  const ufNormalizada = normalizarUf(entrada.uf);

  if (!nomeNormalizado || !ufNormalizada || ufNormalizada === 'NA') {
    return null;
  }

  // 3. Chave exata nome+UF
  const chave = `${nomeNormalizado}|${ufNormalizada}`;
  const candidatos = diretorio.porNomeUf[chave];

  if (!candidatos || candidatos.length === 0) {
    return null;
  }

  if (candidatos.length === 1) {
    return { parlamentarId: candidatos[0], metodo: 'nomeUf' };
  }

  // ≥2 candidatos → ambiguidade: desempate por partidoSigla
  if (!entrada.partidoSigla) {
    return null;
  }

  const partidoEntrada = normalizarNome(entrada.partidoSigla).toUpperCase();
  let matchUnico: string | null = null;

  for (const candId of candidatos) {
    const partidoCand = diretorio.partidosPorId[candId];
    if (partidoCand && normalizarNome(partidoCand).toUpperCase() === partidoEntrada) {
      if (matchUnico !== null) {
        // Segundo candidato com mesmo partido → ambiguidade persistente
        return null;
      }
      matchUnico = candId;
    }
  }

  if (matchUnico) {
    return { parlamentarId: matchUnico, metodo: 'nomeUf' };
  }

  return null;
}