import { prisma } from '@/lib/prisma';

/**
 * Anos com dados para um parlamentar (votos, discursos ou proposições).
 * Fonte única para os selects "Ano" das abas do perfil — reutilizada pela
 * rota de dashboard e pela rota /anos.
 */
export async function anosComDados(parlamentarId: string): Promise<number[]> {
  const rows = await prisma.$queryRawUnsafe<{ ano: number }[]>(
    `SELECT DISTINCT EXTRACT(YEAR FROM a.dt)::int AS ano FROM (
      SELECT v.data AS dt FROM "votacoes" v JOIN "votos" x ON x."votacao_id" = v.id WHERE x."parlamentar_id" = $1
      UNION SELECT d.data FROM "discursos" d WHERE d."parlamentar_id" = $1
      UNION SELECT p."data_apresentacao" FROM "proposicoes" p WHERE p."parlamentar_id" = $1
    ) a ORDER BY ano DESC`,
    parlamentarId
  );
  return rows.map((r) => r.ano);
}
