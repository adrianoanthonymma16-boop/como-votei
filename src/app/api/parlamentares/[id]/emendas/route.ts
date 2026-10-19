import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  agruparPorFuncao,
  agruparPorLocalidade,
  totalizarEmendas,
  urlEmenda,
  valoresDaEmenda,
  type EmendaAgregavel,
} from '@/lib/emendas';

export const dynamic = 'force-dynamic';

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

const querySchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  itensPorPagina: z.coerce.number().int().positive().max(MAX_PER_PAGE).default(DEFAULT_PER_PAGE),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
  funcao: z.string().trim().min(1).optional(),
});

function lerParametros(searchParams: URLSearchParams): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [chave, valor] of searchParams.entries()) {
    if (valor !== '') raw[chave] = valor;
  }
  return raw;
}

/**
 * Emendas parlamentares do autor, do Portal da Transparência.
 *
 * Regra das quebras: `total`, `porFuncao` e `porLocalidade` refletem o **ano**
 * selecionado (retrato do ano); o filtro de `funcao` estreita apenas a lista.
 * A lista traz o valor bruto da localidade e o link para a fonte — nada é
 * estimado; sem emendas no período, `semDadosOficiais: true`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(lerParametros(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parâmetros de consulta inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { pagina, itensPorPagina, ano, funcao } = parsed.data;
  const { id: parlamentarId } = await params;

  const parlamentar = await prisma.parlamentar.findUnique({ where: { id: parlamentarId } });
  if (!parlamentar) {
    return NextResponse.json({ error: 'parlamentar não encontrado' }, { status: 404 });
  }

  const whereAno = { parlamentarId, ...(ano !== undefined ? { ano } : {}) };
  const whereLista = { ...whereAno, ...(funcao ? { funcao } : {}) };

  const [porAno, funcoesDisponiveis, total, registros] = await Promise.all([
    prisma.emenda.groupBy({ by: ['ano'], where: { parlamentarId }, _count: { _all: true } }),
    prisma.emenda.groupBy({
      by: ['funcao'],
      where: { parlamentarId },
      _count: { _all: true },
      orderBy: { _count: { funcao: 'desc' } },
    }),
    prisma.emenda.count({ where: whereLista }),
    prisma.emenda.findMany({ where: whereAno, orderBy: [{ valorPago: 'desc' }, { id: 'desc' }] }),
  ]);

  const agregaveis: EmendaAgregavel[] = registros.map((e) => ({
    ano: e.ano,
    funcao: e.funcao,
    uf: e.uf,
    municipio: e.municipio,
    localidadeTipo: e.localidadeTipo,
    ...valoresDaEmenda(e),
  }));

  const listaFiltrada =
    funcao === undefined ? registros : registros.filter((e) => (e.funcao ?? '') === funcao);
  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / itensPorPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * itensPorPagina;

  const data = listaFiltrada.slice(inicio, inicio + itensPorPagina).map((e) => ({
    codigoEmenda: e.codigoEmenda,
    ano: e.ano,
    tipo: e.tipo,
    numeroEmenda: e.numeroEmenda,
    funcao: e.funcao,
    subfuncao: e.subfuncao,
    localidadeRaw: e.localidadeRaw,
    uf: e.uf,
    municipio: e.municipio,
    localidadeTipo: e.localidadeTipo,
    ...valoresDaEmenda(e),
    urlFonte: urlEmenda(e.codigoEmenda),
  }));

  return NextResponse.json({
    data,
    meta: {
      pagina: paginaAtual,
      itensPorPagina,
      totalPaginas,
      totalItens: total,
      semDadosOficiais: registros.length === 0,
      anos: porAno
        .map((a) => ({ ano: a.ano, quantidade: a._count._all }))
        .sort((a, b) => b.ano - a.ano),
      funcoes: funcoesDisponiveis.map((f) => ({ nome: f.funcao, quantidade: f._count._all })),
      total: totalizarEmendas(agregaveis),
      porFuncao: agruparPorFuncao(agregaveis),
      porLocalidade: agruparPorLocalidade(agregaveis),
    },
  });
}
