'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { fotoRemotaValida } from '@/lib/imagens';
import { anoCorrente, janelaAnos } from '@/lib/ano-padrao';
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
const ANOS = janelaAnos(3);
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
  'política institucional',
  'desenvolvimento regional',
] as const;

function ehVotacaoNominal(descricao?: string): boolean {
  // Votação nominal no Congresso: quando cada parlamentar tem voto individual (SIM/NAO/ABSTENCAO)
  // As pautas e descrições costumam incluir "Sim: X; Não: Y" ou indicar votação nominal
  if (!descricao) return false;
  const lower = descricao.toLowerCase();
  // Verifica padrões de contagem de votos (Sim/Não com possível tilde na NAO)
  const hasVotePattern = /sim:\s*\d+\s*[;,]\s*nao|não\s*:\s*\d+/.test(lower) ||
    /sim:\s*\d+\s*;\s*nao\s*:?\s*\d+/.test(lower) ||
    /sim:\s*\d+\s*;\s*não\s*:?\s*\d+/.test(lower);
  // Verifica menção explícita a "votação nominal"
  const hasNominalKeyword = lower.includes('votação nominal') || lower.includes('votacao nominal') || lower.includes('nominal');
  return hasVotePattern || hasNominalKeyword;
}

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
      <span className="inline-flex items-center rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
        APROVADA
      </span>
    );
  }
  if (up.includes('REJEITAD')) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-xs font-bold tracking-wider text-red-700 dark:text-red-300">
        REJEITADA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-muted border border-border px-2 py-0.5 text-xs font-bold tracking-wider text-card-foreground">
      {resultado.toUpperCase()}
    </span>
  );
}

function CasaBadge({ casa }: { casa: string }) {
  const isCamara = casa === 'CAMARA';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-semibold tracking-wide ${
        isCamara
          ? 'bg-sky-500/10 border-ring/30 text-sky-700 dark:text-sky-300'
          : 'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300'
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
      SIM: { label: 'Sim', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' },
      NAO: { label: 'Não', cls: 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300' },
      ABSTENCAO: { label: 'Abstenção', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
      VOTOU: { label: 'Votou (sigilo)', cls: 'bg-teal-500/15 border-teal-500/30 text-teal-300' },
      OBSTRUCAO: { label: 'Obstrução', cls: 'bg-orange-500/15 border-orange-500/30 text-orange-300' },
      AUSENTE: { label: 'Ausente', cls: 'bg-muted border-border text-card-foreground' },
      LICENCA: { label: 'Licença', cls: 'bg-muted border-border text-card-foreground' },
      MISSAO: { label: 'Missão', cls: 'bg-muted border-border text-card-foreground' },
    };
    const c = map[tipo] || { label: tipo, cls: 'bg-muted border-border text-card-foreground' };
    return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quem votou como</h3>
          <div className="relative w-full sm:w-64">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={buscaParlamentar}
              onChange={(e) => setBuscaParlamentar(e.target.value)}
              placeholder="Buscar parlamentar"
              aria-label="Buscar parlamentar"
              className="h-9 w-full rounded-lg border border-border bg-muted pl-8 pr-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltroVoto(null)}
            aria-pressed={!filtroVoto}
            className={`inline-flex min-h-10 items-center rounded-full px-2.5 text-xs font-medium border transition-colors ${!filtroVoto ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            Todos {total > 0 && `· ${total}`}
          </button>
          {porTipo.map((p) => (
            <button
              key={p.tipo}
              onClick={() => setFiltroVoto(filtroVoto === p.tipo ? null : p.tipo)}
              aria-pressed={filtroVoto === p.tipo}
              className={`inline-flex min-h-10 items-center rounded-full px-2.5 text-xs font-medium border transition-colors ${filtroVoto === p.tipo ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {p.tipo} · {p.total}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg bg-muted" />)
        ) : votos.length === 0 ? (
          buscaParlamentar || filtroVoto ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum voto encontrado com esse filtro.</p>
          ) : isNominal ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-6 text-center">
              <p className="text-sm font-medium text-amber-300">Votação nominal sem votos no banco — sincronização pendente</p>
              <p className="mt-1 text-xs text-amber-200/70">Esta votação tem placar na descrição mas os votos individuais ainda não foram importados. Tente novamente em alguns minutos.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">Votos individuais não disponíveis</p>
              <p className="mt-1 text-xs text-muted-foreground">A fonte oficial da Câmara não publicou os votos nominais desta votação. O placar está na descrição acima.</p>
            </div>
          )
        ) : (
          votos.map((v) => (
            <Link
              key={`${v.parlamentar.id}-${v.tipo}`}
              href={`/parlamentares/${v.parlamentar.id}/votacoes`}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5 transition-colors hover:border-border hover:bg-muted"
            >
              <div className="size-8 shrink-0 overflow-hidden rounded-full bg-muted">
                {fotoRemotaValida(v.parlamentar.fotoUrl) ? (
                  <Image src={v.parlamentar.fotoUrl} alt={v.parlamentar.nome} width={32} height={32} className="size-8 object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">{v.parlamentar.nome.slice(0,2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{v.parlamentar.nome}</p>
                <p className="text-xs text-muted-foreground">{v.parlamentar.partido.sigla} · {v.parlamentar.uf.sigla}</p>
              </div>
              {getVotoBadge(v.tipo)}
            </Link>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex justify-center">
          <PaginacaoNumerica page={page} totalPages={totalPages} total={total} ariaLabel="Paginação dos votos desta votação" onChange={(p) => load(p, filtroVoto, debouncedBusca)} />
        </div>
      )}
    </div>
  );
}

export function VotacoesPageClient() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [casa, setCasa] = useState<string>('');
  const [ano, setAno] = useState<string>(() => String(anoCorrente()));
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
    <div className="min-h-dvh bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Votações</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground max-w-2xl">
            Votações nominais da Câmara e do Senado. Pesquise por PL e filtre por Casa, ano, resultado e tema.
            Toque em uma votação para ver quem votou como.
          </p>
        </div>

        {/* Filtros — mobile-first */}
        <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 mb-6">
          {/* Linha 1: busca */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por PL, PEC ou palavra-chave"
              aria-label="Buscar votação por número ou palavra-chave"
              className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Linha 2: chips Casa + Resultado */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Casa</span>
            {[
              { label: 'Todos', value: '' },
              { label: 'Câmara', value: 'CAMARA' },
              { label: 'Senado', value: 'SENADO' },
            ].map((opt) => (
              <button
                key={opt.value || 'todos-casa'}
                onClick={() => setCasa(opt.value)}
                aria-pressed={casa === opt.value}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium border transition-colors ${casa === opt.value ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
            <span className="hidden sm:inline h-4 w-px bg-muted mx-1" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Resultado</span>
            {[
              { label: 'Todos', value: '' },
              { label: 'Aprovada', value: 'APROVADA' },
              { label: 'Rejeitada', value: 'REJEITADA' },
            ].map((opt) => (
              <button
                key={opt.value || 'todos-res'}
                onClick={() => setResultado(opt.value)}
                aria-pressed={resultado === opt.value}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-xs font-medium border transition-colors ${resultado === opt.value ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Linha 3: selects Ano + Tema + limpar */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                aria-label="Filtrar por ano"
                className="h-10 w-full min-w-0 rounded-lg border border-border bg-muted px-3 text-base text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:h-9 sm:w-32 sm:flex-none sm:text-sm"
              >
                <option value="">Todos os anos</option>
                {ANOS.map((a) => <option key={a} value={String(a)}>{a}</option>)}
              </select>
              <select
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                aria-label="Filtrar por tema"
                className="h-10 w-full min-w-0 rounded-lg border border-border bg-muted px-3 text-base text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:h-9 sm:flex-1 sm:text-sm"
              >
                <option value="">Todos os temas</option>
                {TEMAS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {temFiltro && (
              <button
                onClick={limparFiltros}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:shrink-0"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Limpar filtros
              </button>
            )}
          </div>

          {total > 0 && !isLoading && (
            <p className="mt-3 text-xs text-muted-foreground">{total.toLocaleString('pt-BR')} votações encontradas</p>
          )}
        </div>

        <h2 className="sr-only">Lista de votações</h2>

        {/* Lista */}
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button onClick={() => loadData(page)} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-card-foreground hover:bg-muted">Tentar novamente</button>
          </div>
        ) : isLoading && votacoes.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-muted" />)}
          </div>
        ) : votacoes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-14 text-center">
            <p className="text-sm font-medium text-card-foreground">Nenhuma votação encontrada</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou a busca e tente novamente.</p>
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
                  className="animate-fade-in overflow-hidden rounded-xl border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => alternar(v.id)}
                    aria-expanded={aberta}
                    aria-controls={`votacao-${v.id}`}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    {/* Data — mobile: top, desktop: coluna */}
                    <span className="hidden sm:block w-24 shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap mt-0.5">
                      {formatDate(v.data)}
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 sm:hidden mb-1.5">
                        <span className="text-xs text-muted-foreground">{formatDate(v.data)}</span>
                        <CasaBadge casa={v.casa} />
                      </span>
                      {info.tipo && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mb-1">
                          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          {info.texto || info.tipo} {info.numero && `nº ${info.numero}`}
                        </span>
                      )}
                      <span className="block text-sm font-medium leading-snug text-foreground">
                        {resumo}
                      </span>
                      <span className="mt-1.5 hidden sm:inline-flex items-center gap-1.5 flex-wrap">
                        <span className="sm:hidden"><CasaBadge casa={v.casa} /></span>
                        {temas.slice(0, 2).map((t) => (
                          <span key={t.tema} className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-medium capitalize ${temaCor(t.tema)}`}>
                            {t.tema}
                          </span>
                        ))}
                        {v._count.votos > 0 && (
                          <span className="text-xs text-muted-foreground">{v._count.votos} votos</span>
                        )}
                      </span>
                      {/* Mobile: temas + votos count inline */}
                      <span className="mt-1.5 flex sm:hidden flex-wrap items-center gap-1.5">
                        {temas.slice(0, 2).map((t) => (
                          <span key={t.tema} className={`inline-flex rounded-md border px-1.5 py-0.5 text-xs font-medium capitalize ${temaCor(t.tema)}`}>
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

                    <span className={`ml-1 hidden sm:inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color,background-color,color] duration-200 ${aberta ? 'rotate-180 border-ring bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`} aria-hidden="true">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                    <span className={`sm:hidden inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color,background-color,color] duration-200 ${aberta ? 'rotate-180 border-ring bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`} aria-hidden="true">
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>

                  {/* Expand — grid-rows retrátil */}
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${aberta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div id={`votacao-${v.id}`} className="border-t border-border bg-card px-4 py-5">
                        <div className="rounded-lg border border-border bg-muted/50 p-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">O que foi votado</h3>
                          <p className="text-sm leading-relaxed text-foreground">{v.ementa || v.descricao}</p>
                          {v.descricao && v.descricao !== v.ementa && v.descricao.length > 12 && (
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{v.descricao}</p>
                          )}
                          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <div className="rounded-md bg-card border border-border px-3 py-2">
                              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Data</dt><dd className="font-medium text-foreground mt-0.5">{formatDate(v.data)}</dd>
                            </div>
                            <div className="rounded-md bg-card border border-border px-3 py-2">
                              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Casa</dt><dd className="font-medium text-foreground mt-0.5">{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</dd>
                            </div>
                            <div className="rounded-md bg-card border border-border px-3 py-2 col-span-2 sm:col-span-1">
                              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Resultado</dt><dd className="font-medium text-foreground mt-0.5">{v.resultado || '—'}</dd>
                            </div>
                          </dl>
                        </div>
                        <VotosDaVotacao votacaoId={v.id} isNominal={ehVotacaoNominal(v.descricao)} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-2 flex justify-center">
          <div>
            <PaginacaoNumerica page={page} totalPages={totalPages} total={total} ariaLabel="Paginação da lista de votações" onChange={(p) => { loadData(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </div>
        </div>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Dados oficiais da Câmara e do Senado · Sincronização diária
        </p>
      </div>
    </div>
  );
}
