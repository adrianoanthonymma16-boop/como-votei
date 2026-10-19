/**
 * Emendas parlamentares: parsing de localidade e agregações puras.
 *
 * `localidadeDoGasto` do Portal da Transparência vem em formatos heterogêneos
 * (amostra real de 2025): `Nacional`, `Município - UF`, `NOME DO ESTADO (UF)`,
 * além de `Múltiplo` e `Exterior`. O texto bruto é sempre preservado; aqui só o
 * derivamos para UF/município/tipo, sem inventar dado que a fonte não deu.
 */

import { parseBRL } from './despesas';
import { ehSiglaUf, siglaPorNomeUf } from './ufs';

export type LocalidadeTipo =
  | 'MUNICIPIO'
  | 'ESTADO'
  | 'NACIONAL'
  | 'MULTIPLO'
  | 'EXTERIOR'
  | 'DESCONHECIDO';

export interface LocalidadeParseada {
  tipo: LocalidadeTipo;
  uf: string | null;
  municipio: string | null;
}

const RE_MUNICIPIO_UF = /^(.+?)\s+-\s+([A-Za-z]{2})$/;
const RE_ESTADO_UF = /^(.+?)\s*\(\s*(?:UF|BR)\s*\)$/i;

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Deriva UF/município/tipo de `localidadeDoGasto`. Nunca lança: entrada
 * inesperada vira `DESCONHECIDO` com o bruto preservado fora daqui.
 *
 * @param raw valor como veio da API (`unknown` porque o JSON é externo)
 * @returns tipo + uf + município; UF desconhecida dentro de `Município - XX`
 *          ainda marca `MUNICIPIO` com `uf: null`
 */
export function parseLocalidadeGasto(raw: unknown): LocalidadeParseada {
  const texto = typeof raw === 'string' ? raw.trim() : '';
  if (!texto) return { tipo: 'DESCONHECIDO', uf: null, municipio: null };

  const norm = normalizar(texto);
  if (norm === 'NACIONAL') return { tipo: 'NACIONAL', uf: null, municipio: null };
  if (norm.startsWith('MULTIPLO')) return { tipo: 'MULTIPLO', uf: null, municipio: null };
  if (norm.startsWith('EXTERIOR')) return { tipo: 'EXTERIOR', uf: null, municipio: null };

  const municipioUf = texto.match(RE_MUNICIPIO_UF);
  if (municipioUf) {
    const uf = municipioUf[2].toUpperCase();
    return {
      tipo: 'MUNICIPIO',
      uf: ehSiglaUf(uf) ? uf : null,
      municipio: municipioUf[1].trim(),
    };
  }

  const estado = texto.match(RE_ESTADO_UF);
  if (estado) {
    const sigla = siglaPorNomeUf(estado[1]);
    if (sigla) return { tipo: 'ESTADO', uf: sigla, municipio: null };
  }

  return { tipo: 'DESCONHECIDO', uf: null, municipio: null };
}

/** Página pública da emenda no Portal da Transparência (fonte verificável). */
export function urlEmenda(codigoEmenda: string): string {
  return `https://portaldatransparencia.gov.br/emendas?codigoEmenda=${encodeURIComponent(codigoEmenda)}`;
}

/** Números de uma emenda já normalizada (valores em reais). */
export interface EmendaValores {
  valorPago: number;
  valorEmpenhado: number;
  valorLiquidado: number;
  valorRestoPago: number;
}

export interface EmendaAgregavel extends EmendaValores {
  ano: number;
  funcao: string | null;
  uf: string | null;
  municipio: string | null;
  localidadeTipo: string | null;
}

function soma(valores: number[]): number {
  return Math.round(valores.reduce((total, v) => total + v, 0) * 100) / 100;
}

export interface TotalEmendas {
  quantidade: number;
  pago: number;
  empenhado: number;
  liquidado: number;
  restoPago: number;
}

export function totalizarEmendas(emendas: EmendaValores[]): TotalEmendas {
  return {
    quantidade: emendas.length,
    pago: soma(emendas.map((e) => e.valorPago)),
    empenhado: soma(emendas.map((e) => e.valorEmpenhado)),
    liquidado: soma(emendas.map((e) => e.valorLiquidado)),
    restoPago: soma(emendas.map((e) => e.valorRestoPago)),
  };
}

export interface GrupoEmendas {
  chave: string;
  quantidade: number;
  pago: number;
  empenhado: number;
}

function agrupar(
  emendas: EmendaAgregavel[],
  chaveDe: (e: EmendaAgregavel) => string | null
): GrupoEmendas[] {
  const mapa = new Map<string, EmendaAgregavel[]>();
  for (const e of emendas) {
    const chave = chaveDe(e);
    if (!chave) continue;
    const lista = mapa.get(chave) ?? [];
    lista.push(e);
    mapa.set(chave, lista);
  }

  return [...mapa.entries()]
    .map(([chave, lista]) => {
      const t = totalizarEmendas(lista);
      return { chave, quantidade: t.quantidade, pago: t.pago, empenhado: t.empenhado };
    })
    .sort((a, b) => b.pago - a.pago);
}

/** Ranking por função orçamentária (ex.: Saúde, Educação). */
export function agruparPorFuncao(emendas: EmendaAgregavel[]): GrupoEmendas[] {
  return agrupar(emendas, (e) => e.funcao?.trim() || null);
}

/**
 * Ranking por destino. Agrupa pela UF quando conhecida, senão pelo tipo
 * (`NACIONAL`, `MULTIPLO`, `EXTERIOR`) — nunca soma locais distintos sob um
 * rótulo inventado.
 */
export function agruparPorLocalidade(emendas: EmendaAgregavel[]): GrupoEmendas[] {
  return agrupar(emendas, (e) => e.uf || e.localidadeTipo || null);
}

/** Converte os campos de valor (string do parseBRL ou Decimal) para número. */
export function valoresDaEmenda(registro: {
  valorPago?: unknown;
  valorEmpenhado?: unknown;
  valorLiquidado?: unknown;
  valorRestoPago?: unknown;
}): EmendaValores {
  // Aceita string pt-BR (inclusive negativa com espaço, "- 37.729,24"),
  // número e Decimal do Prisma (que não é string nem number).
  const numero = (v: unknown): number => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const bruto = typeof v === 'string' ? v : String(v);
    if (bruto === '[object Object]') return 0;
    const limpo = bruto.replace(/\s+/g, '');
    if (limpo === '') return 0;
    const parsed = parseBRL(limpo);
    return parsed === null ? 0 : Number(parsed);
  };
  return {
    valorPago: numero(registro.valorPago),
    valorEmpenhado: numero(registro.valorEmpenhado),
    valorLiquidado: numero(registro.valorLiquidado),
    valorRestoPago: numero(registro.valorRestoPago),
  };
}
