'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ParlamentaresList } from '@/components/ParlamentaresList';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { anoCorrente } from '@/lib/ano-padrao';
import { Select, SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { cn, formatNumber } from '@/lib/utils';
import { DEFAULT_PER_PAGE } from '@/lib/parlamentar-query';
import type { ProdutividadeResumo } from '@/components/ParlamentarCard';

type ParlamentarCompleto = import('@prisma/client').Parlamentar & {
  partido?: { id: string; sigla: string; nome: string; cor: string | null } | null;
  uf?: { id: string; sigla: string; nome: string; regiao: string } | null;
  _count?: { votos: number; discursos: number; proposicoes: number };
  produtividade?: ProdutividadeResumo | null;
};

const SORTS = [
  { value: '', label: 'Ordem alfabética' },
  { value: 'produtivos', label: 'Mais produtivos' },
  { value: 'ativos', label: 'Mais ativos em votações' },
  { value: 'recent', label: 'Atualizados recentemente' },
] as const;

interface PartidoItem {
  id: string;
  sigla: string;
  nome: string;
}

interface UfItem {
  id: string;
  sigla: string;
  nome: string;
}

const CHAVES_FILTRO = ['search', 'casa', 'partidoId', 'ufId'] as const;

export function ParlamentaresPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [partidos, setPartidos] = useState<PartidoItem[]>([]);
  const [ufs, setUfs] = useState<UfItem[]>([]);

  const [query, setQuery] = useState(() => searchParams.get('search') ?? '');
  const [casa, setCasa] = useState(() => searchParams.get('casa') ?? '');
  const [partidoId, setPartidoId] = useState(() => searchParams.get('partidoId') ?? '');
  const [ufId, setUfId] = useState(() => searchParams.get('ufId') ?? '');
  const [sort, setSort] = useState(() => searchParams.get('sort') ?? '');
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page') ?? '1');
    return Number.isInteger(p) && p >= 1 ? p : 1;
  });

  const [parlamentares, setParlamentares] = useState<ParlamentarCompleto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeiroRenderRef = useRef(true);

  // Busca dispara apenas quando a digitação pausa.
  const buscar = useCallback(
    (novaPagina: number, novoQuery: string) => {
      const params = new URLSearchParams();
      if (novoQuery.trim()) params.set('search', novoQuery.trim());
      if (casa) params.set('casa', casa);
      if (partidoId) params.set('partidoId', partidoId);
      if (ufId) params.set('ufId', ufId);
      if (sort) params.set('sort', sort);
      params.set('page', String(novaPagina));
      params.set('limit', String(DEFAULT_PER_PAGE));
      router.push(`/parlamentares?${params.toString()}`);
    },
    [casa, partidoId, ufId, sort, router]
  );

  // Carrega os dados a partir da URL (única fonte de verdade).
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set('limit', String(DEFAULT_PER_PAGE));
        // Produtividade é por ano corrente — sempre envia ano explícito
        if (params.get('sort') === 'produtivos' && !params.get('ano')) {
          params.set('ano', String(anoCorrente()));
        }
        const res = await fetch(`/api/parlamentares?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Falha ao carregar parlamentares');
        const data = await res.json();
        setParlamentares(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [searchParams]);

  // Sincroniza controles quando a URL muda por navegação (botão voltar, etc.).
  useEffect(() => {
    setQuery(searchParams.get('search') ?? '');
    setCasa(searchParams.get('casa') ?? '');
    setPartidoId(searchParams.get('partidoId') ?? '');
    setUfId(searchParams.get('ufId') ?? '');
    setSort(searchParams.get('sort') ?? '');
    const p = Number(searchParams.get('page') ?? '1');
    setPage(Number.isInteger(p) && p >= 1 ? p : 1);
  }, [searchParams]);

  // Debounce do campo de busca: quando a digitação pausa, navega.
  useEffect(() => {
    if (primeiroRenderRef.current) {
      primeiroRenderRef.current = false;
      return;
    }
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    queryDebounceRef.current = setTimeout(() => {
      buscar(1, query);
    }, 350);
    return () => {
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Carrega listas auxiliares (partidos e UFs) uma única vez.
  useEffect(() => {
    let ativo = true;
    async function carregarAux() {
      const [resP, resU] = await Promise.all([fetch('/api/partidos'), fetch('/api/ufs')]);
      if (ativo && resP.ok) setPartidos((await resP.json()).data ?? []);
      if (ativo && resU.ok) setUfs((await resU.json()).data ?? []);
    }
    carregarAux().catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const irParaPagina = (p: number) => {
    if (p === page) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    buscar(p, query);
  };

  const alterarFiltro = (chave: (typeof CHAVES_FILTRO)[number], valor: string) => {
    const proximo = new URLSearchParams(searchParams.toString());
    if (valor) proximo.set(chave, valor);
    else proximo.delete(chave);
    proximo.delete('page');
    router.push(`/parlamentares?${proximo.toString()}`);
  };

  const alterarSort = (valor: string) => {
    const proximo = new URLSearchParams(searchParams.toString());
    if (valor) proximo.set('sort', valor);
    else proximo.delete('sort');
    proximo.delete('page');
    router.push(`/parlamentares?${proximo.toString()}`);
  };

  const labelCasa = casa === 'CAMARA' ? 'Câmara dos Deputados' : casa === 'SENADO' ? 'Senado Federal' : '';
  const partidoSelecionado = partidos.find((p) => p.id === partidoId);
  const ufSelecionada = ufs.find((u) => u.id === ufId);

  const filtrosAtivos = [
    query.trim() && { key: 'search', label: `Busca: "${query.trim()}"`, limpar: () => alterarFiltro('search', '') },
    casa && { key: 'casa', label: labelCasa, limpar: () => alterarFiltro('casa', '') },
    partidoId && { key: 'partidoId', label: partidoSelecionado ? `${partidoSelecionado.sigla} - ${partidoSelecionado.nome}` : 'Partido', limpar: () => alterarFiltro('partidoId', '') },
    ufId && { key: 'ufId', label: ufSelecionada ? `${ufSelecionada.sigla} - ${ufSelecionada.nome}` : 'UF', limpar: () => alterarFiltro('ufId', '') },
  ].filter(Boolean) as Array<{ key: string; label: string; limpar: () => void }>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageBreadcrumb current="Parlamentares" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Parlamentares{sort === 'produtivos' ? ` Mais Produtivos ${anoCorrente()}` : ''}
        </h1>
        <p className="text-muted-foreground">
          {sort === 'produtivos'
            ? `Ranking de produtividade em ${anoCorrente()} — pontuação baseada em proposições, votos e discursos do ano corrente.`
            : 'Busque e filtre deputados e senadores por nome, partido, estado ou casa.'}
        </p>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setFiltrosAbertos((aberto) => !aberto)}
          aria-expanded={filtrosAbertos}
          aria-controls="filtros-parlamentares"
          className="mb-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filtros
            {filtrosAtivos.length > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-accent-foreground">
                {filtrosAtivos.length}
              </span>
            )}
          </span>
          <svg
            className={cn('size-4 transition-transform', filtrosAbertos && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          id="filtros-parlamentares"
          className={cn('bg-card rounded-xl border border-border p-4 sm:p-6', !filtrosAbertos && 'hidden sm:block')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-1">
              <label htmlFor="search" className="text-xs font-medium text-muted-foreground mb-1 block">Buscar por nome</label>
              <Input
                id="search"
                type="search"
                placeholder="Ex.: Maria, João Silva"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="casa-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Casa legislativa</label>
              <Select id="casa-filter" value={casa} onChange={(e) => alterarFiltro('casa', e.target.value)}>
                <SelectOption value="">Todas as casas</SelectOption>
                <SelectOption value="CAMARA">Câmara dos Deputados</SelectOption>
                <SelectOption value="SENADO">Senado Federal</SelectOption>
              </Select>
            </div>
            <div>
              <label htmlFor="partido-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Partido</label>
              <Select id="partido-filter" value={partidoId} onChange={(e) => alterarFiltro('partidoId', e.target.value)}>
                <SelectOption value="">Todos os partidos</SelectOption>
                {partidos.map((p) => (
                  <SelectOption key={p.id} value={p.id}>{p.sigla} - {p.nome}</SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="uf-filter" className="text-xs font-medium text-muted-foreground mb-1 block">Estado (UF)</label>
              <Select id="uf-filter" value={ufId} onChange={(e) => alterarFiltro('ufId', e.target.value)}>
                <SelectOption value="">Todos os estados</SelectOption>
                {ufs.map((u) => (
                  <SelectOption key={u.id} value={u.id}>{u.sigla} - {u.nome}</SelectOption>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="sort" className="text-xs font-medium text-muted-foreground mb-1 block">Ordenar por</label>
              <Select id="sort" value={sort} onChange={(e) => alterarSort(e.target.value)}>
                {SORTS.map((s) => (
                  <SelectOption key={s.value || 'nome'} value={s.value}>{s.label}</SelectOption>
                ))}
              </Select>
            </div>
          </div>

          {filtrosAtivos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {filtrosAtivos.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.limpar}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {f.label}
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => router.push('/parlamentares')}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      <h2 className="sr-only">Lista de parlamentares</h2>
      <ParlamentaresList parlamentares={parlamentares} isLoading={isLoading} total={total} />

      <PaginacaoNumerica
        page={page}
        totalPages={totalPages}
        total={total}
        onChange={irParaPagina}
        label="Parlamentares"
        ariaLabel="Paginação da lista de parlamentares"
      />
    </div>
  );
}
