/**
 * Script de sincronização do Senado Federal
 * Executa via GitHub Actions (diário 04:00 UTC) ou manualmente
 * 
 * Uso: npx ts-node scripts/sync-senado.ts
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

async function syncSenado(options: SyncOptions = {}) {
  const startTime = Date.now();
  const ano = options.ano || new Date().getFullYear();
  const senado = NormalizerFactory.getSenado();
  senado.resetStats();

  // Quando nenhum "apenas*" está definido, sincroniza tudo (mesmo padrão da Câmara).
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

  console.log(`\n🏛️  INICIANDO SYNC SENADO FEDERAL - Ano ${ano}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // 1. Sincronizar Senadores
    if (sync(options.apenasParlamentares)) {
      console.log('\n👥 Sincronizando senadores...');
      const senadores = await senado.fetchSenadores();
      
      let criados = 0, atualizados = 0;
      for (const sen of senadores) {
        const [partido, uf] = await Promise.all([
          prisma.partido.findUnique({ where: { sigla: sen.partidoSigla } }),
          prisma.uf.findUnique({ where: { sigla: sen.ufSigla } }),
        ]);

        if (!partido || !uf) {
          console.warn(`⚠️  Partido/UF não encontrado: ${sen.partidoSigla}/${sen.ufSigla} para ${sen.nome}`);
          continue;
        }

        const existing = await prisma.parlamentar.findUnique({
          where: { idExterno: sen.idExterno },
        });

        if (existing) {
          await prisma.parlamentar.update({
            where: { id: existing.id },
            data: {
              nome: sen.nome,
              nomeCivil: sen.nomeCivil,
              partidoId: partido.id,
              ufId: uf.id,
              fotoUrl: sen.fotoUrl,
              email: sen.email,
              telefone: sen.telefone,
              situacao: sen.situacao,
            },
          });
          atualizados++;
        } else {
          await prisma.parlamentar.create({
            data: {
              idExterno: sen.idExterno,
              nome: sen.nome,
              nomeCivil: sen.nomeCivil,
              casa: Casa.SENADO,
              partidoId: partido.id,
              ufId: uf.id,
              legislatura: sen.legislatura,
              fotoUrl: sen.fotoUrl,
              email: sen.email,
              telefone: sen.telefone,
              situacao: sen.situacao,
            },
          });
          criados++;
        }
      }
      console.log(`✅ ${criados} criados, ${atualizados} atualizados`);
    }

    // Buscar senadores ativos
    const senadoresDb = await prisma.parlamentar.findMany({
      where: { casa: Casa.SENADO, situacao: 'EXERCICIO' },
      select: { id: true, idExterno: true, nome: true },
    });

    console.log(`\n📊 ${senadoresDb.length} senadores ativos para sincronizar`);

    // 2. Sincronizar Votações e Votos
    if (sync(options.apenasVotacoes)) {
      console.log('\n🗳️  Sincronizando votações e votos...');
      
      let totalVotacoes = 0, totalVotos = 0;
      
      for (const senador of senadoresDb) {
        for await (const votacoes of senado.fetchVotacoesSenador(senador.idExterno, ano)) {
          for (const v of votacoes) {
            await prisma.votacao.upsert({
              where: { idExterno: v.idExterno },
              update: { data: v.data, descricao: v.descricao, ementa: v.ementa, tema: v.tema },
              create: {
                idExterno: v.idExterno,
                casa: Casa.SENADO,
                legislatura: v.legislatura,
                sessao: v.sessao,
                numero: v.numero,
                data: v.data,
                descricao: v.descricao,
                ementa: v.ementa,
                tema: v.tema,
                resultado: v.resultado,
              },
            });
            totalVotacoes++;
          }

          // Buscar votos
          for (const v of votacoes) {
            const votos = await senado.fetchVotosVotacao(senador.idExterno, v.idExterno);
            
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
        
        // Progress
        console.log(`  📈 ${senador.nome}: ${totalVotacoes} votações processadas`);
      }
      console.log(`✅ ${totalVotacoes} votações, ${totalVotos} votos sincronizados`);
    }

    // 3. Sincronizar Discursos e Frequência
    if (sync(options.apenasDiscursos) || sync(options.apenasFrequencia)) {
      console.log('\n🎤 Sincronizando discursos e frequência...');
      
      let totalDiscursos = 0, totalFrequencias = 0;
      const batchSize = 10;
      
      for (let i = 0; i < senadoresDb.length; i += batchSize) {
        const batch = senadoresDb.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (sen) => {
          // Discursos
          if (sync(options.apenasDiscursos) && !options.apenasFrequencia) {
            for await (const discursos of senado.fetchDiscursosSenador(sen.idExterno, ano)) {
              for (const d of discursos) {
                await prisma.discurso.upsert({
                  where: { idExterno: d.idExterno },
                  update: { resumo: d.resumo, tema: d.tema },
                  create: {
                    idExterno: d.idExterno,
                    parlamentarId: sen.id,
                    casa: Casa.SENADO,
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

          // Frequência
          if (sync(options.apenasFrequencia) && !options.apenasDiscursos) {
            const freq = await senado.fetchFrequencia(sen.idExterno, ano);
            if (freq) {
              await prisma.frequencia.upsert({
                where: {
                  parlamentarId_ano: {
                    parlamentarId: sen.id,
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
                  parlamentarId: sen.id,
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

        const progress = Math.min(i + batchSize, senadoresDb.length);
        console.log(`  📈 Progresso: ${progress}/${senadoresDb.length} senadores`);
      }
      console.log(`✅ ${totalDiscursos} discursos, ${totalFrequencias} frequências`);
    }

    // 4. Sincronizar Proposições (autoria) + Tramitações
    if (sync(options.apenasProposicoes)) {
      console.log('\n📋 Sincronizando proposições e tramitações...');
      console.log('   Fonte: /senador/{codigo}/autorias + /materia/situacaoatual + /materia/movimentacoes');

      let totalProposicoes = 0, totalTramitacoes = 0;
      const batchSize = 5; // detalhe por matéria (2 req) — lote conservador p/ rate limit

      for (let i = 0; i < senadoresDb.length; i += batchSize) {
        const batch = senadoresDb.slice(i, i + batchSize);

        await Promise.all(batch.map(async (sen) => {
          for await (const proposicoes of senado.fetchProposicoesSenador(sen.idExterno, ano)) {
            for (const p of proposicoes) {
              const prop = await prisma.proposicao.upsert({
                where: { idExterno: p.idExterno },
                update: {
                  status: p.status as StatusProposicao,
                  tema: p.tema,
                  ementa: p.ementa,
                },
                create: {
                  idExterno: p.idExterno,
                  parlamentarId: sen.id,
                  casa: Casa.SENADO,
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

              // Histórico é reposto por inteiro (idempotente): a API não dá
              // chave estável por movimentação, então delete + recreate.
              if (p.tramitacoes.length > 0) {
                await prisma.$transaction([
                  prisma.tramitacao.deleteMany({ where: { proposicaoId: prop.id } }),
                  prisma.tramitacao.createMany({
                    data: p.tramitacoes.map((t) => ({
                      proposicaoId: prop.id,
                      data: t.data,
                      descricao: t.descricao,
                      orgao: t.orgao,
                      situacao: t.situacao,
                    })),
                  }),
                ]);
                totalTramitacoes += p.tramitacoes.length;
              }
            }
          }
        }));

        const progress = Math.min(i + batchSize, senadoresDb.length);
        console.log(`  📈 Progresso: ${progress}/${senadoresDb.length} senadores`);
      }
      console.log(`✅ ${totalProposicoes} proposições, ${totalTramitacoes} tramitações`);
    }

    // Resumo final
    const stats = senado.getStats();
    const tempoTotal = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO SYNC SENADO');
    console.log('='.repeat(60));
    console.log(`⏱️  Tempo total: ${tempoTotal} min`);
    console.log(`👥 Parlamentares: ${stats.parlamentares}`);
    console.log(`🗳️  Votações: ${stats.votacoes} | Votos: ${senado.getStats().votos}`);
    console.log(`🎤 Discursos: ${stats.discursos}`);
    console.log(`📋 Proposições: ${stats.proposicoes} | Tramitações: ${stats.tramitacoes}`);
    console.log(`📅 Frequências: ${stats.frequencias}`);
    console.log(`\n✅ Sync Senado concluído em ${tempoTotal} min`);

  } catch (error) {
    console.error('\n❌ ERRO NO SYNC SENADO:', error);
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

syncSenado(options);