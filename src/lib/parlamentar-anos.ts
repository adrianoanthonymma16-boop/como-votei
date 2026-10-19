import { prisma } from '@/lib/prisma';

/**
 * Anos com dados para um parlamentar (votos, discursos ou proposições).
 * Fonte única para os selects "Ano" das abas do perfil — reutilizada pela
 * rota de dashboard e pela rota /anos.
 */
export async function anosComDados(parlamentarId: string): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ ano: number }[]>`
    SELECT DISTINCT a.ano FROM (
      SELECT EXTRACT(YEAR FROM v.data)::int AS ano FROM "votacoes" v JOIN "votos" x ON x."votacao_id" = v.id WHERE x."parlamentar_id" = ${parlamentarId}
      UNION SELECT EXTRACT(YEAR FROM d.data)::int FROM "discursos" d WHERE d."parlamentar_id" = ${parlamentarId}
      UNION SELECT p."ano" FROM "proposicoes" p WHERE p."parlamentar_id" = ${parlamentarId}
    ) a ORDER BY ano DESC`;
  return rows.map((r) => r.ano);
}
