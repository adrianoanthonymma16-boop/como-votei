'use client';

import { ParlamentarCard } from '@/components/ParlamentarCard';
import type { Parlamentar } from '@prisma/client';

interface ParlamentaresListProps {
  parlamentares: Parlamentar[];
  isLoading: boolean;
  total?: number;
}

export function ParlamentaresList({ parlamentares, isLoading, total }: ParlamentaresListProps) {
  if (!isLoading && parlamentares.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-muted-foreground">Nenhum parlamentar encontrado com esses filtros.</p>
        <p className="text-sm text-muted-foreground mt-1">Tente ajustar a busca ou remover filtros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parlamentares.map((parlamentar) => (
        <ParlamentarCard key={parlamentar.id} parlamentar={parlamentar} />
      ))}

      {isLoading && parlamentares.length === 0 && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ParlamentarCardSkeleton key={`skeleton-${i}`} />
          ))}
        </div>
      )}

      {!isLoading && total === 0 && parlamentares.length > 0 && null}
    </div>
  );
}

function ParlamentarCardSkeleton() {
  return (
    <div className="parlamentar-card animate-pulse pointer-events-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
          <div className="w-full h-full rounded-full bg-muted" />
        </div>
        <div className="flex-1 min-w-0 w-full">
          <div className="h-5 w-1/3 bg-muted rounded mb-2" />
          <div className="h-4 w-1/4 bg-muted rounded mb-4" />
          <div className="flex gap-2">
            <div className="h-12 w-24 bg-muted rounded" />
            <div className="h-12 w-24 bg-muted rounded" />
            <div className="h-12 w-24 bg-muted rounded" />
            <div className="h-12 w-28 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
