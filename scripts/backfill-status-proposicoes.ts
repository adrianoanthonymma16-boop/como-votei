/**
 * Backfill do status de proposições já sincronizadas.
 *
 * Contexto Câmara: a listagem /proposicoes NÃO retorna `statusProposicao`,
 * então tudo que foi sincronizado ficou como APRESENTADA. Este script busca o
 * detalhe /proposicoes/{id} e atualiza o status com o mapeamento oficial
 * (ver mapStatusProposicao em src/lib/sync/camara-adapter.ts).
 *
 * Contexto Senado: idem para matérias sincronizadas antes do enriquecimento
 * via /materia/situacaoatual (ver mapStatusProposicaoSenado).
 * idExterno do Senado = `SENADO-{codigo}` — o código é extraído do prefixo.
 *
 * Uso:
 *   npm run backfill:status -- --ano=2024
 *   npm run backfill:status -- --casa=SENADO --ano=2024
 *   npm run backfill:status -- --ano=2024 --dry-run
 *   npm run backfill:status -- --ano=2024 --tipos=PL,PLP,PEC --limit=500
 */
import { PrismaClient } from '@prisma/client';
import { mapStatusProposicao } from '../src/lib/sync/camara-adapter';
import { mapStatusProposicaoSenado } from '../src/lib/sync/senado-adapter';
import { NormalizerFactory } from '../src/lib/sync/normalizer-factory';
import { camaraClient } from '../src/lib/sync/http-client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });
const CAMARA_API_BASE = process.env.CAMARA_API_BASE || 'https://dadosabertos.camara.leg.br/api/v2';
const CONCORRENCIA = 8;

interface Options {
  ano?: number;
  tipos?: string[];
  limit?: number;
  dryRun?: boolean;
  casa?: 'CAMARA' | 'SENADO';
}

async function backfillCamara(where: any, total: number, options: Options) {
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

async function backfillSenado(where: any, total: number, options: Options) {
  const senado = NormalizerFactory.getSenado();
  console.log(`\n📦 ${total} matérias APRESENTADA para revisar${options.ano ? ` (ano ${options.ano})` : ''}`);
  console.log('   Fonte: /materia/situacaoatual/{codigo}');

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
            const codigo = p.idExterno.replace(/^SENADO-/, '');
            if (!codigo || codigo === p.idExterno) {
              falhas++;
              return;
            }
            const sit = await senado.fetchSituacaoMateria(codigo);
            const novo = mapStatusProposicaoSenado(sit.descricao, sit.tramitando);
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

async function backfill(options: Options) {
  const casa = options.casa || 'CAMARA';
  const where: any = { casa, status: 'APRESENTADA' };
  if (options.ano) where.ano = options.ano;
  if (options.tipos?.length) where.tipo = { in: options.tipos };

  const total = await prisma.proposicao.count({ where });
  if (casa === 'SENADO') {
    await backfillSenado(where, total, options);
  } else {
    await backfillCamara(where, total, options);
  }
}

const args = process.argv.slice(2);
const options: Options = {};
for (const arg of args) {
  if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--tipos=')) options.tipos = arg.split('=')[1].split(',');
  if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
  if (arg === '--dry-run') options.dryRun = true;
  if (arg.startsWith('--casa=')) {
    const v = arg.split('=')[1].toUpperCase();
    if (v === 'SENADO' || v === 'CAMARA') options.casa = v;
  }
}

backfill(options).catch(async (e) => {
  console.error('❌ Erro no backfill:', e);
  await prisma.$disconnect();
  process.exit(1);
});
