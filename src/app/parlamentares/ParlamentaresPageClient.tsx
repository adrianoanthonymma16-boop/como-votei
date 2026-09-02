'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ParlamentaresList } from '@/components/ParlamentaresList';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

export function ParlamentaresPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [partidos, setPartidos] = useState<Array<{ id: string; sigla: string; nome: string; cor: string | null }>>([]);
  const [ufs, setUfs] = useState<Array<{ id: string; sigla: string; nome: string }>>([]);
  
  const [parlamentares, setParlamentares] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [casa, setCasa] = useState(searchParams.get('casa') || '');
  const [partidoId, setPartidoId] = useState(searchParams.get('partidoId') || '');
  const [ufId, setUfId] = useState(searchParams.get('ufId') || '');
  const [legislatura, setLegislatura] = useState(searchParams.get('legislatura') || '');
  const [situacao, setSituacao] = useState(searchParams.get('situacao') || '');
  
  const debouncedQuery = useDebounce(query, 300);

  const loadPartidos = useCallback(async () => {
    try {
      const res = await fetch('/api/partidos');
      if (res.ok) {
        const data = await res.json();
        setPartidos(data.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar partidos:', e);
    }
  }, []);

  const loadUfs = useCallback(async () => {
    try {
      const res = await fetch('/api/ufs');
      if (res.ok) {
        const data = await res.json();
        setUfs(data.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar UFs:', e);
    }
  }, []);

  useEffect(() => {
    loadPartidos();
    loadUfs();
  }, [loadPartidos, loadUfs]);

  const loadData = useCallback(async (cursorParam?: string, reset = false) => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        limit: '50',
        ...(cursorParam && { cursor: cursorParam }),
        ...(debouncedQuery && { q: debouncedQuery }),
        ...(casa && { casa }),
        ...(partidoId && { partidoId }),
        ...(ufId && { ufId }),
        ...(legislatura && { legislatura }),
        ...(situacao && { situacao }),
      });
      
      const response = await fetch(`/api/parlamentares?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar parlamentares');
      }
      
      const data = await response.json();
      
      if (reset || !cursorParam) {
        setParlamentares(data.data);
      } else {
        setParlamentares((prev) => [...prev, ...data.data]);
      }
      
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, casa, partidoId, ufId, legislatura, situacao]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('cursor');
    router.push(`/parlamentares?${params.toString()}`);
  }, [router, searchParams]);

  useEffect(() => {
    loadData(undefined, true);
  }, [debouncedQuery, casa, partidoId, ufId, legislatura, situacao]);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadData(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, nextCursor, loadData]);

  const activeFilters = [
    { key: 'casa', value: casa, label: casa === 'CAMARA' ? 'Câmara' : casa === 'SENADO' ? 'Senado' : '' },
    { key: 'partidoId', value: partidoId, label: partidos.find(p => p.id === partidoId)?.sigla || '' },
    { key: 'ufId', value: ufId, label: ufs.find(u => u.id === ufId)?.sigla || '' },
    { key: 'legislatura', value: legislatura, label: `Leg. ${legislatura}` },
    { key: 'situacao', value: situacao, label: situacao },
  ].filter(f => f.value);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-muted-foreground">
          <li><a href="/" className="hover:text-foreground">Início</a></li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium" aria-current="page">Parlamentares</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Parlamentares</h1>
        <p className="text-muted-foreground">Busque e filtre deputados e senadores</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">Buscar parlamentar</label>
            <Input
              id="search"
              type="search"
              placeholder="Nome, CPF ou ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            id="casa-filter"
            value={casa}
            onChange={(e) => handleFilterChange('casa', e.target.value)}
            className="w-full sm:w-56"
          >
            <SelectOption value="">Todas as Casas</SelectOption>
            <SelectOption value="CAMARA">Câmara dos Deputados</SelectOption>
            <SelectOption value="SENADO">Senado Federal</SelectOption>
          </Select>
          <Select
            id="partido-filter"
            value={partidoId}
            onChange={(e) => handleFilterChange('partidoId', e.target.value)}
            className="w-full sm:w-56"
          >
            <SelectOption value="">Todos os Partidos</SelectOption>
            {partidos.map((p) => (
              <SelectOption key={p.id} value={p.id}>
                {p.sigla} - {p.nome}
              </SelectOption>
            ))}
          </Select>
          <Select
            id="uf-filter"
            value={ufId}
            onChange={(e) => handleFilterChange('ufId', e.target.value)}
            className="w-full sm:w-40"
          >
            <SelectOption value="">Todos os Estados</SelectOption>
            {ufs.map((u) => (
              <SelectOption key={u.id} value={u.id}>
                {u.sigla}
              </SelectOption>
            ))}
          </Select>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((filter) => (
              <Badge
                key={`${filter.key}-${filter.value}`}
                variant="outline"
                className="gap-1"
                onClick={() => handleFilterChange(filter.key, '')}
              >
                {filter.label}
                <button type="button" className="ml-1 hover:text-muted-foreground" aria-label={`Remover filtro ${filter.label}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Badge>
            ))}
            {activeFilters.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/parlamentares')}>
                Limpar todos
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {formatNumber(totalCount)} parlamentar{totalCount !== 1 ? 'es' : ''} encontrado{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <ParlamentaresList 
        parlamentares={parlamentares}
        isLoading={isLoading}
        hasMore={hasMore}
        nextCursor={nextCursor}
        onLoadMore={() => loadData(nextCursor)}
        sentinelRef={sentinelRef}
      />
    </div>
  );
}