'use client';

import { ParlamentarCard } from '@/components/ParlamentarCard';
import { Pagination, InfiniteScroll } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Parlamentar } from '@prisma/client';

interface ParlamentaresListProps {
  parlamentares: Parlamentar[];
  isLoading: boolean;
  hasMore: boolean;
  nextCursor: string | undefined;
  onLoadMore: () => void;
  sentinelRef: React.RefObject<HTMLDivElement>;
}

export function ParlamentaresList({ 
  parlamentares, 
  isLoading, 
  hasMore, 
  nextCursor, 
  onLoadMore, 
  sentinelRef 
}: ParlamentaresListProps) {
  if (parlamentares.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Nenhum parlamentar encontrado</p>
      </div>
    );
  }

  return (
    <InfiniteScroll
      hasMore={hasMore}
      nextCursor={nextCursor}
      onLoadMore={onLoadMore}
      isLoading={isLoading}
      sentinelRef={sentinelRef}
    >
      <div className="space-y-4">
        {parlamentares.map((parlamentar) => (
          <ParlamentarCard key={parlamentar.id} parlamentar={parlamentar} />
        ))}
        
        {/* Loading skeletons */}
        {isLoading && parlamentares.length > 0 && Array.from({ length: 4 }).map((_, i) => (
          <ParlamentarCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
      
      <Pagination
        hasMore={hasMore}
        nextCursor={nextCursor}
        onLoadMore={onLoadMore}
        isLoading={isLoading}
      />
    </InfiniteScroll>
  );
}

function ParlamentarCardSkeleton() {
  return (
    <div className="parlamentar-card animate-pulse pointer-events-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24">
          <div className="w-full h-full rounded-full bg-muted" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
            <div className="h-6 w-3/4 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border w-full sm:w-auto sm:border-t-0 sm:border-l sm:pl-4 sm:ml-auto">
            <div className="h-8 w-20 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded" />
            <div className="h-8 w-20 bg-muted rounded" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}