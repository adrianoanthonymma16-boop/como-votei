/**
 * Script de sincronização da Câmara dos Deputados
 * Executa via GitHub Actions (diário 03:00 UTC) ou manualmente
 * 
 * Uso: npx ts-node scripts/sync-camara.ts
 * Variáveis de ambiente necessárias: DATABASE_URL
 */

import { PrismaClient, Casa, TipoVoto, TipoDiscurso, StatusProposicao } from '@prisma/client';
import { NormalizerFactory } from '../src/lib/sync/normalizer-factory';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

interface SyncOptions {
  ano?: number;
  apenasParlamentares?: boolean;
  apenasVotacoes?: boolean;
  apenasDiscursos?: boolean;
  apenasProposicoes?: boolean;
  apenasFrequencia?: boolean;
  debug?: boolean;
}

async function syncCamara(options: SyncOptions = {}) {
  const startTime = Date.now();
  const ano = options.ano || new Date().getFullYear();
  const camara = NormalizerFactory.getCamara();
  camara.resetStats();

  // Quando nenhum "apenas*" está definido, sincroniza tudo.
  // Quando um ou mais "apenas*" estão definidos, sincroniza somente aqueles.
  const onlyFlags = [
    options.apenasParlamentares,
    options.apenasVotacoes,
    options.apenasDiscursos,
    options.apenasProposicoes,
    options.apenasFrequencia,
  ];
  const hasOnly = onlyFlags.some(Boolean);
  const sync = (flag?: boolean) => !hasOnly || !!flag;

  console.log(`\n🏛️  INICIANDO SYNC CÂMARA DOS DEPUTADOS - Ano ${ano}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // 1. Sincronizar Partidos (referência)
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
    }

    // 2. Sincronizar Deputados
    if (sync(options.apenasParlamentares)) {
      console.log('\n👥 Sincronizando deputados...');
      const deputados = await camara.fetchDeputados(57);
      
      let criados = 0, atualizados = 0;
      for (const dep of deputados) {
        // Buscar partido e UF IDs
        const [partido, uf] = await Promise.all([
          prisma.partido.findUnique({ where: { sigla: dep.partidoSigla } }),
          prisma.uf.findUnique({ where: { sigla: dep.ufSigla } }),
        ]);

        if (!partido || !uf) {
          console.warn(`⚠️  Partido/UF não encontrado: ${dep.partidoSigla}/${dep.ufSigla} para ${dep.nome}`);
          continue;
        }

        const existing = await prisma.parlamentar.findUnique({
          where: { idExterno: dep.idExterno },
        });

        if (existing) {
          await prisma.parlamentar.update({
            where: { id: existing.id },
            data: {
              nome: dep.nome,
              nomeCivil: dep.nomeCivil,
              cpf: dep.cpf,
              partidoId: partido.id,
              ufId: uf.id,
              legislatura: dep.legislatura,
              fotoUrl: dep.fotoUrl,
              email: dep.email,
              telefone: dep.telefone,
              situacao: dep.situacao,
              dataNascimento: dep.dataNascimento,
              naturalidade: dep.naturalidade,
              ufNaturalidade: dep.ufNaturalidade,
            },
          });
          atualizados++;
        } else {
          await prisma.parlamentar.create({
            data: {
              idExterno: dep.idExterno,
              cpf: dep.cpf,
              nome: dep.nome,
              nomeCivil: dep.nomeCivil,
              casa: Casa.CAMARA,
              partidoId: partido.id,
              ufId: uf.id,
              legislatura: dep.legislatura,
              fotoUrl: dep.fotoUrl,
              email: dep.email,
              telefone: dep.telefone,
              situacao: dep.situacao,
              dataNascimento: dep.dataNascimento,
              naturalidade: dep.naturalidade,
              ufNaturalidade: dep.ufNaturalidade,
            },
          });
          criados++;
        }
      }
      console.log(`✅ ${criados} criados, ${atualizados} atualizados`);
    }

    // Buscar todos os deputados ativos para syncs subsequentes
    const deputadosDb = await prisma.parlamentar.findMany({
      where: {
        casa: Casa.CAMARA,
        OR: [{ situacao: 'EXERCICIO' }, { situacao: null }],
      },
      select: { id: true, idExterno: true, nome: true },
    });

    console.log(`\n📊 ${deputadosDb.length} deputados ativos para sincronizar`);

    // 3. Sincronizar Votações e Votos
    if (sync(options.apenasVotacoes)) {
      console.log('\n🗳️  Sincronizando votações e votos...');
      
      let totalVotacoes = 0, totalVotos = 0;
      
      for await (const votacoes of camara.fetchVotacoes(ano)) {
        // Upsert votações
        for (const v of votacoes) {
          await prisma.votacao.upsert({
            where: { idExterno: v.idExterno },
            update: {
              data: v.data,
              descricao: v.descricao,
              ementa: v.ementa,
              tema: v.tema,
              resultado: v.resultado,
            },
            create: {
              idExterno: v.idExterno,
              casa: Casa.CAMARA,
              legislatura: v.legislatura,
              sessao: v.sessao,
              numero: v.numero,
              data: v.data,
              descricao: v.descricao,
              ementa: v.ementa,
              tema: v.tema,
              resultado: v.resultado,
              quorum: v.quorum,
            },
          });
        }
        totalVotacoes += votacoes.length;

        // Buscar votos para cada votação
        for (const v of votacoes) {
          const votos = await camara.fetchVotosVotacao(v.idExterno);
          
          for (const voto of votos) {
            const parlamentar = await prisma.parlamentar.findUnique({
              where: { idExterno: voto.parlamentarIdExterno },
              select: { id: true },
            });
            
            const votacao = await prisma.votacao.findUnique({
              where: { idExterno: voto.votacaoIdExterno },
              select: { id: true },
            });

            if (parlamentar && votacao) {
              await prisma.voto.upsert({
                where: {
                  parlamentarId_votacaoId: {
                    parlamentarId: parlamentar.id,
                    votacaoId: votacao.id,
                  },
                },
                update: { tipo: voto.tipo as TipoVoto },
                create: {
                  parlamentarId: parlamentar.id,
                  votacaoId: votacao.id,
                  tipo: voto.tipo as TipoVoto,
                },
              });
              totalVotos++;
            }
          }
        }
      }
      console.log(`✅ ${totalVotacoes} votações, ${totalVotos} votos sincronizados`);
    }

    // 4. Sincronizar Discursos, Proposições e Frequência por deputado
    if (sync(options.apenasDiscursos || options.apenasProposicoes || options.apenasFrequencia)) {
      console.log('\n🎤 Sincronizando discursos, proposições e frequência...');
      
      let totalDiscursos = 0, totalProposicoes = 0, totalFrequencias = 0;
      const batchSize = 10; // Processar em lotes para não estourar memória
      
      for (let i = 0; i < deputadosDb.length; i += batchSize) {
        const batch = deputadosDb.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (dep) => {
          // Discursos
          if (sync(options.apenasDiscursos)) {
            for await (const discursos of camara.fetchDiscursosDeputado(dep.idExterno, ano)) {
              for (const d of discursos) {
                await prisma.discurso.upsert({
                  where: { idExterno: d.idExterno },
                  update: { resumo: d.resumo, tema: d.tema },
                  create: {
                    idExterno: d.idExterno,
                    parlamentarId: dep.id,
                    casa: Casa.CAMARA,
                    tipo: d.tipo as TipoDiscurso,
                    data: d.data,
                    hora: d.hora,
                    resumo: d.resumo,
                    urlOriginal: d.urlOriginal,
                    tema: d.tema,
                    duracaoSegundos: d.duracaoSegundos,
                  },
                });
                totalDiscursos++;
              }
            }
          }

          // Proposições
          if (sync(options.apenasProposicoes)) {
            for await (const proposicoes of camara.fetchProposicoesDeputado(dep.idExterno, ano)) {
              for (const p of proposicoes) {
                await prisma.proposicao.upsert({
                  where: { idExterno: p.idExterno },
                  update: {
                    status: p.status as StatusProposicao,
                    tema: p.tema,
                  },
                  create: {
                    idExterno: p.idExterno,
                    parlamentarId: dep.id,
                    casa: Casa.CAMARA,
                    tipo: p.tipo,
                    numero: p.numero,
                    ano: p.ano,
                    ementa: p.ementa,
                    autorPrincipal: p.autorPrincipal,
                    status: p.status as StatusProposicao,
                    dataApresentacao: p.dataApresentacao,
                    urlOriginal: p.urlOriginal,
                    tema: p.tema,
                  },
                });
                totalProposicoes++;
              }
            }
          }

          // Frequência
          if (sync(options.apenasFrequencia)) {
            const freq = await camara.fetchFrequencia(dep.idExterno, ano);
            if (freq) {
              await prisma.frequencia.upsert({
                where: {
                  parlamentarId_ano: {
                    parlamentarId: dep.id,
                    ano: freq.ano,
                  },
                },
                update: {
                  totalSessoes: freq.totalSessoes,
                  presencas: freq.presencas,
                  faltasJustificadas: freq.faltasJustificadas,
                  faltasInjustificadas: freq.faltasInjustificadas,
                  taxaPresenca: freq.taxaPresenca,
                },
                create: {
                  parlamentarId: dep.id,
                  ano: freq.ano,
                  totalSessoes: freq.totalSessoes,
                  presencas: freq.presencas,
                  faltasJustificadas: freq.faltasJustificadas,
                  faltasInjustificadas: freq.faltasInjustificadas,
                  taxaPresenca: freq.taxaPresenca,
                },
              });
              totalFrequencias++;
            }
          }
        }));

        // Progress
        const progress = Math.min(i + batchSize, deputadosDb.length);
        console.log(`  📈 Progresso: ${progress}/${deputadosDb.length} deputados`);
      }
      console.log(`✅ ${totalDiscursos} discursos, ${totalProposicoes} proposições, ${totalFrequencias} frequências`);
    }

    // Resumo final
    const stats = camara.getStats();
    const tempoTotal = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO SYNC CÂMARA');
    console.log('='.repeat(60));
    console.log(`⏱️  Tempo total: ${tempoTotal} min`);
    console.log(`👥 Parlamentares: ${stats.parlamentares}`);
    console.log(`🗳️  Votações: ${stats.votacoes} | Votos: ${camara.getStats().votos}`);
    console.log(`🎤 Discursos: ${stats.discursos}`);
    console.log(`📋 Proposições: ${stats.proposicoes} | Tramitações: ${stats.tramitacoes}`);
    console.log(`📅 Frequências: ${stats.frequencias}`);
    console.log(`\n✅ Sync Câmara concluído em ${tempoTotal} min`);

  } catch (error) {
    console.error('\n❌ ERRO NO SYNC CÂMARA:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI
const args = process.argv.slice(2);
const options: any = {};

for (const arg of args) {
  if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1]);
  if (arg === '--apenas-parlamentares') options.apenasParlamentares = true;
  if (arg === '--apenas-votacoes') options.apenasVotacoes = true;
  if (arg === '--apenas-discursos') options.apenasDiscursos = true;
  if (arg === '--apenas-proposicoes') options.apenasProposicoes = true;
  if (arg === '--apenas-frequencia') options.apenasFrequencia = true;
  if (arg === '--debug') options.debug = true;
}

syncCamara(options);