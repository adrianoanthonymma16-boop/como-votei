import type { PrismaClient } from '@prisma/client';
import {
  upsertParlamentar,
  upsertVotacao,
  upsertVotoDoParlamentar,
  upsertDiscurso,
  upsertFrequencia,
  upsertProposicao,
} from '../persistencia';
import type {
  ParlamentarNormalizado,
  VotacaoNormalizada,
  VotoNormalizado,
  DiscursoNormalizado,
  FrequenciaNormalizada,
  ProposicaoComTramitacoes,
} from '../../../src/lib/sync/types';

function makeDb(overrides: Record<string, unknown> = {}): PrismaClient {
  const db = {
    parlamentar: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    votacao: { upsert: jest.fn(), findUnique: jest.fn() },
    voto: { upsert: jest.fn() },
    discurso: { upsert: jest.fn() },
    frequencia: { upsert: jest.fn() },
    proposicao: { upsert: jest.fn() },
    tramitacao: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
    ...overrides,
  };
  return db as unknown as PrismaClient;
}

const parlamentar: ParlamentarNormalizado = {
  idExterno: '1',
  nome: 'Fulana',
  casa: 'CAMARA',
  partidoSigla: 'XP',
  ufSigla: 'SP',
  legislatura: 57,
};

describe('upsertParlamentar', () => {
  it('cria quando não existe', async () => {
    const db = makeDb();
    (db.parlamentar.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(upsertParlamentar(db, parlamentar, 'p1', 'u1')).resolves.toBe('criado');
    expect(db.parlamentar.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ idExterno: '1', casa: 'CAMARA', partidoId: 'p1', ufId: 'u1' }),
    });
    expect(db.parlamentar.update).not.toHaveBeenCalled();
  });

  it('atualiza quando existe', async () => {
    const db = makeDb();
    (db.parlamentar.findUnique as jest.Mock).mockResolvedValue({ id: 'db1' });

    await expect(upsertParlamentar(db, parlamentar, 'p1', 'u1')).resolves.toBe('atualizado');
    expect(db.parlamentar.update).toHaveBeenCalledWith({
      where: { id: 'db1' },
      data: expect.objectContaining({ partidoId: 'p1', ufId: 'u1' }),
    });
    expect(db.parlamentar.create).not.toHaveBeenCalled();
  });
});

describe('upsertVotoDoParlamentar', () => {
  const voto: VotoNormalizado = { parlamentarIdExterno: '1', votacaoIdExterno: '9', tipo: 'SIM' };

  it('retorna false quando faltam parlamentar ou votação', async () => {
    const db = makeDb();
    (db.parlamentar.findUnique as jest.Mock).mockResolvedValue(null);
    (db.votacao.findUnique as jest.Mock).mockResolvedValue({ id: 'v9' });

    await expect(upsertVotoDoParlamentar(db, voto)).resolves.toBe(false);
    expect(db.voto.upsert).not.toHaveBeenCalled();
  });

  it('grava e retorna true quando ambos existem', async () => {
    const db = makeDb();
    (db.parlamentar.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
    (db.votacao.findUnique as jest.Mock).mockResolvedValue({ id: 'v9' });

    await expect(upsertVotoDoParlamentar(db, voto)).resolves.toBe(true);
    expect(db.voto.upsert).toHaveBeenCalledWith({
      where: { parlamentarId_votacaoId: { parlamentarId: 'p1', votacaoId: 'v9' } },
      update: { tipo: 'SIM' },
      create: { parlamentarId: 'p1', votacaoId: 'v9', tipo: 'SIM' },
    });
  });
});

describe('upserts simples', () => {
  it('upsertVotacao usa idExterno', async () => {
    const db = makeDb();
    const v: VotacaoNormalizada = {
      idExterno: 'v1',
      casa: 'SENADO',
      legislatura: 57,
      numero: 3,
      data: new Date('2026-01-01'),
      descricao: 'Votação',
    };
    await upsertVotacao(db, v);
    expect(db.votacao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idExterno: 'v1' } })
    );
  });

  it('upsertDiscurso usa idExterno', async () => {
    const db = makeDb();
    const d: DiscursoNormalizado = {
      idExterno: 'd1',
      parlamentarIdExterno: '1',
      casa: 'CAMARA',
      tipo: 'PLENARIO',
      data: new Date('2026-01-01'),
      resumo: 'r',
      urlOriginal: 'http://x',
    };
    await upsertDiscurso(db, 'p1', d);
    expect(db.discurso.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idExterno: 'd1' }, create: expect.objectContaining({ parlamentarId: 'p1' }) })
    );
  });

  it('upsertFrequencia usa a chave composta parlamentarId_ano', async () => {
    const db = makeDb();
    const f: FrequenciaNormalizada = {
      parlamentarIdExterno: '1',
      ano: 2026,
      totalSessoes: 10,
      presencas: 8,
      faltasJustificadas: 1,
      faltasInjustificadas: 1,
      taxaPresenca: 80,
    };
    await upsertFrequencia(db, 'p1', f);
    expect(db.frequencia.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parlamentarId_ano: { parlamentarId: 'p1', ano: 2026 } } })
    );
  });
});

describe('upsertProposicao', () => {
  const base: ProposicaoComTramitacoes = {
    idExterno: 'SENADO-1',
    parlamentarIdExterno: '1',
    casa: 'SENADO',
    tipo: 'PL',
    numero: 1,
    ano: 2026,
    ementa: 'e',
    autorPrincipal: true,
    status: 'EM_TRAMITACAO',
    dataApresentacao: new Date('2026-02-01'),
    urlOriginal: 'http://x',
    tramitacoes: [],
  };

  it('sem tramitações não abre transação', async () => {
    const db = makeDb();
    (db.proposicao.upsert as jest.Mock).mockResolvedValue({ id: 'prop1' });

    await expect(upsertProposicao(db, 'p1', base)).resolves.toBe(0);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('com tramitações repõe o histórico e retorna a contagem', async () => {
    const db = makeDb();
    (db.proposicao.upsert as jest.Mock).mockResolvedValue({ id: 'prop1' });
    const comTramitacao: ProposicaoComTramitacoes = {
      ...base,
      tramitacoes: [
        { proposicaoIdExterno: 'SENADO-1', data: new Date('2026-02-02'), descricao: 'x', situacao: 'Y' },
        { proposicaoIdExterno: 'SENADO-1', data: new Date('2026-02-03'), descricao: 'z', situacao: 'W' },
      ],
    };

    await expect(upsertProposicao(db, 'p1', comTramitacao)).resolves.toBe(2);
    expect(db.tramitacao.deleteMany).toHaveBeenCalledWith({ where: { proposicaoId: 'prop1' } });
    expect(db.tramitacao.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ proposicaoId: 'prop1', situacao: 'Y' })]),
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });
});
