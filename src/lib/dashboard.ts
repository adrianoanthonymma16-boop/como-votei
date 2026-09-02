export const TIPOS_PRESENCA = ['SIM', 'NAO', 'ABSTENCAO', 'ARTICULACAO', 'OBSTRUCAO'] as const;
export const TIPOS_FALTA_JUSTIFICADA = ['LICENCA', 'MISSAO'] as const;
export const TIPO_AUSENTE = 'AUSENTE' as const;

export type TipoVotoString = string;

export interface VotoComData {
  tipo: TipoVotoString;
  data: Date;
}

export interface VotoComVotacao {
  votacaoId: string;
  tipo: TipoVotoString;
  data: Date;
}

export interface VotoPartido {
  votacaoId: string;
  tipo: TipoVotoString;
  parlamentarId: string;
}

export interface FrequenciaResult {
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  taxaPresenca: number;
}

export interface AlinhamentoResult {
  totalVotacoes: number;
  votosAlinhados: number;
  percentualAlinhamento: number;
  rankingPartido?: number;
  totalPartido?: number;
}

export interface MesAtividade {
  mes: string;
  votações: number;
  discursos: number;
  proposicoes: number;
}

export interface TemaAgregado {
  tema: string;
  total: number;
  votações: number;
  discursos: number;
  proposicoes: number;
}

export function mode<T>(values: T[]): T | undefined {
  if (values.length === 0) return undefined;
  const counts = new Map<T, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | undefined;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = value;
    }
  }
  return best;
}

export function isPresenca(tipo: TipoVotoString): boolean {
  return (TIPOS_PRESENCA as readonly string[]).includes(tipo);
}

export function computeFrequencia(votos: VotoComData[]): FrequenciaResult {
  const porData = new Map<string, VotoComData[]>();
  for (const v of votos) {
    const key = v.data.toISOString().slice(0, 10);
    if (!porData.has(key)) porData.set(key, []);
    porData.get(key)!.push(v);
  }

  let presencas = 0;
  let faltasJustificadas = 0;
  let faltasInjustificadas = 0;

  for (const votosDoDia of porData.values()) {
    if (votosDoDia.some((v) => isPresenca(v.tipo))) {
      presencas++;
    } else if (votosDoDia.some((v) => (TIPOS_FALTA_JUSTIFICADA as readonly string[]).includes(v.tipo))) {
      faltasJustificadas++;
    } else if (votosDoDia.some((v) => v.tipo === TIPO_AUSENTE)) {
      faltasInjustificadas++;
    }
  }

  const totalSessoes = porData.size;
  const taxaPresenca = totalSessoes > 0 ? (presencas / totalSessoes) * 100 : 0;

  return {
    totalSessoes,
    presencas,
    faltasJustificadas,
    faltasInjustificadas,
    taxaPresenca: Math.round(taxaPresenca * 10) / 10,
  };
}

export function computeAlinhamento(
  meusVotos: { votacaoId: string; tipo: TipoVotoString }[],
  votosPartido: VotoPartido[],
  meuParlamentarId: string
): AlinhamentoResult {
  const majorityByVotacao = new Map<string, string>();
  const byVotacao = new Map<string, string[]>();
  for (const pv of votosPartido) {
    if (!isPresenca(pv.tipo)) continue;
    if (!byVotacao.has(pv.votacaoId)) byVotacao.set(pv.votacaoId, []);
    byVotacao.get(pv.votacaoId)!.push(pv.tipo);
  }
  for (const [votacaoId, tipos] of byVotacao) {
    const maioria = mode(tipos);
    if (maioria) majorityByVotacao.set(votacaoId, maioria);
  }

  let votosAlinhados = 0;
  let totalVotacoes = 0;
  for (const mv of meusVotos) {
    if (!isPresenca(mv.tipo)) continue;
    const maioria = majorityByVotacao.get(mv.votacaoId);
    if (!maioria) continue;
    totalVotacoes++;
    if (mv.tipo === maioria) votosAlinhados++;
  }

  const memberStats = new Map<string, { aligned: number; total: number }>();
  for (const pv of votosPartido) {
    if (!isPresenca(pv.tipo)) continue;
    const maioria = majorityByVotacao.get(pv.votacaoId);
    if (!maioria) continue;
    if (!memberStats.has(pv.parlamentarId)) {
      memberStats.set(pv.parlamentarId, { aligned: 0, total: 0 });
    }
    const stats = memberStats.get(pv.parlamentarId)!;
    stats.total++;
    if (pv.tipo === maioria) stats.aligned++;
  }

  const ranked = [...memberStats.entries()]
    .map(([id, s]) => ({ id, pct: s.total > 0 ? s.aligned / s.total : 0 }))
    .sort((a, b) => b.pct - a.pct);

  const rankingPartido = ranked.findIndex((r) => r.id === meuParlamentarId) + 1;

  return {
    totalVotacoes,
    votosAlinhados,
    percentualAlinhamento: totalVotacoes > 0 ? Math.round((votosAlinhados / totalVotacoes) * 1000) / 10 : 0,
    rankingPartido: rankingPartido > 0 ? rankingPartido : undefined,
    totalPartido: ranked.length > 0 ? ranked.length : undefined,
  };
}

export function computeAtividadeMensal(
  votos: VotoComVotacao[],
  discursos: { data: Date }[],
  proposicoes: { data: Date }[]
): MesAtividade[] {
  const meses: MesAtividade[] = Array.from({ length: 12 }, (_, i) => ({
    mes: String(i + 1).padStart(2, '0'),
    votações: 0,
    discursos: 0,
    proposicoes: 0,
  }));

  const votacoesVistas = new Set<string>();
  for (const v of votos) {
    if (votacoesVistas.has(v.votacaoId)) continue;
    votacoesVistas.add(v.votacaoId);
    const m = v.data.getMonth();
    meses[m].votações++;
  }
  for (const d of discursos) {
    const m = d.data.getMonth();
    meses[m].discursos++;
  }
  for (const p of proposicoes) {
    const m = p.data.getMonth();
    meses[m].proposicoes++;
  }

  return meses;
}

export function computeTemas(
  votacoes: { tema?: string | null }[],
  discursos: { tema?: string | null }[],
  proposicoes: { tema?: string | null }[]
): TemaAgregado[] {
  const mapa = new Map<string, TemaAgregado>();
  const chave = (tema?: string | null) => (tema && tema.trim() ? tema.trim() : 'Sem tema');
  const get = (tema?: string | null): TemaAgregado => {
    const k = chave(tema);
    if (!mapa.has(k)) {
      mapa.set(k, { tema: k, total: 0, votações: 0, discursos: 0, proposicoes: 0 });
    }
    return mapa.get(k)!;
  };

  for (const v of votacoes) {
    const t = get(v.tema);
    t.votações++;
    t.total++;
  }
  for (const d of discursos) {
    const t = get(d.tema);
    t.discursos++;
    t.total++;
  }
  for (const p of proposicoes) {
    const t = get(p.tema);
    t.proposicoes++;
    t.total++;
  }

  return [...mapa.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}
