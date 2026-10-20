import { prisma } from '@/lib/prisma';

export type FonteAnos = 'todos' | 'votos' | 'discursos' | 'proposicoes';

/**
 * Anos com dados para um parlamentar, opcionalmente restritos a uma fonte.
 * Fonte única para os selects "Ano" das abas do perfil — cada aba pede apenas
 * os anos da sua própria fonte, para não abrir num ano sem registros.
 */
export async function anosComDados(
  parlamentarId: string,
  fonte: FonteAnos = 'todos'
): Promise<number[]> {
  if (fonte === 'votos') {
    const rows = await prisma.$queryRaw<{ ano: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM v.data)::int AS ano
      FROM "votacoes" v
      JOIN "votos" x ON x."votacao_id" = v.id
      WHERE x."parlamentar_id" = ${parlamentarId}
      ORDER BY ano DESC`;
    return rows.map((r) => r.ano);
  }

  if (fonte === 'discursos') {
    const rows = await prisma.$queryRaw<{ ano: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM d.data)::int AS ano
      FROM "discursos" d
      WHERE d."parlamentar_id" = ${parlamentarId}
      ORDER BY ano DESC`;
    return rows.map((r) => r.ano);
  }

  if (fonte === 'proposicoes') {
    const rows = await prisma.$queryRaw<{ ano: number }[]>`
      SELECT DISTINCT p."ano" AS ano
      FROM "proposicoes" p
      WHERE p."parlamentar_id" = ${parlamentarId} AND p."ano" IS NOT NULL
      ORDER BY ano DESC`;
    return rows.map((r) => r.ano);
  }

  const rows = await prisma.$queryRaw<{ ano: number }[]>`
    SELECT DISTINCT a.ano FROM (
      SELECT EXTRACT(YEAR FROM v.data)::int AS ano FROM "votacoes" v JOIN "votos" x ON x."votacao_id" = v.id WHERE x."parlamentar_id" = ${parlamentarId}
      UNION SELECT EXTRACT(YEAR FROM d.data)::int FROM "discursos" d WHERE d."parlamentar_id" = ${parlamentarId}
      UNION SELECT p."ano" FROM "proposicoes" p WHERE p."parlamentar_id" = ${parlamentarId}
    ) a ORDER BY ano DESC`;
  return rows.map((r) => r.ano);
}
