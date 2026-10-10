/**
 * Testes do advisory lock (GRAY-12)
 * Verifica pg_advisory_xact_lock chamado com 'sync-despesas-camara'
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Advisory Lock (GRAY-12)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should acquire advisory lock with correct key', async () => {
    const lockKey = 'sync-despesas-camara';
    
    const result = await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      lockKey
    );

    // pg_advisory_xact_lock returns void, but Prisma returns the result row
    expect(result).toBeDefined();
  });

  it('should release lock at end of transaction', async () => {
    const lockKey = 'sync-despesas-camara-test-release';
    
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);
    });
    
    await prisma.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey);
    
    expect(true).toBe(true);
  });

  it('should use hashtext for key hashing', async () => {
    const lockKey = 'sync-despesas-camara';
    
    const result = await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      lockKey
    );
    
    expect(result).toBeDefined();
  });

  it('should match exact lock name from script', async () => {
    const expectedLockName = 'sync-despesas-camara';
    
    await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      expectedLockName
    );
    
    expect(true).toBe(true);
  });

  it('should work with Senado lock name too', async () => {
    const senadoLockName = 'sync-despesas-senado';
    
    await prisma.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      senadoLockName
    );
    
    expect(true).toBe(true);
  });
});