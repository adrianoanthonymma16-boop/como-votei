'use client';

import { Button } from './Button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  hasMore: boolean;
  nextCursor: string | undefined;
  onLoadMore: () => void;
  isLoading: boolean;
  label?: string;
}

export function Pagination({ hasMore, nextCursor, onLoadMore, isLoading, label = 'Carregar mais' }: PaginationProps) {
  if (!hasMore) {
    return (
      <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
        Fim da lista
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <Button
        variant="outline"
        size="md"
        onClick={onLoadMore}
        disabled={isLoading}
        className="min-w-[200px]"
      >
        {isLoading ? 'Carregando...' : label}
      </Button>
    </div>
  );
}

interface InfiniteScrollProps {
  hasMore: boolean;
  nextCursor: string | undefined;
  onLoadMore: () => void;
  isLoading: boolean;
  children: React.ReactNode;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function InfiniteScroll({ hasMore, nextCursor, onLoadMore, isLoading, children, sentinelRef }: InfiniteScrollProps) {
  return (
    <div>
      {children}
      {hasMore && (
        <div ref={sentinelRef} className="py-4">
          {isLoading && <div className="flex justify-center">Carregando...</div>}
        </div>
      )}
    </div>
  );
}