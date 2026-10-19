/**
 * Relatório de cobertura dos dados legislativos das duas casas.
 *
 * Uso:
 *   set -a; source .env; set +a
 *   npm run coverage
 *
 * Sai com código 1 quando um dataset que a fonte publica está zerado no banco
 * ou quando há votações nominais sem nenhum voto. Lacunas de fonte, quando
 * comprovadas, entram em LACUNAS_CONHECIDAS com o motivo — e continuam
 * visíveis no relatório como "documentada", nunca como sucesso.
 */

import { PrismaClient } from '@prisma/client';
import {
  ANOS_COBERTURA,
  CASAS_COBERTURA,
  DATASETS_COBERTURA,
  chaveCelula,
  montarRelatorio,
  variacoesSuspeitas,
  type CelulaCobertura,
  type DatasetCobertura,
} from './lib/coverage';

const prisma = new PrismaClient();

/**
 * Lacunas comprovadas na fonte, por `CASA:ANO:dataset`.
 * Só entra aqui o que foi verificado contra a API/arquivo oficial — com o
 * motivo escrito. Lacuna sem evidência reprova o relatório.
 */
const LACUNAS_CONHECIDAS: Record<string, string> = {};

const ANO_CORRENTE = new Date().getFullYear();

function log(ano: number, dataset: DatasetCobertura, total: number) {
  console.log(`  ${dataset.padEnd(12)} ${ano}  ${String(total).padStart(9)}`);
}

async function contarPorCasaAno(sql: string): Promise<Record<string, number>> {
  const linhas = await prisma.$queryRawUnsafe<Array<{ casa: string; ano: number; total: number }>>(sql);
  const mapa: Record<string, number> = {};
  for (const linha of linhas) {
    mapa[`${linha.casa}:${Number(linha.ano)}`] = Number(linha.total);
  }
  return mapa;
}

async function contarVotacoes(): Promise<Record<string, number>> {
  return contarPorCasaAno(`
    SELECT casa, EXTRACT(YEAR FROM data)::int AS ano, COUNT(*)::int AS total
    FROM votacoes
    WHERE EXTRACT(YEAR FROM data) BETWEEN ${ANOS_COBERTURA[0]} AND ${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}
    GROUP BY 1, 2
  `);
}

async function contarVotos(): Promise<Record<string, number>> {
  return contarPorCasaAno(`
    SELECT v.casa, EXTRACT(YEAR FROM v.data)::int AS ano, COUNT(*)::int AS total
    FROM votos vo
    JOIN votacoes v ON v.id = vo.votacao_id
    WHERE EXTRACT(YEAR FROM v.data) BETWEEN ${ANOS_COBERTURA[0]} AND ${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}
    GROUP BY 1, 2
  `);
}

async function contarProposicoes(): Promise<Record<string, number>> {
  return contarPorCasaAno(`
    SELECT casa, ano, COUNT(*)::int AS total
    FROM proposicoes
    WHERE ano BETWEEN ${ANOS_COBERTURA[0]} AND ${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}
    GROUP BY 1, 2
  `);
}

async function contarDiscursos(): Promise<Record<string, number>> {
  return contarPorCasaAno(`
    SELECT casa, EXTRACT(YEAR FROM data)::int AS ano, COUNT(*)::int AS total
    FROM discursos
    WHERE EXTRACT(YEAR FROM data) BETWEEN ${ANOS_COBERTURA[0]} AND ${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}
    GROUP BY 1, 2
  `);
}

interface LinhaEmendas {
  ano: number;
  total: number;
  comDono: number;
  semUf: number;
}

async function contarEmendas(): Promise<LinhaEmendas[]> {
  const linhas = await prisma.$queryRawUnsafe<
    Array<{ ano: number; total: number; com_dono: number; sem_uf: number }>
  >(`
    SELECT ano,
      COUNT(*)::int AS total,
      COUNT(parlamentar_id)::int AS com_dono,
      COUNT(*) FILTER (WHERE localidade_tipo = 'DESCONHECIDO')::int AS sem_uf
    FROM emendas
    WHERE ano BETWEEN ${ANOS_COBERTURA[0]} AND ${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}
    GROUP BY 1
    ORDER BY 1 DESC
  `);
  return linhas.map((l) => ({
    ano: Number(l.ano),
    total: Number(l.total),
    comDono: Number(l.com_dono),
    semUf: Number(l.sem_uf),
  }));
}

async function contarNominaisOrfas(): Promise<number> {
  const linhas = await prisma.$queryRaw<Array<{ cnt: number }>>`
    SELECT COUNT(*)::int AS cnt
    FROM votacoes v
    WHERE v.descricao ILIKE '%Sim:%'
      AND NOT EXISTS (SELECT 1 FROM votos vo WHERE vo.votacao_id = v.id)
  `;
  return Number(linhas[0]?.cnt ?? 0);
}

async function principal() {
  const porDataset: Record<DatasetCobertura, Record<string, number>> = {
    votacoes: await contarVotacoes(),
    votos: await contarVotos(),
    proposicoes: await contarProposicoes(),
    discursos: await contarDiscursos(),
  };

  const celulas: CelulaCobertura[] = [];
  for (const casa of CASAS_COBERTURA) {
    for (const dataset of DATASETS_COBERTURA) {
      for (const ano of ANOS_COBERTURA) {
        celulas.push({ casa, ano, dataset, total: porDataset[dataset][`${casa}:${ano}`] ?? 0 });
      }
    }
  }

  const anteriores: Record<string, number> = {};
  for (const dataset of DATASETS_COBERTURA) {
    for (const [chave, total] of Object.entries(porDataset[dataset])) {
      const [casa, ano] = chave.split(':');
      anteriores[chaveCelula(casa, Number(ano), dataset)] = total;
    }
  }

  const relatorio = montarRelatorio(celulas, LACUNAS_CONHECIDAS, ANO_CORRENTE, anteriores);
  const nominaisOrfas = await contarNominaisOrfas();
  const emendas = await contarEmendas();

  console.log(`\nCobertura ${ANOS_COBERTURA[0]}–${ANOS_COBERTURA[ANOS_COBERTURA.length - 1]}\n`);
  for (const casa of CASAS_COBERTURA) {
    console.log(casa);
    for (const dataset of DATASETS_COBERTURA) {
      const linhas = relatorio.linhas.filter((l) => l.casa === casa && l.dataset === dataset);
      for (const linha of linhas) log(linha.ano, dataset, linha.total);
    }
    console.log('');
  }

  const suspeitas = variacoesSuspeitas(relatorio.linhas);
  if (suspeitas.length > 0) {
    console.log('Variações fora de ±30% (alerta, não reprova):');
    for (const linha of suspeitas) {
      console.log(`  ${linha.casa} ${linha.dataset} ${linha.ano}: ${linha.variacao}%`);
    }
    console.log('');
  }

  if (relatorio.documentadas.length > 0) {
    console.log('Lacunas documentadas:');
    for (const linha of relatorio.documentadas) {
      console.log(`  ${linha.casa} ${linha.ano} ${linha.dataset}: ${linha.motivo}`);
    }
    console.log('');
  }

  if (relatorio.falhas.length > 0) {
    console.error('❌ Lacunas não documentadas:');
    for (const linha of relatorio.falhas) {
      console.error(`  ${linha.casa} ${linha.ano} ${linha.dataset}`);
    }
  }

  const totalEmendas = emendas.reduce((soma, l) => soma + l.total, 0);
  const emendasComDono = emendas.reduce((soma, l) => soma + l.comDono, 0);
  console.log('Emendas (Portal da Transparência):');
  for (const linha of emendas) {
    const pctDono = linha.total > 0 ? ((linha.comDono / linha.total) * 100).toFixed(1) : '0.0';
    console.log(
      `  ${linha.ano}  total ${String(linha.total).padStart(7)}  com autor ${pctDono.padStart(5)}%  localidade s/ UF ${linha.semUf}`
    );
  }
  if (emendas.length === 0) {
    console.error('❌ Nenhuma emenda no banco — sync de emendas não rodou');
  } else if (totalEmendas > 0 && emendasComDono / totalEmendas < 0.5) {
    console.error('❌ Match de autoria de emendas abaixo de 50%');
  }
  console.log('');

  console.log(`Nominais sem votos: ${nominaisOrfas}`);
  if (nominaisOrfas > 15) {
    console.error('❌ Muitas nominais sem votos — sync incompleto');
  }

  const falhou =
    relatorio.falhas.length > 0 ||
    nominaisOrfas > 15 ||
    emendas.length === 0 ||
    (totalEmendas > 0 && emendasComDono / totalEmendas < 0.5);
  console.log(falhou ? '\n❌ Cobertura incompleta' : '\n✅ Cobertura OK');
  process.exitCode = falhou ? 1 : 0;
}

principal()
  .catch((erro) => {
    console.error('Erro no relatório de cobertura:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
