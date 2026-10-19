/**
 * Script de sincronização do Senado Federal
 * Executa via GitHub Actions (diário 04:00 UTC) ou manualmente
 *
 * Uso: npx ts-node scripts/sync-senado.ts
 * Variáveis de ambiente necessárias: DATABASE_URL
 *
 * A persistência (upsert) e o CLI ficam em `scripts/lib/` — compartilhados com
 * o sync da Câmara para não divergirem.
 */

import { PrismaClient, Casa } from '@prisma/client';
import { NormalizerFactory } from '../src/lib/sync/normalizer-factory';
import { anoCorrente } from '../src/lib/ano-padrao';
import {
  parseSyncArgs,
  criarSeletorDeFases,
  imprimirCabecalho,
  imprimirResumo,
  type SyncOptions,
} from './lib/sync-comum';
import {
  upsertParlamentar,
  upsertVotacao,
  upsertVotoDoParlamentar,
  upsertDiscurso,
  upsertFrequencia,
  upsertProposicao,
} from './lib/persistencia';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function syncSenado(options: SyncOptions = {}) {
  const startTime = Date.now();
  const ano = options.ano || anoCorrente();
  const senado = NormalizerFactory.getSenado();
  senado.resetStats();

  const sync = criarSeletorDeFases(options);

  imprimirCabecalho('SENADO FEDERAL', ano);

  try {
    // 1. Senadores
    if (sync(options.apenasParlamentares)) {
      console.log('\n👥 Sincronizando senadores...');
      const senadores = await senado.fetchSenadores();
      let criados = 0;
      let atualizados = 0;

      for (const sen of senadores) {
        const [partido, uf] = await Promise.all([
          prisma.partido.findUnique({ where: { sigla: sen.partidoSigla } }),
          prisma.uf.findUnique({ where: { sigla: sen.ufSigla } }),
        ]);

        if (!partido || !uf) {
          console.warn(`⚠️  Partido/UF não encontrado: ${sen.partidoSigla}/${sen.ufSigla} para ${sen.nome}`);
          continue;
        }

        const resultado = await upsertParlamentar(prisma, sen, partido.id, uf.id);
        if (resultado === 'criado') criados++;
        else atualizados++;
      }
      console.log(`✅ ${criados} criados, ${atualizados} atualizados`);
    }

    // Senadores ativos
    const senadoresDb = await prisma.parlamentar.findMany({
      where: { casa: Casa.SENADO, situacao: 'EXERCICIO' },
      select: { id: true, idExterno: true, nome: true },
    });

    console.log(`\n📊 ${senadoresDb.length} senadores ativos para sincronizar`);

    // 2. Votações e Votos
    if (sync(options.apenasVotacoes)) {
      console.log('\n🗳️  Sincronizando votações e votos...');
      let totalVotacoes = 0;
      let totalVotos = 0;

      for (const senador of senadoresDb) {
        for await (const votacoes of senado.fetchVotacoesSenador(senador.idExterno, ano)) {
          for (const v of votacoes) {
            await upsertVotacao(prisma, v);
            totalVotacoes++;
          }

          for (const v of votacoes) {
            const votos = await senado.fetchVotosVotacao(senador.idExterno, v.idExterno);
            for (const voto of votos) {
              if (await upsertVotoDoParlamentar(prisma, voto)) totalVotos++;
            }
          }
        }

        console.log(`  📈 ${senador.nome}: ${totalVotacoes} votações processadas`);
      }
      console.log(`✅ ${totalVotacoes} votações, ${totalVotos} votos sincronizados`);
    }

    // 3. Discursos e Frequência
    if (sync(options.apenasDiscursos) || sync(options.apenasFrequencia)) {
      console.log('\n🎤 Sincronizando discursos e frequência...');
      let totalDiscursos = 0;
      let totalFrequencias = 0;
      const batchSize = 10;

      for (let i = 0; i < senadoresDb.length; i += batchSize) {
        const batch = senadoresDb.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (sen) => {
            if (sync(options.apenasDiscursos)) {
              for await (const discursos of senado.fetchDiscursosSenador(sen.idExterno, ano)) {
                for (const d of discursos) {
                  await upsertDiscurso(prisma, sen.id, d);
                  totalDiscursos++;
                }
              }
            }

            if (sync(options.apenasFrequencia)) {
              const freq = await senado.fetchFrequencia(sen.idExterno, ano);
              if (freq) {
                await upsertFrequencia(prisma, sen.id, freq);
                totalFrequencias++;
              }
            }
          })
        );

        const progress = Math.min(i + batchSize, senadoresDb.length);
        console.log(`  📈 Progresso: ${progress}/${senadoresDb.length} senadores`);
      }
      console.log(`✅ ${totalDiscursos} discursos, ${totalFrequencias} frequências`);
    }

    // 4. Proposições (autoria) + Tramitações
    if (sync(options.apenasProposicoes)) {
      console.log('\n📋 Sincronizando proposições e tramitações...');
      console.log('   Fonte: /senador/{codigo}/autorias + /materia/situacaoatual + /materia/movimentacoes');
      let totalProposicoes = 0;
      let totalTramitacoes = 0;
      const batchSize = 5; // detalhe por matéria (2 req) — lote conservador p/ rate limit

      for (let i = 0; i < senadoresDb.length; i += batchSize) {
        const batch = senadoresDb.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (sen) => {
            for await (const proposicoes of senado.fetchProposicoesSenador(sen.idExterno, ano)) {
              for (const p of proposicoes) {
                const gravadas = await upsertProposicao(prisma, sen.id, p);
                totalProposicoes++;
                totalTramitacoes += gravadas;
              }
            }
          })
        );

        const progress = Math.min(i + batchSize, senadoresDb.length);
        console.log(`  📈 Progresso: ${progress}/${senadoresDb.length} senadores`);
      }
      console.log(`✅ ${totalProposicoes} proposições, ${totalTramitacoes} tramitações`);
    }

    imprimirResumo('SENADO', senado.getStats(), startTime);
  } catch (error) {
    console.error('\n❌ ERRO NO SYNC SENADO:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncSenado(parseSyncArgs(process.argv.slice(2)));
