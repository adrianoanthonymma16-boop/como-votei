/**
 * Persistência idempotente (upsert) das entidades normalizadas.
 *
 * Compartilhada pelos syncs de Câmara e Senado: os adapters entregam os MESMOS
 * tipos normalizados (`src/lib/sync/types.ts`), então a gravação é idêntica.
 * Antes, cada script reimplementava o mesmo upsert de voto/votação/discurso/
 * frequência/proposição — risco de divergência silenciosa entre as casas.
 *
 * Recebe o `PrismaClient` por parâmetro (injeção) para ser testável fora dos
 * scripts.
 */
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type {
  ParlamentarNormalizado,
  VotacaoNormalizada,
  VotoNormalizado,
  DiscursoNormalizado,
  FrequenciaNormalizada,
  ProposicaoComTramitacoes,
} from '../../src/lib/sync/types';

/** Códigos do Prisma que indicam conexão derrubada (Neon ocioso/sobrecarregado). */
const CODIGOS_CONEXAO = new Set(['P1017', 'P1001', 'P1002', 'P2024']);

/**
 * Repete a operação quando o Neon derruba a conexão no meio de um backfill
 * longo — sem isso uma oscilação de rede aborta horas de sincronização.
 */
export async function retentar<T>(
  db: PrismaClient,
  operacao: () => Promise<T>,
  rotulo: string
): Promise<T> {
  let tentativa = 0;
  for (;;) {
    try {
      return await operacao();
    } catch (erro) {
      const codigo = (erro as { code?: string }).code ?? '';
      if (!CODIGOS_CONEXAO.has(codigo) || tentativa >= 4) throw erro;
      tentativa++;
      console.warn(`   ⚠️  ${rotulo}: conexão perdida (${codigo}), tentativa ${tentativa}/4...`);
      await db.$disconnect();
      await new Promise((r) => setTimeout(r, 1000 * tentativa));
    }
  }
}

/**
 * Cria/atualiza o parlamentar com os campos fornecidos pelo adapter.
 * Campos ausentes (ex.: `cpf` do Senado) são `undefined` → o Prisma os ignora
 * no update em vez de zerá-los.
 */
export async function upsertParlamentar(
  db: PrismaClient,
  p: ParlamentarNormalizado,
  partidoId: string,
  ufId: string
): Promise<'criado' | 'atualizado'> {
  const dados = {
    nome: p.nome,
    nomeCivil: p.nomeCivil,
    cpf: p.cpf,
    partidoId,
    ufId,
    legislatura: p.legislatura,
    fotoUrl: p.fotoUrl,
    email: p.email,
    telefone: p.telefone,
    situacao: p.situacao,
    dataNascimento: p.dataNascimento,
    naturalidade: p.naturalidade,
    ufNaturalidade: p.ufNaturalidade,
  };

  const existing = await db.parlamentar.findUnique({
    where: { idExterno: p.idExterno },
    select: { id: true },
  });

  if (existing) {
    await db.parlamentar.update({ where: { id: existing.id }, data: dados });
    return 'atualizado';
  }

  await db.parlamentar.create({ data: { idExterno: p.idExterno, casa: p.casa, ...dados } });
  return 'criado';
}

export async function upsertVotacao(db: PrismaClient, v: VotacaoNormalizada): Promise<void> {
  await retentar(
    db,
    () =>
      db.votacao.upsert({
    where: { idExterno: v.idExterno },
    update: {
      data: v.data,
      descricao: v.descricao,
      ementa: v.ementa,
      tema: v.tema,
      resultado: v.resultado,
    },
    create: {
      idExterno: v.idExterno,
      casa: v.casa,
      legislatura: v.legislatura,
      sessao: v.sessao,
      numero: v.numero,
      data: v.data,
      descricao: v.descricao,
      ementa: v.ementa,
      tema: v.tema,
      resultado: v.resultado,
      quorum: v.quorum,
    },
      }),
    'votação'
  );
}

/**
 * Grava votos em lote resolvendo parlamentar/votação por `idExterno`.
 *
 * O upsert por voto fazia 3 idas ao banco por linha — ~30 mil round-trips para
 * um ano de Senado, o que estourava o timeout do Neon e derrubava o sync no
 * meio. Aqui os mapas de id são carregados uma vez e a gravação vai em
 * `INSERT ... ON CONFLICT` de 1000 linhas (idempotente e capaz de atualizar o
 * `tipo` de votos já existentes).
 *
 * Retorna quantos votos entraram e quantos foram ignorados por não ter
 * parlamentar/votação na base (ex.: senador fora do recorte atual).
 */
export async function upsertVotosEmLote(
  db: PrismaClient,
  votos: VotoNormalizado[],
  casa: 'CAMARA' | 'SENADO'
): Promise<{ gravados: number; ignorados: number }> {
  if (votos.length === 0) return { gravados: 0, ignorados: 0 };

  const [parlamentares, votacoes] = await Promise.all([
    db.parlamentar.findMany({ where: { casa }, select: { id: true, idExterno: true } }),
    db.votacao.findMany({ where: { casa }, select: { id: true, idExterno: true } }),
  ]);
  const porParlamentar = new Map(parlamentares.map((p) => [p.idExterno, p.id]));
  const porVotacao = new Map(votacoes.map((v) => [v.idExterno, v.id]));

  // Duplicatas no mesmo INSERT fariam o ON CONFLICT falhar ("cannot affect row
  // a second time"); a última ocorrência vence.
  const unicos = new Map<string, { parlamentarId: string; votacaoId: string; tipo: string }>();
  let ignorados = 0;
  for (const voto of votos) {
    const parlamentarId = porParlamentar.get(voto.parlamentarIdExterno);
    const votacaoId = porVotacao.get(voto.votacaoIdExterno);
    if (!parlamentarId || !votacaoId) {
      ignorados++;
      continue;
    }
    unicos.set(`${parlamentarId}:${votacaoId}`, { parlamentarId, votacaoId, tipo: voto.tipo });
  }

  const linhas = [...unicos.values()].map((l) => ({ id: randomUUID(), ...l }));

  const TAMANHO_LOTE = 1000;
  let gravados = 0;
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE);
    const valores = lote.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4}::"TipoVoto")`).join(', ');
    const parametros = lote.flatMap((l) => [l.id, l.parlamentarId, l.votacaoId, l.tipo]);

    await retentar(
      db,
      () =>
        db.$executeRawUnsafe(
          `INSERT INTO votos (id, parlamentar_id, votacao_id, tipo) VALUES ${valores}
           ON CONFLICT (parlamentar_id, votacao_id) DO UPDATE SET tipo = EXCLUDED.tipo`,
          ...parametros
        ),
      'lote de votos'
    );
    gravados += lote.length;
  }

  return { gravados, ignorados };
}

/** Grava o voto resolvendo parlamentar/votação por idExterno. `false` se algum faltar. */
export async function upsertVotoDoParlamentar(db: PrismaClient, voto: VotoNormalizado): Promise<boolean> {
  const [parlamentar, votacao] = await retentar(
    db,
    () =>
      Promise.all([
        db.parlamentar.findUnique({ where: { idExterno: voto.parlamentarIdExterno }, select: { id: true } }),
        db.votacao.findUnique({ where: { idExterno: voto.votacaoIdExterno }, select: { id: true } }),
      ]),
    'voto'
  );
  if (!parlamentar || !votacao) return false;

  await retentar(
    db,
    () =>
      db.voto.upsert({
        where: {
          parlamentarId_votacaoId: { parlamentarId: parlamentar.id, votacaoId: votacao.id },
        },
        update: { tipo: voto.tipo },
        create: { parlamentarId: parlamentar.id, votacaoId: votacao.id, tipo: voto.tipo },
      }),
    'voto'
  );
  return true;
}

export async function upsertDiscurso(
  db: PrismaClient,
  parlamentarId: string,
  d: DiscursoNormalizado
): Promise<void> {
  await retentar(
    db,
    () =>
      db.discurso.upsert({
    where: { idExterno: d.idExterno },
    update: { resumo: d.resumo, tema: d.tema },
    create: {
      idExterno: d.idExterno,
      parlamentarId,
      casa: d.casa,
      tipo: d.tipo,
      data: d.data,
      hora: d.hora,
      resumo: d.resumo,
      urlOriginal: d.urlOriginal,
      tema: d.tema,
      duracaoSegundos: d.duracaoSegundos,
    },
      }),
    'discurso'
  );
}

export async function upsertFrequencia(
  db: PrismaClient,
  parlamentarId: string,
  f: FrequenciaNormalizada
): Promise<void> {
  const conteudo = {
    totalSessoes: f.totalSessoes,
    presencas: f.presencas,
    faltasJustificadas: f.faltasJustificadas,
    faltasInjustificadas: f.faltasInjustificadas,
    taxaPresenca: f.taxaPresenca,
  };
  await retentar(
    db,
    () =>
      db.frequencia.upsert({
        where: { parlamentarId_ano: { parlamentarId, ano: f.ano } },
        update: conteudo,
        create: { parlamentarId, ano: f.ano, ...conteudo },
      }),
    'frequência'
  );
}

/**
 * Grava a proposição e repõe o histórico de tramitação por inteiro
 * (idempotente: a fonte não dá chave estável por tramitação).
 * Retorna quantas tramitações foram gravadas.
 */
export async function upsertProposicao(
  db: PrismaClient,
  parlamentarId: string,
  p: ProposicaoComTramitacoes
): Promise<number> {
  const prop = await retentar(
    db,
    () =>
      db.proposicao.upsert({
    where: { idExterno: p.idExterno },
    update: {
      status: p.status,
      tema: p.tema,
      ementa: p.ementa,
      // Mantém a autoria corrigida (histórico legado ficou todo como coautoria).
      autorPrincipal: p.autorPrincipal,
    },
    create: {
      idExterno: p.idExterno,
      parlamentarId,
      casa: p.casa,
      tipo: p.tipo,
      numero: p.numero,
      ano: p.ano,
      ementa: p.ementa,
      autorPrincipal: p.autorPrincipal,
      status: p.status,
      dataApresentacao: p.dataApresentacao,
      urlOriginal: p.urlOriginal,
      tema: p.tema,
    },
    }),
    'proposição'
  );

  if (p.tramitacoes.length === 0) return 0;

  await retentar(
    db,
    () =>
      db.$transaction([
        db.tramitacao.deleteMany({ where: { proposicaoId: prop.id } }),
        db.tramitacao.createMany({
          data: p.tramitacoes.map((t) => ({
            proposicaoId: prop.id,
            data: t.data,
            descricao: t.descricao,
            orgao: t.orgao,
            situacao: t.situacao,
          })),
        }),
      ]),
    'tramitações'
  );
  return p.tramitacoes.length;
}

/** Proposição já vinculada ao parlamentar dono da autoria. */
export interface ProposicaoDoLote {
  parlamentarId: string;
  proposicao: ProposicaoComTramitacoes;
}

const TAMANHO_LOTE_PROPOSICOES = 500;
const TAMANHO_LOTE_TRAMITACOES = 3000;
const TAMANHO_CONSULTA_IDS = 1000;

/**
 * Grava muitas proposições com poucas idas ao banco.
 *
 * O caminho unitário (`upsertProposicao`) custa um upsert + uma transação por
 * linha. No bulk de um ano (40 mil+ proposições) isso levava horas e estourava
 * o limite de 6h do GitHub Actions. Aqui as proposições vão em `INSERT ...
 * ON CONFLICT` de 500 linhas e o histórico é reposto em lotes, mantendo o
 * número de round-trips estável independente do tamanho do ano.
 *
 * Mesma semântica do upsert unitário: proposição sem tramitação no arquivo
 * preserva o histórico já gravado.
 */
export async function upsertProposicoesEmLote(
  db: PrismaClient,
  itens: ProposicaoDoLote[]
): Promise<{ proposicoes: number; tramitacoes: number }> {
  if (itens.length === 0) return { proposicoes: 0, tramitacoes: 0 };

  // Duplicatas no mesmo INSERT fariam o ON CONFLICT falhar ("cannot affect row
  // a second time"); a última ocorrência vence.
  const unicos = new Map<string, ProposicaoDoLote>();
  for (const item of itens) unicos.set(item.proposicao.idExterno, item);
  const lista = [...unicos.values()];
  const idExternos = lista.map((i) => i.proposicao.idExterno);

  // Reaproveita o id de quem já existe; gera cuid-like para as novas linhas
  // (o INSERT usa esse id e o ON CONFLICT o descarta para as existentes).
  const idPorExterno = new Map<string, string>();
  for (let i = 0; i < idExternos.length; i += TAMANHO_CONSULTA_IDS) {
    const parte = idExternos.slice(i, i + TAMANHO_CONSULTA_IDS);
    const existentes = await retentar(
      db,
      () =>
        db.proposicao.findMany({
          where: { idExterno: { in: parte } },
          select: { id: true, idExterno: true },
        }),
      'proposições existentes'
    );
    for (const e of existentes) idPorExterno.set(e.idExterno, e.id);
  }
  for (const item of lista) {
    if (!idPorExterno.has(item.proposicao.idExterno)) {
      idPorExterno.set(item.proposicao.idExterno, randomUUID());
    }
  }

  let tramitacoes = 0;

  for (let i = 0; i < lista.length; i += TAMANHO_LOTE_PROPOSICOES) {
    const lote = lista.slice(i, i + TAMANHO_LOTE_PROPOSICOES);

    const linhas = lote.map(({ parlamentarId, proposicao: p }) => [
      idPorExterno.get(p.idExterno)!,
      p.idExterno,
      parlamentarId,
      p.casa,
      p.tipo,
      p.numero,
      p.ano,
      p.ementa,
      p.autorPrincipal,
      p.status,
      p.dataApresentacao,
      p.urlOriginal,
      p.tema ?? null,
    ]);

    const valores = linhas
      .map((_, j) => {
        const b = j * 13;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}::"Casa", $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}::"StatusProposicao", $${b + 11}::timestamp, $${b + 12}, $${b + 13}, now())`;
      })
      .join(', ');

    await retentar(
      db,
      () =>
        db.$executeRawUnsafe(
          `INSERT INTO proposicoes
             (id, id_externo, parlamentar_id, casa, tipo, numero, ano, ementa,
              autor_principal, status, data_apresentacao, url_original, tema, updated_at)
           VALUES ${valores}
           ON CONFLICT (id_externo) DO UPDATE SET
             status = EXCLUDED.status,
             tema = EXCLUDED.tema,
             ementa = EXCLUDED.ementa,
             autor_principal = EXCLUDED.autor_principal,
             updated_at = now()`,
          ...linhas.flat()
        ),
      'lote de proposições'
    );

    const idsComTramitacao: string[] = [];
    const dadosTramitacao: {
      proposicaoId: string;
      data: Date;
      descricao: string;
      orgao: string | null;
      situacao: string;
    }[] = [];

    for (const { proposicao: p } of lote) {
      if (p.tramitacoes.length === 0) continue;
      const proposicaoId = idPorExterno.get(p.idExterno)!;
      idsComTramitacao.push(proposicaoId);
      for (const t of p.tramitacoes) {
        dadosTramitacao.push({
          proposicaoId,
          data: t.data,
          descricao: t.descricao,
          orgao: t.orgao ?? null,
          situacao: t.situacao,
        });
      }
    }

    if (idsComTramitacao.length === 0) continue;

    const partes: (typeof dadosTramitacao)[] = [];
    for (let k = 0; k < dadosTramitacao.length; k += TAMANHO_LOTE_TRAMITACOES) {
      partes.push(dadosTramitacao.slice(k, k + TAMANHO_LOTE_TRAMITACOES));
    }

    // Transação por lote: repor o histórico é atômico e o retry não duplica.
    await retentar(
      db,
      () =>
        db.$transaction([
          db.tramitacao.deleteMany({ where: { proposicaoId: { in: idsComTramitacao } } }),
          ...partes.map((parte) => db.tramitacao.createMany({ data: parte })),
        ]),
      'lote de tramitações'
    );
    tramitacoes += dadosTramitacao.length;
  }

  return { proposicoes: lista.length, tramitacoes };
}
