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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-muted" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-5 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="flex gap-2">
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