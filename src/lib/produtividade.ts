/**
 * Métrica de produtividade — idealização do desenvolvedor.
 *
 * Pontuação por parlamentar (PL aprovado em destaque):
 *  - PL apresentado           +0,05
 *  - PL aprovado              +1     (status SANCIONADA/APROVADA_*)
 *  - falta (AUSENTE)          -0,02
 *  - voto SIM/NAO              +0,03
 *  - discurso                  +0,005
 */

export const PESOS = {
  PL_APRESENTADO: 0.05,
  PL_APROVADO: 1,
  FALTA: -0.02,
  VOTO_SIM_NAO: 0.03,
  DISCURSO: 0.005,
} as const;

export const STATUS_PL_APROVADO = ['APROVADA_CAMARA', 'APROVADA_SENADO', 'SANCIONADA'] as const;

export interface ContadoresProdutividade {
  plApresentados: number;
  plAprovados: number;
  faltas: number;
  votosSimNao: number;
  discursos: number;
}

export interface PontuacaoProdutividade extends ContadoresProdutividade {
  pontuacao: number;
}

export function calcularPontuacao(c: ContadoresProdutividade): number {
  const raw =
    c.plApresentados * PESOS.PL_APRESENTADO +
    c.plAprovados * PESOS.PL_APROVADO +
    c.faltas * PESOS.FALTA +
    c.votosSimNao * PESOS.VOTO_SIM_NAO +
    c.discursos * PESOS.DISCURSO;
  // arredonda para 3 casas (precisão para pesos pequenos)
  return Math.round(raw * 1000) / 1000;
}

export function pontuacaoParaContadores(c: ContadoresProdutividade): PontuacaoProdutividade {
  return { ...c, pontuacao: calcularPontuacao(c) };
}
