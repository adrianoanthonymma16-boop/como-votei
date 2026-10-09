/**
 * Métrica de produtividade — validação de parlamentares por tipo de proposição.
 *
 * Hierarquia de pesos por força normativa e rito (quórum/esforço):
 *  - PEC: quórum 3/5 em dois turnos nas duas Casas → apresentação 0,30 / aprovação 5
 *  - PLP: maioria absoluta → apresentação 0,20 / aprovação 3
 *  - PL (inclui PLS/PLC/PLV/MPV): lei ordinária, base histórica → 0,05 / 1
 *  - PDL/PRC (inclui PDS/PRS): decreto/resolução, rito simples → 0,03 / 0,5
 *  - REQ/RIC/RQS: fiscalização, baixo custo e alto volume → 0,01 / 0,05
 *    (10 REQs aprovados valem menos que 1 PL aprovado — evita gaming por volume)
 *  - INC/SUG e OUTRO: sem força normativa → 0,01 apresentação / 0 aprovação
 *
 * Coautoria (autorPrincipal = false): metade do peso de apresentação e
 * NUNCA conta aprovação (só o autor principal leva o crédito de levar até o fim).
 */

export type GrupoTipoProposicao =
  | 'PEC'
  | 'PLP'
  | 'PL'
  | 'PDL_PRC'
  | 'REQ'
  | 'INC'
  | 'OUTRO';

export const PESO_APRESENTACAO: Record<GrupoTipoProposicao, number> = {
  PEC: 0.3,
  PLP: 0.2,
  PL: 0.05,
  PDL_PRC: 0.03,
  REQ: 0.01,
  INC: 0.01,
  OUTRO: 0.01,
} as const;

export const PESO_APROVACAO: Record<GrupoTipoProposicao, number> = {
  PEC: 5,
  PLP: 3,
  PL: 1,
  PDL_PRC: 0.5,
  REQ: 0.05,
  INC: 0,
  OUTRO: 0,
} as const;

/** Coautoria vale metade da apresentação. */
export const FATOR_COAUTORIA = 0.5;

export const PESOS = {
  PL_APRESENTADO: PESO_APRESENTACAO.PL,
  PL_APROVADO: PESO_APROVACAO.PL,
  FALTA: -0.02,
  VOTO_SIM_NAO: 0.03,
  DISCURSO: 0.005,
} as const;

export const STATUS_PL_APROVADO = ['APROVADA_CAMARA', 'APROVADA_SENADO', 'SANCIONADA'] as const;
/** Alias semântico: o conjunto "aprovada" vale para qualquer tipo, não só PL. */
export const STATUS_APROVADO: readonly string[] = STATUS_PL_APROVADO;

/**
 * Normaliza a sigla do tipo (Câmara e Senado) para o grupo de peso.
 * Senado: PLS/PLC→PL, PDS/PRS→PDL_PRC, RQS/R.S→REQ, SUG→INC.
 */
export function grupoDoTipo(sigla?: string): GrupoTipoProposicao {
  const t = (sigla || '').toUpperCase().replace(/\./g, '').trim();
  if (!t) return 'OUTRO';
  if (t === 'PEC') return 'PEC';
  if (t === 'PLP') return 'PLP';
  if (['PL', 'PLS', 'PLC', 'PLV', 'MPV'].includes(t)) return 'PL';
  if (['PDL', 'PDS', 'PRC', 'PRS'].includes(t)) return 'PDL_PRC';
  if (['REQ', 'RIC', 'RQS', 'RS'].includes(t)) return 'REQ';
  if (['INC', 'SUG'].includes(t)) return 'INC';
  return 'OUTRO';
}

/**
 * Filtro "aprovadas / não aprovadas" — o MESMO conjunto da métrica,
 * reutilizado pela API de proposições. Nada inventado: só o enum oficial.
 */
export function filtroStatusAprovada(
  aprovada?: 'true' | 'false'
): { in: string[] } | { notIn: string[] } | undefined {
  if (aprovada === 'true') return { in: [...STATUS_PL_APROVADO] };
  if (aprovada === 'false') return { notIn: [...STATUS_PL_APROVADO] };
  return undefined;
}

export type ContagemPorGrupo = Partial<Record<GrupoTipoProposicao, number>>;

export interface ContadoresProdutividade {
  apresentadosPrincipal: ContagemPorGrupo;
  apresentadosCoautoria: ContagemPorGrupo;
  aprovados: ContagemPorGrupo;
  faltas: number;
  votosSimNao: number;
  discursos: number;
}

export interface PontuacaoProdutividade extends ContadoresProdutividade {
  pontuacao: number;
}

export interface LinhaProposicao {
  tipo: string;
  autorPrincipal: boolean;
  status: string;
  /** Quantidade de proposições com esta combinação (agregado do groupBy). Padrão: 1. */
  qtd?: number;
}

/**
 * Agrega linhas de proposição (tipo + autoria + status) nos contadores da métrica.
 * Aprovada de autor principal conta apresentação E aprovação; coautoria aprovada
 * conta só apresentação (sem crédito de aprovação).
 */
export function contadoresDeGrupos(linhas: LinhaProposicao[]): {
  apresentadosPrincipal: ContagemPorGrupo;
  apresentadosCoautoria: ContagemPorGrupo;
  aprovados: ContagemPorGrupo;
} {
  const apresentadosPrincipal: ContagemPorGrupo = {};
  const apresentadosCoautoria: ContagemPorGrupo = {};
  const aprovados: ContagemPorGrupo = {};

  for (const l of linhas) {
    const grupo = grupoDoTipo(l.tipo);
    const qtd = l.qtd ?? 1;
    const aprovada = (STATUS_APROVADO as readonly string[]).includes(l.status);
    if (l.autorPrincipal) {
      apresentadosPrincipal[grupo] = (apresentadosPrincipal[grupo] ?? 0) + qtd;
      if (aprovada) aprovados[grupo] = (aprovados[grupo] ?? 0) + qtd;
    } else {
      apresentadosCoautoria[grupo] = (apresentadosCoautoria[grupo] ?? 0) + qtd;
    }
  }

  return { apresentadosPrincipal, apresentadosCoautoria, aprovados };
}

function somarPorGrupo(
  contagem: ContagemPorGrupo,
  pesos: Record<GrupoTipoProposicao, number>,
  fator = 1
): number {
  let total = 0;
  for (const [grupo, qtd] of Object.entries(contagem)) {
    total += (qtd ?? 0) * (pesos[grupo as GrupoTipoProposicao] ?? 0) * fator;
  }
  return total;
}

export function calcularPontuacao(c: ContadoresProdutividade): number {
  const raw =
    somarPorGrupo(c.apresentadosPrincipal, PESO_APRESENTACAO) +
    somarPorGrupo(c.apresentadosCoautoria, PESO_APRESENTACAO, FATOR_COAUTORIA) +
    somarPorGrupo(c.aprovados, PESO_APROVACAO) +
    c.faltas * PESOS.FALTA +
    c.votosSimNao * PESOS.VOTO_SIM_NAO +
    c.discursos * PESOS.DISCURSO;
  // arredonda para 3 casas (precisão para pesos pequenos)
  return Math.round(raw * 1000) / 1000;
}

export function pontuacaoParaContadores(c: ContadoresProdutividade): PontuacaoProdutividade {
  return { ...c, pontuacao: calcularPontuacao(c) };
}

/** Soma os valores de uma contagem por grupo (tolerante a undefined). */
export function somarContagem(contagem?: ContagemPorGrupo): number {
  if (!contagem) return 0;
  return Object.values(contagem).reduce((a, b) => a + (b ?? 0), 0);
}

/**
 * Resumo exibido nas páginas: total apresentadas (principal + coautoria)
 * e total aprovadas (só autor principal).
 */
export function resumoProdutividade(p?: {
  apresentadosPrincipal?: ContagemPorGrupo;
  apresentadosCoautoria?: ContagemPorGrupo;
  aprovados?: ContagemPorGrupo;
}): { apresentadas: number; aprovadas: number } {
  if (!p) return { apresentadas: 0, aprovadas: 0 };
  return {
    apresentadas: somarContagem(p.apresentadosPrincipal) + somarContagem(p.apresentadosCoautoria),
    aprovadas: somarContagem(p.aprovados),
  };
}
