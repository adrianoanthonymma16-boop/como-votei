'use client';

import { useEffect, useState, useRef } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination, InfiniteScroll } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { formatNumber, cn } from '@/lib/utils';

interface Votacao {
  id: string;
  idExterno: string;
  data: string;
  descricao: string;
  ementa?: string;
  tema?: string;
  resultado?: string;
  casa: string;
  voto?: string;
  alinhamento?: number;
}

interface VotacoesTabProps {
  parlamentarId: string;
}

export function VotacoesTab({ parlamentarId }: VotacoesTabProps) {
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
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
      
      const response = await fetch(`/api/parlamentares/${parlamentarId}/votacoes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar votações');
      }
      
      const data = await response.json();
      
      if (cursor) {
        setVotacoes((prev) => [...prev, ...data.data]);
      } else {
        setVotacoes(data.data);
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

  const getVotoBadge = (voto?: string) => {
    if (!voto || voto === '—') return <Badge variant="secondary">—</Badge>;
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'secondary'> = {
      'Sim': 'success',
      'Não': 'danger',
      'Abstenção': 'warning',
      'Articulação': 'info',
      'Obstrução': 'danger',
      'Ausente': 'secondary',
      'Licença': 'secondary',
      'Missão': 'secondary',
    };
    return <Badge variant={variants[voto] || 'secondary'}>{voto}</Badge>;
  };

  const getAlinhamentoColor = (alinhamento?: number) => {
    if (alinhamento === undefined) return 'text-muted-foreground';
    if (alinhamento >= 80) return 'text-green-700';
    if (alinhamento >= 60) return 'text-yellow-700';
    return 'text-red-700';
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
                <TableHead>Votação</TableHead>
                <TableHead className="hidden md:table-cell w-32">Tema</TableHead>
                <TableHead className="w-24 text-center">Voto</TableHead>
                <TableHead className="w-32 text-center">Alinhamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votacoes.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma votação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                votacoes.map((v) => (
                  <TableRow key={v.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      {formatDate(v.data)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{v.descricao}</div>
                      {v.ementa && (
                        <div className="text-sm text-muted-foreground truncate max-w-md">{v.ementa}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {v.tema && <Badge variant="outline" className="text-xs">{v.tema}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">{getVotoBadge(v.voto)}</TableCell>
                    <TableCell className="text-center">
                      {v.alinhamento !== undefined ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${v.alinhamento}%`,
                                backgroundColor: v.alinhamento >= 80 ? '#16A34A' : v.alinhamento >= 60 ? '#CA8A04' : '#DC2626'
                              }}
                            />
                          </div>
                          <span className={cn('font-medium text-sm', getAlinhamentoColor(v.alinhamento))}>
                            {v.alinhamento}%
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">—</Badge>
                      )}
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
            label="Carregar mais votações"
          />
        )}
      </InfiniteScroll>
    </div>
  );
}