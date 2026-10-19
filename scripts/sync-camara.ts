/**
 * Script de sincronização da Câmara dos Deputados
 * Executa via GitHub Actions (diário 03:00 UTC) ou manualmente
 *
 * Uso: npx ts-node scripts/sync-camara.ts
 * Variáveis de ambiente necessárias: DATABASE_URL
 *
 * A persistência (upsert) e o CLI ficam em `scripts/lib/` — compartilhados com
 * o sync do Senado para não divergirem.
 */

import { PrismaClient, Casa } from '@prisma/client';
import { NormalizerFactory } from '../src/lib/sync/normalizer-factory';
import { anoCorrente } from '../src/lib/ano-padrao';
import {
  parseSyncArgs,
  criarSeletorDeFases,
  imprimirCabecalho,
  imprimirResumo,
  aplicarFaixa,
  descreverFaixa,
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
import { syncProposicoesBulk, syncVotacoesBulk } from './lib/camara-bulk';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function syncCamara(options: SyncOptions = {}) {
  const startTime = Date.now();
  const ano = options.ano || anoCorrente();
  const camara = NormalizerFactory.getCamara();
  camara.resetStats();

  const sync = criarSeletorDeFases(options);

  imprimirCabecalho('CÂMARA DOS DEPUTADOS', ano);

  try {
    // 1. Partidos (referência) + 2. Deputados
    if (sync(options.apenasParlamentares)) {
      console.log('\n📋 Sincronizando partidos...');
      const partidos = await camara.fetchPartidos();
      for (const partido of partidos) {
        await prisma.partido.upsert({
          where: { sigla: partido.sigla },
          update: { nome: partido.nome, ideologia: partido.ideologia, cor: partido.cor },
          create: { sigla: partido.sigla, nome: partido.nome, ideologia: partido.ideologia, cor: partido.cor },
        });
      }
      console.log(`✅ ${partidos.length} partidos sincronizados`);

      console.log('\n👥 Sincronizando deputados...');
      const deputados = await camara.fetchDeputados(57);
      let criados = 0;
      let atualizados = 0;

      for (const dep of deputados) {
        const [partido, uf] = await Promise.all([
          prisma.partido.findUnique({ where: { sigla: dep.partidoSigla } }),
          prisma.uf.findUnique({ where: { sigla: dep.ufSigla } }),
        ]);

        if (!partido || !uf) {
          console.warn(`⚠️  Partido/UF não encontrado: ${dep.partidoSigla}/${dep.ufSigla} para ${dep.nome}`);
          continue;
        }

        const resultado = await upsertParlamentar(prisma, dep, partido.id, uf.id);
        if (resultado === 'criado') criados++;
        else atualizados++;
      }
      console.log(`✅ ${criados} criados, ${atualizados} atualizados`);
    }

    // Deputados ativos para os syncs subsequentes
    const deputadosDbTotal = await prisma.parlamentar.findMany({
      where: {
        casa: Casa.CAMARA,
        OR: [{ situacao: 'EXERCICIO' }, { situacao: null }],
      },
      select: { id: true, idExterno: true, nome: true },
      orderBy: { id: 'asc' },
    });
    const deputadosDb = aplicarFaixa(deputadosDbTotal, options);

    console.log(
      `\n📊 ${descreverFaixa(deputadosDbTotal.length, deputadosDb.length, options)} deputados ativos para sincronizar`
    );

    // 3. Votações e Votos
    if (sync(options.apenasVotacoes)) {
      console.log('\n🗳️  Sincronizando votações e votos...');
      let totalVotacoes = 0;
      let totalVotos = 0;

      if (options.bulk) {
        // Arquivos em lote: 2 downloads por ano em vez de 1 request por votação.
        const resultado = await syncVotacoesBulk(prisma, ano, console.log);
        console.log(`   ${resultado.votos} votos (bulk)`);
        totalVotacoes = resultado.votacoes;
        totalVotos = resultado.votos;
      } else {
        for await (const votacoes of camara.fetchVotacoes(ano)) {
          for (const v of votacoes) {
            await upsertVotacao(prisma, v);
            totalVotacoes++;
          }

          for (const v of votacoes) {
            const votos = await camara.fetchVotosVotacao(v.idExterno);
            for (const voto of votos) {
              if (await upsertVotoDoParlamentar(prisma, voto)) totalVotos++;
            }
          }
        }
      }

      console.log(`✅ ${totalVotacoes} votações, ${totalVotos} votos sincronizados`);
    }

    // 3b. Proposições via bulk (independente de deputado).
    if (sync(options.apenasProposicoes) && options.bulk) {
      console.log('\n📋 Sincronizando proposições (bulk)...');
      const resultado = await syncProposicoesBulk(prisma, ano, console.log);
      console.log(
        `✅ ${resultado.proposicoes} proposições, ${resultado.tramitacoes} tramitações (fora do ano ignoradas: ${resultado.ignoradasSemAno})`
      );
    }

    // 4. Discursos, Proposições e Frequência por deputado
    const precisaPassarPorDeputado =
      sync(options.apenasDiscursos) ||
      sync(options.apenasFrequencia) ||
      (sync(options.apenasProposicoes) && !options.bulk);

    if (precisaPassarPorDeputado) {
      console.log('\n🎤 Sincronizando discursos, proposições e frequência...');

      let totalDiscursos = 0;
      let totalProposicoes = 0;
      let totalFrequencias = 0;
      let deputadosComFalha = 0;
      const batchSize = 10;

      for (let i = 0; i < deputadosDb.length; i += batchSize) {
        const batch = deputadosDb.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (dep) => {
            try {
              if (sync(options.apenasDiscursos)) {
                for await (const discursos of camara.fetchDiscursosDeputado(dep.idExterno, ano)) {
                  for (const d of discursos) {
                    await upsertDiscurso(prisma, dep.id, d);
                    totalDiscursos++;
                  }
                }
              }

              if (sync(options.apenasProposicoes) && !options.bulk) {
                for await (const proposicoes of camara.fetchProposicoesDeputado(dep.idExterno, ano)) {
                  for (const p of proposicoes) {
                    await upsertProposicao(prisma, dep.id, p);
                    totalProposicoes++;
                  }
                }
              }

              if (sync(options.apenasFrequencia)) {
                const freq = await camara.fetchFrequencia(dep.idExterno, ano);
                if (freq) {
                  await upsertFrequencia(prisma, dep.id, freq);
                  totalFrequencias++;
                }
              }
            } catch (error) {
              // Um deputado com erro na fonte não pode derrubar o sync inteiro
              // (a fonte devolve 500 esporádico em discursos); segue para o próximo.
              deputadosComFalha++;
              console.warn(
                `   ⚠️  ${dep.nome}: ${error instanceof Error ? error.message : 'falha ao sincronizar'}`
              );
            }
          })
        );

        const progress = Math.min(i + batchSize, deputadosDb.length);
        console.log(`  📈 Progresso: ${progress}/${deputadosDb.length} deputados`);
      }
      console.log(
        `✅ ${totalDiscursos} discursos, ${totalProposicoes} proposições, ${totalFrequencias} frequências` +
          (deputadosComFalha ? ` (${deputadosComFalha} deputados com falha na fonte)` : '')
      );
    }

    imprimirResumo('CÂMARA', camara.getStats(), startTime);
  } catch (error) {
    console.error('\n❌ ERRO NO SYNC CÂMARA:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncCamara(parseSyncArgs(process.argv.slice(2)));
