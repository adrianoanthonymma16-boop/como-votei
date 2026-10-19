/**
 * Lógica pura do relatório de cobertura de dados.
 *
 * Uma célula é (casa, ano, dataset). O relatório considera cobertura
 * "fechada" quando toda célula tem linhas — ou quando a ausência está
 * documentada como lacuna da fonte (nunca como zero silencioso).
 */

export const ANOS_COBERTURA = [2024, 2025, 2026] as const;
export const CASAS_COBERTURA = ['CAMARA', 'SENADO'] as const;
export const DATASETS_COBERTURA = ['votacoes', 'votos', 'proposicoes', 'discursos'] as const;

export type CasaCobertura = (typeof CASAS_COBERTURA)[number];
export type DatasetCobertura = (typeof DATASETS_COBERTURA)[number];

export interface CelulaCobertura {
  casa: CasaCobertura;
  ano: number;
  dataset: DatasetCobertura;
  total: number;
}

export type StatusCobertura = 'ok' | 'lacuna' | 'documentada';

export interface LinhaCobertura extends CelulaCobertura {
  status: StatusCobertura;
  variacao: number | null;
  motivo?: string;
}

export interface ResumoCobertura {
  linhas: LinhaCobertura[];
  falhas: LinhaCobertura[];
  documentadas: LinhaCobertura[];
}

/** Chave estável de uma célula: `CASA:ANO:dataset`. */
export function chaveCelula(casa: string, ano: number, dataset: string): string {
  return `${casa}:${ano}:${dataset}`;
}

/**
 * Variação percentual em relação ao ano anterior.
 *
 * Retorna `null` quando não há base de comparação (ano anterior zerado) ou
 * quando o ano é o corrente — um ano em curso sempre parece uma queda e não
 * deve virar alerta.
 */
export function variacaoPercentual(
  total: number,
  totalAnterior: number | null,
  ano: number,
  anoCorrente: number
): number | null {
  if (ano === anoCorrente) return null;
  if (totalAnterior === null || totalAnterior === 0) return null;
  return Math.round(((total - totalAnterior) / totalAnterior) * 1000) / 10;
}

/** Variação acima deste módulo vira alerta (não falha). */
export const LIMIAR_VARIACAO_PERCENTUAL = 30;

export function statusCelula(
  total: number,
  chave: string,
  lacunasConhecidas: Record<string, string>
): { status: StatusCobertura; motivo?: string } {
  if (total > 0) return { status: 'ok' };
  const motivo = lacunasConhecidas[chave];
  if (motivo) return { status: 'documentada', motivo };
  return { status: 'lacuna' };
}

/**
 * Monta o relatório completo a partir das células medidas.
 * `anteriores` mapeia `CASA:ANO:dataset` para o total do ano anterior.
 */
export function montarRelatorio(
  celulas: CelulaCobertura[],
  lacunasConhecidas: Record<string, string>,
  anoCorrente: number,
  anteriores: Record<string, number> = {}
): ResumoCobertura {
  const linhas: LinhaCobertura[] = celulas.map((celula) => {
    const chave = chaveCelula(celula.casa, celula.ano, celula.dataset);
    const { status, motivo } = statusCelula(celula.total, chave, lacunasConhecidas);
    const chaveAnterior = chaveCelula(celula.casa, celula.ano - 1, celula.dataset);
    const totalAnterior = chaveAnterior in anteriores ? anteriores[chaveAnterior] : null;
    return {
      ...celula,
      status,
      motivo,
      variacao: variacaoPercentual(celula.total, totalAnterior, celula.ano, anoCorrente),
    };
  });

  return {
    linhas,
    falhas: linhas.filter((linha) => linha.status === 'lacuna'),
    documentadas: linhas.filter((linha) => linha.status === 'documentada'),
  };
}

/** Variações fora do limiar — apenas sinalizam, nunca reprovam sozinhas. */
export function variacoesSuspeitas(linhas: LinhaCobertura[]): LinhaCobertura[] {
  return linhas.filter(
    (linha) => linha.variacao !== null && Math.abs(linha.variacao) > LIMIAR_VARIACAO_PERCENTUAL
  );
}
