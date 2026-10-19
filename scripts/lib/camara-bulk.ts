/**
 * Ingestão em lote (bulk) dos arquivos JSON oficiais da Câmara.
 *
 * Motivo: o sync por deputado gasta ~3 requests por proposição (detalhe +
 * autores + tramitações) e um ano de 2025 tem ~48 mil proposições — dezenas de
 * horas, acima do teto de 6h do runner do GitHub Actions. Os mesmos dados estão
 * publicados de uma vez em
 * `dadosabertos.camara.leg.br/arquivos/<conjunto>/json/<conjunto>-<ano>.json`.
 *
 * Aqui o arquivo é consumido em streaming (stream-json) sobre a resposta HTTP,
 * sem materializar o JSON inteiro na memória (proposições-2025 tem ~165 MB).
 *
 * Fluxo por ano:
 *   1. proposicoesAutores-<ano>.json → ids de proposições com autoria nossa
 *   2. proposicoes-<ano>.json        → metadados + ultimoStatus (status)
 *   3. proposicoesTramitacoes-<ano>.json → histórico de tramitação
 *   4. votacoes-<ano>.json           → votações de plenário
 *   5. votacoesVotos-<ano>.json      → votos por votação
 *
 * Nenhum passo depende de um deputado específico, então o custo é O(1) em
 * requests (5 downloads) em vez de O(deputados × proposições).
 */
import { Readable } from 'stream';
import { chain } from 'stream-chain';
import type { PrismaClient } from '@prisma/client';
import type {
  ProposicaoComTramitacoes,
  TramitacaoNormalizada,
  VotacaoNormalizada,
  VotoNormalizado,
} from '../../src/lib/sync/types';
import { mapStatusProposicao } from '../../src/lib/sync/camara-adapter';
import { extrairTemaPrincipal } from '../../src/lib/temas';
import { USER_AGENT } from '../../src/lib/sync/http-client';
import { upsertProposicao, upsertVotacao } from './persistencia';

const CAMARA_SITE = process.env.CAMARA_SITE || 'https://www.camara.leg.br';
const BULK_BASE = process.env.CAMARA_BULK_BASE || 'https://dadosabertos.camara.leg.br/arquivos';

// stream-json não expõe tipos para os subpaths usados aqui.
/* eslint-disable @typescript-eslint/no-var-requires */
const { parser } = require('stream-json/parser.js');
const { pick } = require('stream-json/filters/pick.js');
const { streamArray } = require('stream-json/streamers/stream-array.js');
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * Mantém a conexão viva durante as fases de streaming.
 *
 * Baixar/parsear proposições (165 MB) e tramitações (88 MB) leva minutos sem
 * nenhuma query. O Neon fecha conexões ociosas nesse intervalo e a primeira
 * escrita seguinte falha com P1017 ("Server has closed the connection").
 * Um `SELECT 1` periódico evita o fechamento.
 */
export function iniciarKeepAlive(db: PrismaClient, intervaloMs = 30_000): () => void {
  const timer = setInterval(() => {
    db.$queryRaw`SELECT 1`.catch(() => {
      // Se falhar, a próxima query real tenta reconectar normalmente.
    });
  }, intervaloMs);
  // Não segura o processo aberto por causa do timer.
  timer.unref?.();
  return () => clearInterval(timer);
}

/** URL do arquivo bulk de um conjunto para um ano. */
export function urlBulk(conjunto: string, ano: number): string {
  return `${BULK_BASE}/${conjunto}/json/${conjunto}-${ano}.json`;
}

/**
 * Itera os itens do array `dados` de um JSON remoto em streaming.
 *
 * A resposta é consumida como stream (não `response.json()`), então o arquivo
 * de 165 MB nunca é materializado: cada objeto é emitido assim que o parser o
 * completa.
 */
export async function* iterarBulk<T>(url: string): AsyncGenerator<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error(`Resposta sem corpo para ${url}`);
  }

  // `Readable.fromWeb` converte o WHATWG ReadableStream do fetch para Node.
  const origem = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  const pipeline = chain([origem, parser(), pick({ filter: 'dados' }), streamArray()]);

  for await (const chunk of pipeline) {
    yield (chunk as { value: T }).value;
  }
}

/** Campos relevantes de `proposicoes-<ano>.json`. */
interface BulkProposicao {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao?: string;
  ultimoStatus?: { descricaoSituacao?: string };
}

interface BulkAutor {
  idProposicao: number;
  uriAutor: string;
  ordemAssinatura?: string;
  proponente?: string;
}

interface BulkTramitacao {
  uriProposicao: string;
  dataHora?: string;
  descricaoTramitacao?: string;
  despacho?: string;
  siglaOrgao?: string;
}

interface BulkVotacao {
  id: string;
  data: string;
  siglaOrgao: string;
  descricao: string;
  aprovacao?: number;
}

interface BulkVoto {
  idVotacao: string;
  voto: string;
  deputado_?: { id: string };
}

/** Extrai o último segmento de uma URI (`.../proposicoes/123` → `123`). */
export function idDeUri(uri: string): string | undefined {
  return uri?.split('/').filter(Boolean).pop();
}

/**
 * Converte a linha de autoria em `{ idProposicao, autorIdExterno, principal }`.
 * Autor principal = `proponente=1` ou `ordemAssinatura=1`.
 */
export function interpretarAutoria(a: BulkAutor): {
  idProposicao: number;
  autorIdExterno?: string;
  principal: boolean;
} {
  return {
    idProposicao: a.idProposicao,
    autorIdExterno: idDeUri(a.uriAutor),
    principal: a.proponente === '1' || a.ordemAssinatura === '1',
  };
}

/** Normaliza uma votação do bulk para o shape compartilhado. */
export function normalizarVotacaoBulk(v: BulkVotacao): VotacaoNormalizada {
  return {
    idExterno: v.id,
    casa: 'CAMARA',
    legislatura: 57,
    numero: 0,
    data: new Date(v.data),
    descricao: v.descricao,
    tema: extrairTemaPrincipal(v.descricao || ''),
    resultado: v.aprovacao === 1 ? 'APROVADA' : v.aprovacao === 0 ? 'REJEITADA' : undefined,
  };
}

const MAPA_VOTO: Record<string, VotoNormalizado['tipo']> = {
  sim: 'SIM',
  não: 'NAO',
  nao: 'NAO',
  abstenção: 'ABSTENCAO',
  abstencao: 'ABSTENCAO',
  obstrução: 'OBSTRUCAO',
  obstrucao: 'OBSTRUCAO',
  'art. 17': 'ARTICULACAO',
};

/** Normaliza o texto do voto da Câmara para o enum interno. */
export function normalizarTipoVotoBulk(voto: string): VotoNormalizado['tipo'] | undefined {
  return MAPA_VOTO[voto?.trim().toLowerCase()];
}

export interface ResultadoBulkProposicoes {
  proposicoes: number;
  tramitacoes: number;
  ignoradasSemAno: number;
}

/**
 * Sincroniza proposições de um ano a partir dos três arquivos bulk.
 *
 * Duas passadas para não carregar 107 mil objetos: a primeira coleta só as
 * proposições com autoria de um parlamentar cadastrado, a segunda guarda os
 * metadados apenas dessas.
 *
 * Mantém paridade com o sync via API ao descartar proposições com `ano` 0
 * (requerimentos internos e emendas de relator) — a API filtra por `ano`.
 */
export async function syncProposicoesBulk(
  db: PrismaClient,
  ano: number,
  log: (msg: string) => void = () => {}
): Promise<ResultadoBulkProposicoes> {
  const deputados = await db.parlamentar.findMany({
    where: { casa: 'CAMARA' },
    select: { id: true, idExterno: true },
  });
  const parlamentarPorIdExterno = new Map(deputados.map((d) => [d.idExterno, d.id]));
  const pararKeepAlive = iniciarKeepAlive(db);

  try {
  // 1. Autoria: primeiro autor cadastrado por proposição (principal tem prioridade).
  const autoria = new Map<number, { parlamentarId: string; principal: boolean }>();
  for await (const a of iterarBulk<BulkAutor>(urlBulk('proposicoesAutores', ano))) {
    const { autorIdExterno, principal } = interpretarAutoria(a);
    const parlamentarId = autorIdExterno ? parlamentarPorIdExterno.get(autorIdExterno) : undefined;
    if (!parlamentarId) continue;
    const atual = autoria.get(a.idProposicao);
    if (!atual || (principal && !atual.principal)) {
      autoria.set(a.idProposicao, { parlamentarId, principal });
    }
  }
  log(`  proposições com autoria cadastrada: ${autoria.size}`);

  // 2. Metadados só das proposições relevantes.
  const props = new Map<number, BulkProposicao>();
  let ignoradasSemAno = 0;
  for await (const p of iterarBulk<BulkProposicao>(urlBulk('proposicoes', ano))) {
    if (!autoria.has(p.id)) continue;
    if (p.ano !== ano) {
      ignoradasSemAno++;
      continue;
    }
    props.set(p.id, p);
  }
  log(`  metadados carregados: ${props.size} (fora do ano: ${ignoradasSemAno})`);

  // 3. Tramitações agrupadas por proposição.
  const tramsPorProposicao = new Map<number, TramitacaoNormalizada[]>();
  for await (const t of iterarBulk<BulkTramitacao>(urlBulk('proposicoesTramitacoes', ano))) {
    const id = Number(idDeUri(t.uriProposicao));
    if (!Number.isFinite(id) || !props.has(id)) continue;
    const data = t.dataHora ? new Date(t.dataHora) : undefined;
    if (!data || Number.isNaN(data.getTime())) continue;
    const lista = tramsPorProposicao.get(id) ?? [];
    lista.push({
      proposicaoIdExterno: String(id),
      data,
      descricao: t.descricaoTramitacao || t.despacho || 'Tramitação',
      orgao: t.siglaOrgao,
      situacao: t.descricaoTramitacao || 'OUTRA',
    });
    tramsPorProposicao.set(id, lista);
  }

  // 4. Persistência (helpers compartilhados com o sync via API).
  let gravadas = 0;
  let tramitacoes = 0;
  const TAMANHO_LOTE = 200;
  const entradas = [...props.entries()];

  for (let i = 0; i < entradas.length; i += TAMANHO_LOTE) {
    for (const [idProposicao, p] of entradas.slice(i, i + TAMANHO_LOTE)) {
      const { parlamentarId, principal } = autoria.get(idProposicao)!;
      const dataApresentacao = p.dataApresentacao ? new Date(p.dataApresentacao) : undefined;
      if (!dataApresentacao || Number.isNaN(dataApresentacao.getTime())) continue;

      const normalizada: ProposicaoComTramitacoes = {
        idExterno: String(p.id),
        parlamentarIdExterno: '',
        casa: 'CAMARA',
        tipo: p.siglaTipo,
        numero: p.numero,
        ano: p.ano,
        ementa: p.ementa || '',
        autorPrincipal: principal,
        status: mapStatusProposicao(p.ultimoStatus?.descricaoSituacao),
        dataApresentacao,
        urlOriginal: `${CAMARA_SITE}/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`,
        tema: extrairTemaPrincipal(p.ementa || ''),
        tramitacoes: tramsPorProposicao.get(idProposicao) ?? [],
      };

      tramitacoes += await upsertProposicao(db, parlamentarId, normalizada);
      gravadas++;
    }
    log(`  progresso: ${Math.min(i + TAMANHO_LOTE, entradas.length)}/${entradas.length}`);
  }

  return { proposicoes: gravadas, tramitacoes, ignoradasSemAno };
  } finally {
    pararKeepAlive();
  }
}

export interface ResultadoBulkVotacoes {
  votacoes: number;
  votos: number;
}

/**
 * Sincroniza votações e votos de um ano a partir dos arquivos bulk.
 * Votos são resolvidos em memória contra o mapa de parlamentares e inseridos
 * com `createMany({ skipDuplicates: true })` — voto oficial não é reescrito.
 */
export async function syncVotacoesBulk(
  db: PrismaClient,
  ano: number,
  log: (msg: string) => void = () => {}
): Promise<ResultadoBulkVotacoes> {
  const pararKeepAlive = iniciarKeepAlive(db);
  try {
  const votacoes = new Map<string, VotacaoNormalizada>();
  for await (const v of iterarBulk<BulkVotacao>(urlBulk('votacoes', ano))) {
    // Mantém apenas plenário, igual ao sync via API.
    if (v.siglaOrgao !== 'PLEN') continue;
    votacoes.set(v.id, normalizarVotacaoBulk(v));
  }
  log(`  votações de plenário: ${votacoes.size}`);

  let votacoesGravadas = 0;
  for (const v of votacoes.values()) {
    await upsertVotacao(db, v);
    votacoesGravadas++;
  }

  const [parlamentares, votacoesDb] = await Promise.all([
    db.parlamentar.findMany({ where: { casa: 'CAMARA' }, select: { id: true, idExterno: true } }),
    db.votacao.findMany({
      where: { casa: 'CAMARA', idExterno: { in: [...votacoes.keys()] } },
      select: { id: true, idExterno: true },
    }),
  ]);
  const idPorExterno = new Map(parlamentares.map((p) => [p.idExterno, p.id]));
  const votacaoIdPorExterno = new Map(votacoesDb.map((v) => [v.idExterno, v.id]));

  let votos = 0;
  let lote: Array<{ parlamentarId: string; votacaoId: string; tipo: VotoNormalizado['tipo'] }> = [];
  const TAMANHO_LOTE = 5000;

  const gravarLote = async () => {
    if (lote.length === 0) return;
    const resultado = await db.voto.createMany({ data: lote, skipDuplicates: true });
    votos += resultado.count;
    lote = [];
  };

  for await (const v of iterarBulk<BulkVoto>(urlBulk('votacoesVotos', ano))) {
    const parlamentarId = v.deputado_?.id ? idPorExterno.get(v.deputado_.id) : undefined;
    const votacaoId = votacaoIdPorExterno.get(v.idVotacao);
    const tipo = normalizarTipoVotoBulk(v.voto);
    if (!parlamentarId || !votacaoId || !tipo) continue;
    lote.push({ parlamentarId, votacaoId, tipo });
    if (lote.length >= TAMANHO_LOTE) await gravarLote();
  }
  await gravarLote();

  return { votacoes: votacoesGravadas, votos };
  } finally {
    pararKeepAlive();
  }
}
