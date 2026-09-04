/**
 * Backfill de votos faltantes para votações nominais com 0 votos no banco.
 * Detecta votações CAMARA com descricao contendo "Sim:" mas _count.votos = 0
 * e refaz fetchVotosVotacao para cada uma.
 *
 * Uso: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-votos-faltantes.ts
 */
import { PrismaClient, TipoVoto } from '@prisma/client';
import { NormalizerFactory } from '../src/lib/sync/normalizer-factory';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
  const camara = NormalizerFactory.getCamara();
  console.log('🔍 Buscando votações nominais órfãs (CAMARA, descricao contém Sim:, 0 votos)...');

  // Busca todas CAMARA com Sim: no texto
  const candidatas = await prisma.votacao.findMany({
    where: {
      casa: 'CAMARA',
      descricao: { contains: 'Sim:', mode: 'insensitive' },
    },
    select: { id: true, idExterno: true, descricao: true, data: true },
    orderBy: { data: 'desc' },
  });

  // Filtra onde _count.votos == 0
  const orfas: typeof candidatas = [];
  for (const v of candidatas) {
    const cnt = await prisma.voto.count({ where: { votacaoId: v.id } });
    if (cnt === 0) orfas.push(v);
  }

  console.log(`📌 Encontradas ${orfas.length} votações nominais sem votos (de ${candidatas.length} candidatas com Sim:)`);
  if (orfas.length === 0) {
    console.log('✅ Nada a fazer');
    await prisma.$disconnect();
    return;
  }

  // Pré-carrega mapa idExterno -> parlamentar.id para evitar N+1
  const parlamentares = await prisma.parlamentar.findMany({
    where: { casa: 'CAMARA' },
    select: { id: true, idExterno: true },
  });
  const parMap = new Map(parlamentares.map((p) => [p.idExterno, p.id]));
  console.log(`🗺️  Mapa de ${parMap.size} parlamentares carregado`);

  let totalNovos = 0;
  let falhas = 0;
  let idx = 0;

  for (const v of orfas) {
    idx++;
    console.log(`\n[${idx}/${orfas.length}] ${v.idExterno} — ${v.data.toISOString().slice(0,10)} — ${v.descricao.slice(0,80)}...`);
    try {
      const votos = await camara.fetchVotosVotacao(v.idExterno);
      console.log(`   → API retornou ${votos.length} votos`);
      if (votos.length === 0) {
        console.log('   ⚠️  0 votos na API (pode ser simbólica mal classificada, pulando)');
        continue;
      }
      let inseridos = 0;
      for (const voto of votos) {
        const parlamentarId = parMap.get(voto.parlamentarIdExterno);
        if (!parlamentarId) {
          console.warn(`   ⚠️  parlamentar ${voto.parlamentarIdExterno} não encontrado no banco`);
          continue;
        }
        await prisma.voto.upsert({
          where: {
            parlamentarId_votacaoId: { parlamentarId, votacaoId: v.id },
          },
          update: { tipo: voto.tipo as TipoVoto },
          create: { parlamentarId, votacaoId: v.id, tipo: voto.tipo as TipoVoto },
        });
        inseridos++;
      }
      console.log(`   ✅ ${inseridos} votos upsertados`);
      totalNovos += inseridos;
      // throttle leve para não estourar rate-limit / Neon
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.error(`   ❌ falha em ${v.idExterno}:`, e);
      falhas++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Backfill concluído: ${totalNovos} votos em ${orfas.length - falhas} votações`);
  if (falhas) console.log(`⚠️  ${falhas} falhas`);
  console.log('='.repeat(60));

  // Guardrail pós-backfill
  const restantes = await prisma.$queryRaw<{ cnt: bigint }[]>`SELECT COUNT(*) as cnt FROM votacoes v LEFT JOIN votos vo ON vo.votacao_id = v.id WHERE v.casa = 'CAMARA' AND v.descricao ILIKE '%Sim:%' GROUP BY v.id HAVING COUNT(vo.id)=0`;
  console.log(`🔎 Verificação: ${restantes.length} nominais ainda órfãs`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
