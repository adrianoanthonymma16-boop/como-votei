/**
 * Coleta de lixo (retenção) do banco.
 *
 * Remove registros fora da janela de 3 anos do produto (ANOS_JANELA — fonte
 * única, ver src/lib/despesas.ts). Complementa a retenção de despesas já
 * embutida nos scripts de sync, cobrindo as tabelas legislativas que hoje
 * crescem sem limite: votações, votos, discursos, proposições, tramitações
 * e frequências.
 *
 * Regra de corte: `ano < anoCorte` para tabelas com campo de ano (proposições,
 * frequências, despesas) e `data < dataCorte` (1º de janeiro de anoCorte em UTC)
 * para tabelas com data (votações, discursos); filhas (votos, tramitações)
 * seguem o ano/data do pai. NUNCA apaga partido/uf/parlamentar
 * (identidade/referência).
 *
 * Funções puras (construirCorte, ESPEC_GC.foraDaJanela) são testáveis sem DB;
 * a deleção em lotes usa o mesmo predicado da contagem (fonte única).
 *
 * CLI: scripts/gc.ts — dry-run por padrão, `--apply` executa o DELETE.
 */
import { ANOS_JANELA } from './despesas';

/** Cliente mínimo — satisfeito por PrismaClient e por Prisma.TransactionClient. */
export interface GcClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

export interface CorteJanela {
  /** Anos preservados (janela), do mais recente ao mais antigo. */
  anos: number[];
  /** Ano mais antigo preservado (inclusive) — corte = 1º de janeiro dele. */
  anoCorte: number;
  /** Instante UTC mínimo preservado: 1º de janeiro de anoCorte. */
  dataCorte: Date;
}

/**
 * Deriva o corte da janela a partir de uma lista de anos.
 * O corte é o menor ano da janela — tudo anterior a ele é lixo.
 */
export function construirCorte(anos: readonly number[] = ANOS_JANELA): CorteJanela {
  if (anos.length === 0) {
    throw new Error('construirCorte: janela de anos vazia');
  }
  const anoCorte = Math.min(...anos);
  return {
    anos: [...anos],
    anoCorte,
    dataCorte: new Date(Date.UTC(anoCorte, 0, 1)),
  };
}

/** Predicado SQL "fora da janela" sobre a própria tabela (sem alias). */
export interface PredicadoGc {
  sql: string;
  params: unknown[];
}

export interface EspecGc {
  tabela: string;
  rotulo: string;
  /** Gera o WHERE que identifica as linhas fora da janela de retenção. */
  foraDaJanela: (corte: CorteJanela) => PredicadoGc;
}

/**
 * Tabelas cobertas, na ordem de limpeza (filhos antes dos pais, para que a
 * contagem por tabela reflita o que cada DELETE remove — o schema também tem
 * onDelete: Cascade, então a ordem é sobre relatório, não sobre correção).
 * Nomes de tabela/coluna são os físicos (snake_case via @map).
 */
export const ESPEC_GC: readonly EspecGc[] = [
  {
    tabela: 'votos',
    rotulo: 'Votos',
    foraDaJanela: (c) => ({
      sql: `"votacao_id" IN (SELECT "id" FROM "votacoes" WHERE "data" < $1)`,
      params: [c.dataCorte],
    }),
  },
  {
    tabela: 'votacoes',
    rotulo: 'Votações',
    foraDaJanela: (c) => ({ sql: `"data" < $1`, params: [c.dataCorte] }),
  },
  {
    tabela: 'tramitacoes',
    rotulo: 'Tramitações',
    foraDaJanela: (c) => ({
      sql: `"proposicao_id" IN (SELECT "id" FROM "proposicoes" WHERE "ano" < $1)`,
      params: [c.anoCorte],
    }),
  },
  {
    tabela: 'proposicoes',
    rotulo: 'Proposições',
    // Corte pelo campo `ano` (número da proposição, ex.: PL 4872/2024), NÃO por
    // data_apresentacao: nas fontes oficiais os dois divergem (há PL /2026 com
    // data_apresentacao de 2009). `ano` é o que a API de proposições filtra.
    foraDaJanela: (c) => ({ sql: `"ano" < $1`, params: [c.anoCorte] }),
  },
  {
    tabela: 'discursos',
    rotulo: 'Discursos',
    foraDaJanela: (c) => ({ sql: `"data" < $1`, params: [c.dataCorte] }),
  },
  {
    tabela: 'frequencias',
    rotulo: 'Frequências',
    foraDaJanela: (c) => ({ sql: `"ano" < $1`, params: [c.anoCorte] }),
  },
  {
    tabela: 'emendas',
    rotulo: 'Emendas',
    // Corte pelo `ano` da emenda (campo próprio da fonte), como proposições.
    foraDaJanela: (c) => ({ sql: `"ano" < $1`, params: [c.anoCorte] }),
  },
  {
    tabela: 'despesas',
    rotulo: 'Despesas',
    foraDaJanela: (c) => ({ sql: `"ano" < $1`, params: [c.anoCorte] }),
  },
];

/** Recupera a especificação de uma tabela coberta (erro se desconhecida). */
export function especDaTabela(tabela: string): EspecGc {
  const espec = ESPEC_GC.find((e) => e.tabela === tabela);
  if (!espec) {
    throw new Error(`GC: tabela não coberta: ${tabela}`);
  }
  return espec;
}

export interface ItemGc {
  tabela: string;
  rotulo: string;
  registros: number;
}

export interface ResultadoGc {
  dryRun: boolean;
  anos: number[];
  anoCorte: number;
  dataCorte: Date;
  itens: ItemGc[];
  total: number;
}

/** Conta, por tabela, quantas linhas estão fora da janela (read-only). */
export async function contarForaDaJanela(
  prisma: GcClient,
  corte: CorteJanela = construirCorte()
): Promise<ItemGc[]> {
  const itens: ItemGc[] = [];
  for (const espec of ESPEC_GC) {
    const { sql, params } = espec.foraDaJanela(corte);
    const linhas = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM "${espec.tabela}" WHERE ${sql}`,
      ...params
    );
    itens.push({ tabela: espec.tabela, rotulo: espec.rotulo, registros: Number(linhas[0]?.n ?? 0) });
  }
  return itens;
}

/**
 * Deleta em lotes as linhas fora da janela de uma tabela, usando o MESMO
 * predicado da contagem. Retorna o total removido.
 */
export async function deletarForaDaJanela(
  prisma: GcClient,
  espec: EspecGc,
  corte: CorteJanela = construirCorte(),
  lote = 5000
): Promise<number> {
  const tamanho = Math.max(1, Math.floor(lote));
  const { sql, params } = espec.foraDaJanela(corte);
  let total = 0;
  for (;;) {
    const removidos = Number(
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${espec.tabela}" WHERE "id" IN (SELECT "id" FROM "${espec.tabela}" WHERE ${sql} LIMIT ${tamanho})`,
        ...params
      )
    );
    total += removidos;
    if (removidos < tamanho) break;
  }
  return total;
}

export interface OpcoesGc {
  /** true (padrão) só conta; false executa os DELETEs. */
  dryRun?: boolean;
  /** Linhas por DELETE — evita transações longas no Neon. */
  lote?: number;
}

/**
 * Executa a coleta de lixo. Padrão é dry-run (read-only): só reporta.
 * Com `dryRun: false`, apaga fora da janela em lotes e reporta o removido.
 */
export async function executarGc(prisma: GcClient, opcoes: OpcoesGc = {}): Promise<ResultadoGc> {
  const dryRun = opcoes.dryRun ?? true;
  const lote = opcoes.lote ?? 5000;
  const corte = construirCorte();

  let itens: ItemGc[];
  if (dryRun) {
    itens = await contarForaDaJanela(prisma, corte);
  } else {
    itens = [];
    for (const espec of ESPEC_GC) {
      const registros = await deletarForaDaJanela(prisma, espec, corte, lote);
      itens.push({ tabela: espec.tabela, rotulo: espec.rotulo, registros });
    }
  }

  return {
    dryRun,
    anos: corte.anos,
    anoCorte: corte.anoCorte,
    dataCorte: corte.dataCorte,
    itens,
    total: itens.reduce((soma, item) => soma + item.registros, 0),
  };
}
