/**
 * Backfill do status de proposições já sincronizadas.
 *
 * Contexto: a listagem /proposicoes da Câmara NÃO retorna `statusProposicao`,
 * então tudo que foi sincronizado ficou como APRESENTADA. Este script busca o
 * detalhe /proposicoes/{id} e atualiza o status com o mapeamento oficial
 * (ver mapStatusProposicao em src/lib/sync/camara-adapter.ts).
 *
 * Uso:
 *   npm run backfill:status -- --ano=2024
 *   npm run backfill:status -- --ano=2024 --dry-run
 *   npm run backfill:status -- --ano=2024 --tipos=PL,PLP,PEC --limit=500
 */
import { PrismaClient } from '@prisma/client';
import { mapStatusProposicao } from '../src/lib/sync/camara-adapter';
import { camaraClient } from '../src/lib/sync/http-client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });
const CAMARA_API_BASE = process.env.CAMARA_API_BASE || 'https://dadosabertos.camara.leg.br/api/v2';
const CONCORRENCIA = 8;

interface Options {
  ano?: number;
  tipos?: string[];
  limit?: number;
  dryRun?: boolean;
}

async function backfill(options: Options) {
  const where: any = { casa: 'CAMARA', status: 'APRESENTADA' };
  if (options.ano) where.ano = options.ano;
  if (options.tipos?.length) where.tipo = { in: options.tipos };

  const total = await prisma.proposicao.count({ where });
  console.log(`\n📦 ${total} proposições APRESENTADA para revisar${options.ano ? ` (ano ${options.ano})` : ''}`);

  if (total === 0 || options.dryRun) {
    if (options.dryRun) console.log('(dry-run: nada será alterado)');
    await prisma.$disconnect();
    return;
  }

  const limite = options.limit ?? total;
  let processadas = 0;
  let atualizadas = 0;
  let falhas = 0;

  while (processadas < Math.min(limite, total)) {
    const lote = await prisma.proposicao.findMany({
      where,
      select: { id: true, idExterno: true },
      take: Math.min(200, Math.min(limite, total) - processadas),
    });
    if (lote.length === 0) break;

    for (let i = 0; i < lote.length; i += CONCORRENCIA) {
      await Promise.all(
        lote.slice(i, i + CONCORRENCIA).map(async (p) => {
          try {
            const response = await camaraClient.get(`${CAMARA_API_BASE}/proposicoes/${p.idExterno}`);
            if (!response.ok) {
              falhas++;
              return;
            }
            const data = await response.json();
            const descricao = data?.dados?.statusProposicao?.descricaoSituacao as string | undefined;
            const novo = mapStatusProposicao(descricao);
            if (novo !== 'APRESENTADA') {
              await prisma.proposicao.update({ where: { id: p.id }, data: { status: novo as any } });
              atualizadas++;
            }
          } catch {
            falhas++;
          }
        })
      );
    }

    processadas += lote.length;
    console.log(`  📈 ${processadas}/${Math.min(limite, total)} (atualizadas: ${atualizadas}, falhas: ${falhas})`);
  }

  console.log(`\n✅ Concluído: ${processadas} processadas, ${atualizadas} com status corrigido, ${falhas} falhas`);
  await prisma.$disconnect();
}

const args = process.argv.slice(2);
const options: Options = {};
for (const arg of args) {
  if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--tipos=')) options.tipos = arg.split('=')[1].split(',');
  if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') options.dryRun = true;
}

backfill(options).catch(async (e) => {
  console.error('❌ Erro no backfill:', e);
  await prisma.$disconnect();
  process.exit(1);
});
