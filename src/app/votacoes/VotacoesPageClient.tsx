'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { temaCor, classificarTemas, descreverTipoProposicao } from '@/lib/temas';

interface VotacaoGlobal {
  id: string;
  idExterno: string;
  casa: string;
  data: string;
  descricao: string;
  ementa?: string | null;
  tema?: string | null;
  resultado?: string | null;
  _count: { votos: number };
}

interface ApiResponse {
  data: VotacaoGlobal[];
  total: number;
  page: number;
  totalPages: number;
}

const PER_PAGE = 10;
const ANOS = [2026, 2025, 2024, 2023] as const;
const TEMAS = [
  'saúde',
  'educação',
  'economia',
  'meio ambiente',
  'segurança pública',
  'direitos sociais',
  'trabalho',
  'infraestrutura',
  'agricultura',
  'tecnologia',
  'cultura',
  'direitos civis',
  'politica institucional',
  'desenvolvimento regional',
] as const;

function extrairInfoProposicao(descricao: string, ementa?: string | null) {
  const texto = ementa || descricao;
  const match = texto.match(/\b(PL|PLP|PEC|PLV|PDL|PRC|REQ|RIC|DEC|OFE)\s*(?:nº\s*)?(\d[\d./]*)/i);
  if (match) {
    return {
      tipo: match[1].toUpperCase(),
      numero: match[2],
      texto: descreverTipoProposicao(match[1].toUpperCase()),
    };
  }
  return {} as { tipo?: string; numero?: string; texto?: string };
}

function gerarResumo(ementa?: string | null, descricao?: string): string {
  const texto = ementa || descricao || '';
  if (!texto) return 'Votação sem detalhes disponíveis na fonte oficial.';
  if (texto.length <= 220) return texto;
  const cortado = texto.substring(0, 200);
  const ultimoPonto = cortado.lastIndexOf('.');
  if (ultimoPonto > 110) return cortado.substring(0, ultimoPonto + 1);
  const ultimoEspaco = cortado.lastIndexOf(' ');
  return cortado.substring(0, ultimoEspaco > 110 ? ultimoEspaco : 200) + '...';
}

function getResultadoBadge(resultado?: string | null) {
  if (!resultado) return null;
  const up = resultado.toUpperCase();
  if (up.includes('APROVAD')) {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
        APROVADA
      </span>
    );
  }
  if (up.includes('REJEITAD')) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-400">
        REJEITADA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-slate-700 border border-slate-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-300">
      {resultado.toUpperCase()}
    </span>
  );
}

function CasaBadge({ casa }: { casa: string }) {
  const isCamara = casa === 'CAMARA';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${
        isCamara
          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
          : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
      }`}
    >
      {isCamara ? 'CÂMARA' : 'SENADO'}
    </span>
  );
}

// Sub-component: lista de votos dentro do accordion
function VotosDaVotacao({ votacaoId, isNominal }: { votacaoId: string; isNominal: boolean }) {
  const [votos, setVotos] = useState<
    Array<{ tipo: string; parlamentar: { id: string; nome: string; fotoUrl?: string | null; casa: string; partido: { sigla: string; cor?: string | null }; uf: { sigla: string } } }>
  >([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [porTipo, setPorTipo] = useState<Array<{ tipo: string; total: number }>>([]);
  const [filtroVoto, setFiltroVoto] = useState<string | null>(null);
  const [buscaParlamentar, setBuscaParlamentar] = useState('');
  const [debouncedBusca, setDebouncedBusca] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedBusca(buscaParlamentar), 350);
    return () => clearTimeout(t);
  }, [buscaParlamentar]);

  const load = useCallback(async (p: number, votoFiltro: string | null, q: string) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: '10' });
    if (votoFiltro) params.set('voto', votoFiltro);
    if (q) params.set('q', q);
    const res = await fetch(`/api/votacoes/${votacaoId}/votos?${params.toString()}`);
    if (!res.ok) { setIsLoading(false); return; }
    const data = await res.json();
    setVotos(data.data);
    setTotal(data.total);
    setTotalPages(data.totalPages);
    setPorTipo(data.porTipo || []);
    setPage(data.page);
    setIsLoading(false);
  }, [votacaoId]);

  useEffect(() => { load(1, filtroVoto, debouncedBusca); }, [load, filtroVoto, debouncedBusca]);

  const getVotoBadge = (tipo: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      SIM: { label: 'Sim', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
      NAO: { label: 'Não', cls: 'bg-red-500/15 border-red-500/30 text-red-400' },
      ABSTENCAO: { label: 'Abstenção', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
      OBSTRUCAO: { label: 'Obstrução', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
      AUSENTE: { label: 'Ausente', cls: 'bg-slate-700 border-slate-600 text-slate-300' },
      LICENCA: { label: 'Licença', cls: 'bg-slate-700 border-slate-600 text-slate-300' },
      MISSAO: { label: 'Missão', cls: 'bg-slate-700 border-slate-600 text-slate-300' },
    };
    const c = map[tipo] || { label: tipo, cls: 'bg-slate-700 border-slate-600 text-slate-300' };
    return <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Quem votou como</h5>
          <div className="relative w-full sm:w-64">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={buscaParlamentar}
              onChange={(e) => setBuscaParlamentar(e.target.value)}
              placeholder="Buscar parlamentar"
              className="h-8 w-full rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroVoto(null)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${!filtroVoto ? 'bg-white text-slate-900 border-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
          >
            Todos {total > 0 && `· ${total}`}
          </button>
          {porTipo.map((p) => (
            <button
              key={p.tipo}
              onClick={() => setFiltroVoto(filtroVoto === p.tipo ? null : p.tipo)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${filtroVoto === p.tipo ? 'bg-white text-slate-900 border-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
            >
              {p.tipo} · {p.total}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-800" />)
        ) : votos.length === 0 ? (
          isNominal && !buscaParlamentar && !filtroVoto ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-6 text-center">
              <p className="text-sm font-medium text-amber-300">Votação nominal sem votos no banco — sincronização pendente</p>
              <p className="mt-1 text-xs text-amber-200/70">Esta votação tem placar na descrição mas os votos individuais ainda não foram importados. Tente novamente em alguns minutos.</p>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">Nenhum voto encontrado com esse filtro.</p>
          )
        ) : (
          votos.map((v) => (
            <Link
              key={`${v.parlamentar.id}-${v.tipo}`}
              href={`/parlamentares/${v.parlamentar.id}/votacoes`}
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/50 px-3 py-2.5 transition-colors hover:border-slate-700 hover:bg-slate-800"
            >
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-700">
                {v.parlamentar.fotoUrl ? (
                  <Image src={v.parlamentar.fotoUrl} alt={v.parlamentar.nome} width={32} height={32} className="h-8 w-8 object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-slate-400">{v.parlamentar.nome.slice(0,2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{v.parlamentar.nome}</p>
                <p className="text-xs text-slate-400">{v.parlamentar.partido.sigla} · {v.parlamentar.uf.sigla}</p>
              </div>
              {getVotoBadge(v.tipo)}
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex justify-center">
          <PaginacaoNumerica page={page} totalPages={totalPages} total={total} onChange={(p) => load(p, filtroVoto, debouncedBusca)} />
        </div>
      )}
    </div>
  );
}

export function VotacoesPageClient() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [casa, setCasa] = useState<string>('');
  const [ano, setAno] = useState<string>('');
  const [resultado, setResultado] = useState<string>('');
  const [tema, setTema] = useState<string>('');
  const [votacoes, setVotacoes] = useState<VotacaoGlobal[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 380);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const loadData = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PER_PAGE) });
      if (debouncedQ) params.set('q', debouncedQ);
      if (casa) params.set('casa', casa);
      if (ano) params.set('ano', ano);
      if (resultado) params.set('resultado', resultado);
      if (tema) params.set('tema', tema);
      const res = await fetch(`/api/votacoes?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao carregar votações');
      const data: ApiResponse = await res.json();
      setVotacoes(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQ, casa, ano, resultado, tema]);

  useEffect(() => { loadData(1); }, [loadData]);

  const alternar = (id: string) => setAbertas((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const limparFiltros = () => {
    setQ(''); setCasa(''); setAno(''); setResultado(''); setTema('');
  };

  const temFiltro = !!(debouncedQ || casa || ano || resultado || tema);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Votações</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400 max-w-2xl">
            Todas as votações nominais da Câmara e do Senado. Pesquise por PL, filtre por Casa, ano, resultado e tema.
            Toque em uma votação para ver quem votou como.
          </p>
        </div>

        {/* Filtros — mobile-first */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 sm:p-4 mb-6">
          {/* Linha 1: busca */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por PL, PEC, número ou palavra-chave…"
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Linha 2: chips Casa + Resultado */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">Casa</span>
            {[
              { label: 'Todos', value: '' },
              { label: 'Câmara', value: 'CAMARA' },
              { label: 'Senado', value: 'SENADO' },
            ].map((opt) => (
              <button
                key={opt.value || 'todos-casa'}
                onClick={() => setCasa(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${casa === opt.value ? 'bg-white text-slate-900 border-white shadow-sm' : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
            <span className="hidden sm:inline h-4 w-px bg-slate-800 mx-1" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">Resultado</span>
            {[
              { label: 'Todos', value: '' },
              { label: 'Aprovada', value: 'APROVADA' },
              { label: 'Rejeitada', value: 'REJEITADA' },
            ].map((opt) => (
              <button
                key={opt.value || 'todos-res'}
                onClick={() => setResultado(opt.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${resultado === opt.value ? 'bg-white text-slate-900 border-white shadow-sm' : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Linha 3: selects Ano + Tema + limpar */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex gap-2 flex-1">
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="h-9 flex-1 sm:flex-none sm:w-32 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Todos os anos</option>
                {ANOS.map((a) => <option key={a} value={String(a)}>{a}</option>)}
              </select>
              <select
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 capitalize"
              >
                <option value="">Todos os temas</option>
                {TEMAS.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            {temFiltro && (
              <button
                onClick={limparFiltros}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors sm:shrink-0"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Limpar filtros
              </button>
            )}
          </div>

          {total > 0 && !isLoading && (
            <p className="mt-3 text-xs text-slate-500">{total.toLocaleString('pt-BR')} votações encontradas</p>
          )}
        </div>

        {/* Lista */}
        {error ? (
          <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={() => loadData(page)} className="mt-3 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Tentar novamente</button>
          </div>
        ) : isLoading && votacoes.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-800" />)}
          </div>
        ) : votacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-14 text-center">
            <p className="text-sm font-medium text-slate-300">Nenhuma votação encontrada</p>
            <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou a busca e tente novamente.</p>
          </div>
        ) : (
          <ol className="space-y-3" aria-label="Votações">
            {votacoes.map((v, idx) => {
              const aberta = abertas.has(v.id);
              const info = extrairInfoProposicao(v.descricao, v.ementa);
              const temas = classificarTemas(v.ementa || v.descricao || '');
              const resumo = gerarResumo(v.ementa, v.descricao);
              return (
                <li
                  key={v.id}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className="animate-fade-in overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => alternar(v.id)}
                    aria-expanded={aberta}
                    aria-controls={`votacao-${v.id}`}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-inset"
                  >
                    {/* Data — mobile: top, desktop: coluna */}
                    <span className="hidden sm:block w-24 shrink-0 text-xs font-medium text-slate-400 whitespace-nowrap mt-0.5">
                      {formatDate(v.data)}
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 sm:hidden mb-1.5">
                        <span className="text-[11px] text-slate-500">{formatDate(v.data)}</span>
                        <CasaBadge casa={v.casa} />
                      </span>
                      {info.tipo && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 mb-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          {info.texto || info.tipo} {info.numero && `nº ${info.numero}`}
                        </span>
                      )}
                      <span className="block text-sm font-medium leading-snug text-slate-100">
                        {resumo}
                      </span>
                      <span className="mt-1.5 hidden sm:inline-flex items-center gap-1.5 flex-wrap">
                        <span className="sm:hidden"><CasaBadge casa={v.casa} /></span>
                        {temas.slice(0, 2).map((t) => (
                          <span key={t.tema} className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${temaCor(t.tema)}`}>
                            {t.tema}
                          </span>
                        ))}
                        {v._count.votos > 0 && (
                          <span className="text-[11px] text-slate-500">{v._count.votos} votos</span>
                        )}
                      </span>
                      {/* Mobile: temas + votos count inline */}
                      <span className="mt-1.5 flex sm:hidden flex-wrap items-center gap-1.5">
                        {temas.slice(0, 2).map((t) => (
                          <span key={t.tema} className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${temaCor(t.tema)}`}>
                            {t.tema}
                          </span>
                        ))}
                      </span>
                    </span>

                    <span className="hidden sm:flex shrink-0 flex-col items-end gap-1.5">
                      <CasaBadge casa={v.casa} />
                      {getResultadoBadge(v.resultado)}
                    </span>

                    {/* Mobile resultado */}
                    <span className="flex sm:hidden shrink-0 flex-col items-end gap-1">
                      {getResultadoBadge(v.resultado)}
                    </span>

                    <span className={`ml-1 hidden sm:inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${aberta ? 'rotate-180 border-sky-500 bg-sky-500/10 text-sky-400' : 'border-slate-700 text-slate-500'}`} aria-hidden="true">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                    <span className={`sm:hidden inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${aberta ? 'rotate-180 border-sky-500 bg-sky-500/10 text-sky-400' : 'border-slate-700 text-slate-500'}`} aria-hidden="true">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>

                  {/* Expand — grid-rows retrátil */}
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${aberta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div id={`votacao-${v.id}`} className="border-t border-slate-800 bg-slate-900 px-4 py-5">
                        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">O que foi votado</h4>
                          <p className="text-sm leading-relaxed text-slate-200">{v.ementa || v.descricao}</p>
                          {v.descricao && v.descricao !== v.ementa && v.descricao.length > 12 && (
                            <p className="mt-2 text-xs leading-relaxed text-slate-400">{v.descricao}</p>
                          )}
                          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <div className="rounded-md bg-slate-900 border border-slate-800 px-3 py-2">
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Data</dt><dd className="font-medium text-slate-200 mt-0.5">{formatDate(v.data)}</dd>
                            </div>
                            <div className="rounded-md bg-slate-900 border border-slate-800 px-3 py-2">
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Casa</dt><dd className="font-medium text-slate-200 mt-0.5">{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</dd>
                            </div>
                            <div className="rounded-md bg-slate-900 border border-slate-800 px-3 py-2 col-span-2 sm:col-span-1">
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Resultado</dt><dd className="font-medium text-slate-200 mt-0.5">{v.resultado || '—'}</dd>
                            </div>
                          </dl>
                        </div>
                        <VotosDaVotacao votacaoId={v.id} isNominal={/Sim:\s*\d+/i.test(v.descricao)} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-2 flex justify-center">
          <div className="[&>nav]:py-2 [&_button]:border-slate-700 [&_button]:bg-slate-900 [&_button]:text-slate-300 [&_button:hover]:bg-slate-800 [&_p]:text-slate-500">
            <PaginacaoNumerica page={page} totalPages={totalPages} total={total} onChange={(p) => { loadData(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Dados oficiais da Câmara e do Senado · Sincronização diária
        </p>
      </div>
    </div>
  );
}
