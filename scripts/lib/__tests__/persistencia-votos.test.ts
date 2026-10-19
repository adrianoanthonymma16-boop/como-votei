import type { PrismaClient } from '@prisma/client';
import { upsertVotosEmLote, retentar } from '../persistencia';

function criarDbFake() {
  const executar = jest.fn(async () => 1);
  const db = {
    parlamentar: { findMany: jest.fn(async () => [{ id: 'p1', idExterno: '10' }]) },
    votacao: { findMany: jest.fn(async () => [{ id: 'v1', idExterno: '100' }]) },
    $executeRawUnsafe: executar,
    $disconnect: jest.fn(async () => undefined),
  };
  return { db: db as unknown as PrismaClient, executar };
}

describe('upsertVotosEmLote', () => {
  it('resolve ids, deduplica e grava em um único INSERT', async () => {
    const { db, executar } = criarDbFake();
    const r = await upsertVotosEmLote(
      db,
      [
        { parlamentarIdExterno: '10', votacaoIdExterno: '100', tipo: 'SIM' },
        { parlamentarIdExterno: '10', votacaoIdExterno: '100', tipo: 'VOTOU' },
        { parlamentarIdExterno: '99', votacaoIdExterno: '100', tipo: 'NAO' },
      ],
      'SENADO'
    );

    expect(r).toEqual({ gravados: 1, ignorados: 1 });
    expect(executar).toHaveBeenCalledTimes(1);
    const [sql] = executar.mock.calls[0] as unknown as [string];
    expect(sql).toContain('ON CONFLICT (parlamentar_id, votacao_id) DO UPDATE SET tipo = EXCLUDED.tipo');
  });

  it('não toca no banco quando não há votos', async () => {
    const { db, executar } = criarDbFake();
    const r = await upsertVotosEmLote(db, [], 'SENADO');
    expect(r).toEqual({ gravados: 0, ignorados: 0 });
    expect(executar).not.toHaveBeenCalled();
  });

  it('divide em lotes de 1000', async () => {
    const { db, executar } = criarDbFake();
    const votos = Array.from({ length: 2500 }, () => ({
      parlamentarIdExterno: '10',
      votacaoIdExterno: '100',
      tipo: 'SIM' as const,
    }));
    // todos iguais → deduplica para 1; força variedade com ids diferentes
    votos.forEach((v, i) => (v.votacaoIdExterno = String(100 + i)));
    const votacoes = Array.from({ length: 2500 }, (_, i) => ({ id: `v${i}`, idExterno: String(100 + i) }));
    (db.votacao.findMany as jest.Mock).mockResolvedValue(votacoes);

    const r = await upsertVotosEmLote(db, votos, 'SENADO');
    expect(r.gravados).toBe(2500);
    expect(executar).toHaveBeenCalledTimes(3);
  });
});

describe('retentar', () => {
  function dbDe(disconnect: jest.Mock) {
    return { $disconnect: disconnect } as unknown as PrismaClient;
  }

  it('repete quando o Neon derruba a conexão', async () => {
    const disconnect = jest.fn(async () => undefined);
    let chamadas = 0;
    const operacao = jest.fn(async () => {
      chamadas++;
      if (chamadas < 3) throw Object.assign(new Error('closed'), { code: 'P1017' });
      return 'ok';
    });

    await expect(retentar(dbDe(disconnect), operacao, 'teste')).resolves.toBe('ok');
    expect(operacao).toHaveBeenCalledTimes(3);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it('não repete erro que não é de conexão', async () => {
    const disconnect = jest.fn(async () => undefined);
    const operacao = jest.fn(async () => {
      throw Object.assign(new Error('boom'), { code: 'P2002' });
    });

    await expect(retentar(dbDe(disconnect), operacao, 'teste')).rejects.toThrow('boom');
    expect(operacao).toHaveBeenCalledTimes(1);
  });
});
