/**
 * Coleta de lixo (retenção) do banco — ver src/lib/gc.ts para as regras.
 *
 * Remove registros fora da janela de 3 anos do produto (ANOS_JANELA), cobrindo
 * votações, votos, discursos, proposições, tramitações, frequências e despesas.
 * NUNCA apaga partido/uf/parlamentar.
 *
 * Uso:
 *   npm run gc                 # dry-run (read-only): só reporta o que sairia
 *   npm run gc:apply           # executa os DELETEs fora da janela
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/gc.ts --apply --lote=5000
 *
 * Requer DATABASE_URL (carregado de .env pelo Prisma Client).
 */
import { PrismaClient } from '@prisma/client';
import { executarGc } from '../src/lib/gc';

function parseLote(argv: string[]): number {
  const arg = argv.find((a) => a.startsWith('--lote='));
  const valor = arg ? Number(arg.split('=')[1]) : 5000;
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 5000;
}

async function main() {
  const aplicar = process.argv.includes('--apply');
  const lote = parseLote(process.argv);
  const modo = aplicar ? 'APPLY (DELETE real)' : 'DRY-RUN (read-only)';

  console.log(`🧹 Coleta de lixo do banco — ${modo}`);
  console.log(`   Lote: ${lote} linha(s) por DELETE`);

  const prisma = new PrismaClient();
  try {
    const resultado = await executarGc(prisma, { dryRun: !aplicar, lote });

    console.log(
      `\n🗓️  Janela preservada: ${resultado.anos.join(', ')} — corte em ${resultado.anoCorte}-01-01`
    );

    for (const item of resultado.itens) {
      const marca = item.registros > 0 ? '🗑️ ' : '   ';
      console.log(`  ${marca}${item.rotulo.padEnd(14)} ${item.registros}`);
    }

    if (aplicar) {
      console.log(`\n✅ Removidos ${resultado.total} registro(s) fora da janela.`);
    } else {
      console.log(`\n📊 ${resultado.total} registro(s) seriam removidos.`);
      if (resultado.total > 0) {
        console.log('   ℹ️  Rode `npm run gc:apply` para efetivar.');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Falha na coleta de lixo:', err);
  process.exit(1);
});
