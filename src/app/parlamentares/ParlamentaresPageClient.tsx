'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ParlamentaresList } from '@/components/ParlamentaresList';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';
import { DEFAULT_PER_PAGE } from '@/lib/parlamentar-query';

type ParlamentarCompleto = import('@prisma/client').Parlamentar & {
  partido?: { id: string; sigla: string; nome: string; cor: string | null } | null;
  uf?: { id: string; sigla: string; nome: string; regiao: string } | null;
  _count?: { votos: number; discursos: number; proposicoes: number };
};

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

  const [query, setQuery] = useState(searchParams.get('search') ?? '');
  const [casa, setCasa] = useState(searchParams.get('casa') ?? '');
  const [partidoId, setPartidoId] = useState(searchParams.get('partidoId') ?? '');
  const [ufId, setUfId] = useState(searchParams.get('ufId') ?? '');
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get('page') ?? '1');
    return Number.isInteger(p) && p >= 1 ? p : 1;
  });

  const [parlamentares, setParlamentares] = useState<ParlamentarCompleto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

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
      params.set('page', String(novaPagina));
      params.set('limit', String(DEFAULT_PER_PAGE));
      router.push(`/parlamentares?${params.toString()}`);
    },
    [casa, partidoId, ufId, router]
  );

  // Carrega os dados a partir da URL (única fonte de verdade).
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set('limit', String(DEFAULT_PER_PAGE));
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
      <nav className="mb-6" aria-label="Trilha de navegação">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><a href="/" className="hover:text-foreground transition-colors">Início</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">Parlamentares</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Parlamentares</h1>
        <p className="text-muted-foreground">Busque e filtre deputados e senadores por nome, partido, estado ou casa.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-1">
            <label htmlFor="search" className="text-xs font-medium text-muted-foreground mb-1 block">Buscar por nome</label>
            <Input
              id="search"
              type="search"
              placeholder="Ex.: Maria, deputado, 204549"
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
        </div>

        {filtrosAtivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {filtrosAtivos.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.limpar}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {f.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      <ParlamentaresList parlamentares={parlamentares} isLoading={isLoading} total={total} />

      <PaginacaoNumerica
        page={page}
        totalPages={totalPages}
        total={total}
        onChange={irParaPagina}
        label={`${formatNumber(total)} parlamentar${total !== 1 ? 'es' : ''}`}
      />
    </div>
  );
}
