/**
 * Sincronização de emendas parlamentares (Portal da Transparência).
 *
 * Uso:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-emendas.ts --ano=2025
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-emendas.ts --apenas-emendas
 *
 * Variáveis de ambiente:
 *   DATABASE_URL    (obrigatória)
 *   PORTAL_API_KEY  (obrigatória) — chave da API do Portal (header chave-api-dados)
 *
 * Flags:
 *   --ano=YYYY        (opcional; default: janela de 3 anos)
 *   --apenas-emendas  (aceita por compatibilidade com o step diário)
 *   --debug           (log detalhado de páginas e registros sem match)
 *
 * Fonte: GET /api-de-dados/emendas?ano=YYYY&pagina=N — 15 registros/página,
 * sem total informado; para quando a página vier vazia. Autor resolvido por
 * match exato de nome (nunca fuzzy); sem match, a emenda é gravada sem dono.
 */

import { PrismaClient } from '@prisma/client';
import { portalTransparenciaClient } from '../src/lib/sync/http-client';
import { parseBRL } from '../src/lib/despesas';
import { janelaAnos } from '../src/lib/ano-padrao';
import { valoresDaEmenda, parseLocalidadeGasto } from '../src/lib/emendas';
import {
  ALIASES_EMENDA,
  construirDiretorioPorNome,
  matchAutorEmenda,
  type DiretorioPorNome,
} from '../src/lib/emendas-match';
import { deletarForaDaJanela, especDaTabela } from '../src/lib/gc';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

const PORTAL_BASE = 'https://api.portaldatransparencia.gov.br/api-de-dados';
const BATCH_SIZE = 1000;

interface SyncOptions {
  ano?: number;
  apenasEmendas?: boolean;
  debug?: boolean;
}

/** Registro cru da API (campos usados; a fonte devolve mais). */
interface EmendaPortal {
  codigoEmenda?: string;
  ano?: number;
  tipoEmenda?: string;
  autor?: string;
  nomeAutor?: string;
  numeroEmenda?: string;
  localidadeDoGasto?: string;
  funcao?: string;
  subfuncao?: string;
  valorEmpenhado?: string;
  valorLiquidado?: string;
  valorPago?: string;
  valorRestoInscrito?: string;
  valorRestoCancelado?: string;
  valorRestoPago?: string;
}

interface EmendaGravavel {
  codigoEmenda: string;
  parlamentarId: string | null;
  ano: number;
  tipo: string;
  numeroEmenda: string | null;
  nomeAutorRaw: string;
  funcao: string | null;
  subfuncao: string | null;
  localidadeRaw: string | null;
  uf: string | null;
  municipio: string | null;
  localidadeTipo: string | null;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorPago: number;
  valorRestoInscrito: number;
  valorRestoCancelado: number;
  valorRestoPago: number;
}

function exigirChavePortal(): string {
  const chave = process.env.PORTAL_API_KEY?.trim();
  if (!chave) {
    throw new Error('PORTAL_API_KEY ausente — defina no .env (chave da API do Portal)');
  }
  return chave;
}

async function buildDiretorio(): Promise<DiretorioPorNome> {
  const parlamentares = await prisma.parlamentar.findMany({ select: { id: true, nome: true } });
  return construirDiretorioPorNome(parlamentares);
}

function numeroOuZero(valor: string | undefined): number {
  // A fonte publica negativo com espaço ("- 37.729,24") — normaliza antes.
  const limpo = valor?.replace(/\s+/g, '');
  const parsed = parseBRL(limpo);
  return parsed === null ? 0 : Number(parsed);
}

function mapearEmenda(
  bruto: EmendaPortal,
  ano: number,
  diretorio: DiretorioPorNome
): EmendaGravavel | null {
  const codigoEmenda = String(bruto.codigoEmenda ?? '').trim();
  if (!codigoEmenda) return null;

  const localidadeRaw = bruto.localidadeDoGasto?.trim() || null;
  const localidade = parseLocalidadeGasto(localidadeRaw);
  const nomeAutorRaw = String(bruto.nomeAutor ?? bruto.autor ?? '').trim();
  const valores = valoresDaEmenda(bruto);

  return {
    codigoEmenda,
    parlamentarId: matchAutorEmenda(nomeAutorRaw, diretorio, ALIASES_EMENDA),
    ano: Number.isFinite(bruto.ano) && bruto.ano ? Number(bruto.ano) : ano,
    tipo: String(bruto.tipoEmenda ?? '').trim() || 'Não informado',
    numeroEmenda: bruto.numeroEmenda?.trim() || null,
    nomeAutorRaw: nomeAutorRaw || 'Não informado',
    funcao: bruto.funcao?.trim() || null,
    subfuncao: bruto.subfuncao?.trim() || null,
    localidadeRaw,
    uf: localidade.uf,
    municipio: localidade.municipio,
    localidadeTipo: localidade.tipo,
    valorEmpenhado: numeroOuZero(bruto.valorEmpenhado),
    valorLiquidado: numeroOuZero(bruto.valorLiquidado),
    valorPago: valores.valorPago,
    valorRestoInscrito: numeroOuZero(bruto.valorRestoInscrito),
    valorRestoCancelado: numeroOuZero(bruto.valorRestoCancelado),
    valorRestoPago: numeroOuZero(bruto.valorRestoPago),
  };
}

async function buscarPagina(chave: string, ano: number, pagina: number): Promise<EmendaPortal[]> {
  const url = `${PORTAL_BASE}/emendas?ano=${ano}&pagina=${pagina}`;
  const res = await portalTransparenciaClient.get(url, {
    headers: { 'chave-api-dados': chave, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Portal respondeu ${res.status} em /emendas?ano=${ano}&pagina=${pagina}`);
  }
  const json = (await res.json()) as unknown;
  return Array.isArray(json) ? (json as EmendaPortal[]) : [];
}

const COLUNAS = [
  'codigo_emenda',
  'parlamentar_id',
  'ano',
  'tipo',
  'numero_emenda',
  'nome_autor_raw',
  'funcao',
  'subfuncao',
  'localidade_raw',
  'uf',
  'municipio',
  'localidade_tipo',
  'valor_empenhado',
  'valor_liquidado',
  'valor_pago',
  'valor_resto_inscrito',
  'valor_resto_cancelado',
  'valor_resto_pago',
] as const;

function linhaDaEmenda(e: EmendaGravavel): unknown[] {
  return [
    e.codigoEmenda,
    e.parlamentarId,
    e.ano,
    e.tipo,
    e.numeroEmenda,
    e.nomeAutorRaw,
    e.funcao,
    e.subfuncao,
    e.localidadeRaw,
    e.uf,
    e.municipio,
    e.localidadeTipo,
    e.valorEmpenhado,
    e.valorLiquidado,
    e.valorPago,
    e.valorRestoInscrito,
    e.valorRestoCancelado,
    e.valorRestoPago,
  ];
}

/**
 * Grava em lote com ON CONFLICT (codigo_emenda). Deduplica dentro do lote
 * (a última ocorrência vence) porque o Postgres rejeita a mesma chave duas
 * vezes no mesmo INSERT.
 */
async function upsertLote(emendas: EmendaGravavel[]): Promise<number> {
  const unicas = new Map<string, EmendaGravavel>();
  for (const e of emendas) unicas.set(e.codigoEmenda, e);
  const lista = [...unicas.values()];
  let gravadas = 0;

  for (let i = 0; i < lista.length; i += BATCH_SIZE) {
    const lote = lista.slice(i, i + BATCH_SIZE);
    const placeholders = lote
      .map(
        (_, idx) =>
          `(gen_random_uuid()::text, ${COLUNAS.map(
            (_, c) => `$${idx * COLUNAS.length + c + 1}`
          ).join(', ')}, NOW())`
      )
      .join(', ');
    const params = lote.flatMap(linhaDaEmenda);
    const sql = `
      INSERT INTO "emendas" ("id", ${COLUNAS.map((c) => `"${c}"`).join(', ')}, "updated_at")
      VALUES ${placeholders}
      ON CONFLICT ("codigo_emenda") DO UPDATE SET
        "parlamentar_id" = EXCLUDED."parlamentar_id",
        "ano" = EXCLUDED."ano",
        "tipo" = EXCLUDED."tipo",
        "numero_emenda" = EXCLUDED."numero_emenda",
        "nome_autor_raw" = EXCLUDED."nome_autor_raw",
        "funcao" = EXCLUDED."funcao",
        "subfuncao" = EXCLUDED."subfuncao",
        "localidade_raw" = EXCLUDED."localidade_raw",
        "uf" = EXCLUDED."uf",
        "municipio" = EXCLUDED."municipio",
        "localidade_tipo" = EXCLUDED."localidade_tipo",
        "valor_empenhado" = EXCLUDED."valor_empenhado",
        "valor_liquidado" = EXCLUDED."valor_liquidado",
        "valor_pago" = EXCLUDED."valor_pago",
        "valor_resto_inscrito" = EXCLUDED."valor_resto_inscrito",
        "valor_resto_cancelado" = EXCLUDED."valor_resto_cancelado",
        "valor_resto_pago" = EXCLUDED."valor_resto_pago",
        "updated_at" = NOW()
    `;
    gravadas += await prisma.$executeRawUnsafe(sql, ...params);
  }
  return gravadas;
}

interface ResultadoAno {
  ano: number;
  paginas: number;
  registros: number;
  casados: number;
  semMatch: number;
  gravados: number;
}

async function ingerirAno(
  chave: string,
  ano: number,
  diretorio: DiretorioPorNome,
  semMatch: Map<string, number>,
  debug: boolean
): Promise<ResultadoAno> {
  const resultado: ResultadoAno = { ano, paginas: 0, registros: 0, casados: 0, semMatch: 0, gravados: 0 };
  let lote: EmendaGravavel[] = [];

  for (let pagina = 1; ; pagina++) {
    const registros = await buscarPagina(chave, ano, pagina);
    if (registros.length === 0) break;

    resultado.paginas = pagina;
    resultado.registros += registros.length;

    for (const bruto of registros) {
      const emenda = mapearEmenda(bruto, ano, diretorio);
      if (!emenda) continue;
      if (emenda.parlamentarId) {
        resultado.casados++;
      } else {
        resultado.semMatch++;
        const nome = emenda.nomeAutorRaw;
        semMatch.set(nome, (semMatch.get(nome) ?? 0) + 1);
      }
      lote.push(emenda);
    }

    if (lote.length >= BATCH_SIZE) {
      resultado.gravados += await upsertLote(lote);
      lote = [];
    }

    if (debug && pagina % 25 === 0) {
      console.log(`   … ano ${ano}: página ${pagina}, ${resultado.registros} registros`);
    }
  }

  if (lote.length > 0) resultado.gravados += await upsertLote(lote);
  return resultado;
}

async function syncEmendas(options: SyncOptions = {}) {
  const inicio = Date.now();
  const anos = options.ano ? [options.ano] : janelaAnos(3);
  const chave = exigirChavePortal();
  const diretorio = await buildDiretorio();

  console.log('\n🗳️  SYNC EMENDAS — Portal da Transparência');
  console.log(`   anos: ${anos.join(', ')}`);
  console.log(`   parlamentares no diretório: ${Object.keys(diretorio.porNome).length}`);

  const semMatch = new Map<string, number>();
  const resultados: ResultadoAno[] = [];

  for (const ano of anos) {
    console.log(`\n📅 Ano ${ano}`);
    const r = await ingerirAno(chave, ano, diretorio, semMatch, options.debug ?? false);
    resultados.push(r);
    console.log(
      `   páginas: ${r.paginas} | registros: ${r.registros} | casados: ${r.casados} | sem match: ${r.semMatch}`
    );
  }

  console.log('\n🗑️  Retenção (fora da janela)...');
  const removidos = await deletarForaDaJanela(prisma, especDaTabela('emendas'));
  console.log(`   removidos: ${removidos}`);

  const totalSemMatch = [...semMatch.values()].reduce((s, n) => s + n, 0);
  if (totalSemMatch > 0) {
    const top = [...semMatch.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    console.log('\n⚠️  Autores sem match (nome — ocorrências):');
    for (const [nome, n] of top) console.log(`   ${n.toString().padStart(4)}  ${nome}`);
    if (semMatch.size > top.length) console.log(`   … +${semMatch.size - top.length} outros`);
  }

  const tempo = ((Date.now() - inicio) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(60));
  console.log(
    JSON.stringify(
      {
        anos: resultados,
        removidos,
        autoresSemMatch: semMatch.size,
        registrosSemMatch: totalSemMatch,
        segundos: Number(tempo),
      },
      null,
      2
    )
  );
}

const args = process.argv.slice(2);
const options: SyncOptions = {};

for (const arg of args) {
  if (arg.startsWith('--ano=')) options.ano = parseInt(arg.split('=')[1], 10);
  if (arg === '--apenas-emendas') options.apenasEmendas = true;
  if (arg === '--debug') options.debug = true;
}

syncEmendas(options)
  .catch((error) => {
    console.error('\n❌ ERRO NO SYNC EMENDAS:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
