'use client';

import { useEffect, useState, useRef } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination, InfiniteScroll } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface Proposicao {
  id: string;
  idExterno: string;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
  autorPrincipal: boolean;
  status: string;
  dataApresentacao: string;
  urlOriginal: string;
  tema?: string;
  casa: string;
}

interface ProposicoesTabProps {
  parlamentarId: string;
}

export function ProposicoesTab({ parlamentarId }: ProposicoesTabProps) {
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([]);
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
      
      const response = await fetch(`/api/parlamentares/${parlamentarId}/proposicoes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar proposições');
      }
      
      const data = await response.json();
      
      if (cursor) {
        setProposicoes((prev) => [...prev, ...data.data]);
      } else {
        setProposicoes(data.data);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'default'> = {
      'APRESENTADA': 'secondary',
      'EM_TRAMITACAO': 'info',
      'APROVADA_CAMARA': 'success',
      'APROVADA_SENADO': 'success',
      'SANCIONADA': 'success',
      'VETADA': 'danger',
      'ARQUIVADA': 'default',
      'RETIRADA': 'default',
    };
    const labels: Record<string, string> = {
      'APRESENTADA': 'Apresentada',
      'EM_TRAMITACAO': 'Em Tramitação',
      'APROVADA_CAMARA': 'Aprovada Câmara',
      'APROVADA_SENADO': 'Aprovada Senado',
      'SANCIONADA': 'Sancionada',
      'VETADA': 'Vetada',
      'ARQUIVADA': 'Arquivada',
      'RETIRADA': 'Retirada',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'PL': 'bg-blue-100 text-blue-800',
      'PEC': 'bg-purple-100 text-purple-800',
      'MPL': 'bg-orange-100 text-orange-800',
      'REQ': 'bg-gray-100 text-gray-800',
      'PDC': 'bg-green-100 text-green-800',
    };
    return <Badge variant="outline" className={colors[tipo] || ''}>{tipo}</Badge>;
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
                <TableHead className="w-32">Apresentação</TableHead>
                <TableHead>Proposição</TableHead>
                <TableHead className="hidden md:table-cell w-28">Tipo</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="hidden lg:table-cell w-32">Tema</TableHead>
                <TableHead className="w-32 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposicoes.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma proposição encontrada
                  </TableCell>
                </TableRow>
              ) : (
                proposicoes.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      {formatDate(p.dataApresentacao)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 mb-1">
                        {getTipoBadge(p.tipo)}
                        <span className="font-medium text-foreground">
                          {p.tipo} {p.numero}/{p.ano}
                        </span>
                        {!p.autorPrincipal && (
                          <Badge variant="secondary" className="text-xs">Coautor</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                        {p.ementa}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{getTipoBadge(p.tipo)}</TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {p.tema && <Badge variant="outline" className="text-xs">{p.tema}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <a
                        href={p.urlOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-sm font-medium"
                      >
                        Ver tramitação
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
            label="Carregar mais projetos"
          />
        )}
      </InfiniteScroll>
    </div>
  );
}