/**
 * Métrica de produtividade — idealização do desenvolvedor.
 *
 * Pontuação por parlamentar:
 *  - PL apresentado           +0,5
 *  - PL aprovado              +1,0  (status SANCIONADA/APROVADA_*)
 *  - falta (AUSENTE)          -0,2
 *  - voto SIM/NAO              +0,3
 *  - discurso                  +0,05
 */

export const PESOS = {
  PL_APRESENTADO: 0.5,
  PL_APROVADO: 1.0,
  FALTA: -0.2,
  VOTO_SIM_NAO: 0.3,
  DISCURSO: 0.05,
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
  // arredonda para 2 casas para exibição estável
  return Math.round(raw * 100) / 100;
}

export function pontuacaoParaContadores(c: ContadoresProdutividade): PontuacaoProdutividade {
  return { ...c, pontuacao: calcularPontuacao(c) };
}
