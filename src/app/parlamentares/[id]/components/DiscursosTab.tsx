'use client';

import { useEffect, useState, useRef } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination, InfiniteScroll } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, truncate } from '@/lib/utils';

interface Discurso {
  id: string;
  idExterno: string;
  data: string;
  hora?: string;
  tipo: string;
  resumo: string;
  urlOriginal: string;
  tema?: string;
  duracaoSegundos?: number;
  casa: string;
}

interface DiscursosTabProps {
  parlamentarId: string;
}

export function DiscursosTab({ parlamentarId }: DiscursosTabProps) {
  const [discursos, setDiscursos] = useState<Discurso[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadData = async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '20',
        ...(cursor && { cursor }),
      });
      
      const response = await fetch(`/api/parlamentares/${parlamentarId}/discursos?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar discursos');
      }
      
      const data = await response.json();
      
      if (cursor) {
        setDiscursos((prev) => [...prev, ...data.data]);
      } else {
        setDiscursos(data.data);
      }
      
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [parlamentarId]);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && sentinelRef.current) {
          loadData(nextCursor);
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, nextCursor]);

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
      'ORDEM_DIA': 'info',
      'PLENARIO': 'default',
      'COMISSAO': 'success',
      'LIDERANCA': 'warning',
      'OUTRO': 'default',
    };
    const labels: Record<string, string> = {
      'ORDEM_DIA': 'Ordem do Dia',
      'PLENARIO': 'Plenário',
      'COMISSAO': 'Comissão',
      'LIDERANCA': 'Liderança',
      'OUTRO': 'Outro',
    };
    return <Badge variant={variants[tipo] || 'default'}>{labels[tipo] || tipo}</Badge>;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button className="btn-outline" onClick={() => loadData()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InfiniteScroll
        hasMore={hasMore}
        nextCursor={nextCursor}
        onLoadMore={() => loadData(nextCursor)}
        isLoading={isLoading}
        sentinelRef={sentinelRef}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Data</TableHead>
                <TableHead>Título / Resumo</TableHead>
                <TableHead className="hidden md:table-cell w-28">Tipo</TableHead>
                <TableHead className="hidden lg:table-cell w-28">Tema</TableHead>
                <TableHead className="w-24 text-center">Duração</TableHead>
                <TableHead className="w-32 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discursos.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum discurso encontrado
                  </TableCell>
                </TableRow>
              ) : (
                discursos.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      {formatDate(d.data)}
                      {d.hora && <span className="text-muted-foreground ml-1 text-xs">{d.hora.substring(0, 5)}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground line-clamp-1 max-w-md">
                        {d.resumo || 'Sem resumo disponível'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{getTipoBadge(d.tipo)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {d.tema && <Badge variant="outline" className="text-xs">{d.tema}</Badge>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDuration(d.duracaoSegundos)}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={d.urlOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-sm font-medium"
                      >
                        Ler na íntegra
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {hasMore && (
          <div ref={sentinelRef} className="py-4">
            {isLoading && <div className="flex justify-center text-muted-foreground">Carregando mais...</div>}
          </div>
        )}
        
        {hasMore && !isLoading && (
          <Pagination
            hasMore={hasMore}
            nextCursor={nextCursor}
            onLoadMore={() => loadData(nextCursor)}
            isLoading={isLoading}
            label="Carregar mais discursos"
          />
        )}
      </InfiniteScroll>
    </div>
  );
}