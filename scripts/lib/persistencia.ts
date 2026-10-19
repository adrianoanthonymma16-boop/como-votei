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
import type { PrismaClient } from '@prisma/client';
import type {
  ParlamentarNormalizado,
  VotacaoNormalizada,
  VotoNormalizado,
  DiscursoNormalizado,
  FrequenciaNormalizada,
  ProposicaoComTramitacoes,
} from '../../src/lib/sync/types';

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
  await db.votacao.upsert({
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
  });
}

/** Grava o voto resolvendo parlamentar/votação por idExterno. `false` se algum faltar. */
export async function upsertVotoDoParlamentar(db: PrismaClient, voto: VotoNormalizado): Promise<boolean> {
  const [parlamentar, votacao] = await Promise.all([
    db.parlamentar.findUnique({ where: { idExterno: voto.parlamentarIdExterno }, select: { id: true } }),
    db.votacao.findUnique({ where: { idExterno: voto.votacaoIdExterno }, select: { id: true } }),
  ]);
  if (!parlamentar || !votacao) return false;

  await db.voto.upsert({
    where: {
      parlamentarId_votacaoId: { parlamentarId: parlamentar.id, votacaoId: votacao.id },
    },
    update: { tipo: voto.tipo },
    create: { parlamentarId: parlamentar.id, votacaoId: votacao.id, tipo: voto.tipo },
  });
  return true;
}

export async function upsertDiscurso(
  db: PrismaClient,
  parlamentarId: string,
  d: DiscursoNormalizado
): Promise<void> {
  await db.discurso.upsert({
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
  });
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
  await db.frequencia.upsert({
    where: { parlamentarId_ano: { parlamentarId, ano: f.ano } },
    update: conteudo,
    create: { parlamentarId, ano: f.ano, ...conteudo },
  });
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
  const prop = await db.proposicao.upsert({
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
  });

  if (p.tramitacoes.length === 0) return 0;

  await db.$transaction([
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
  ]);
  return p.tramitacoes.length;
}
