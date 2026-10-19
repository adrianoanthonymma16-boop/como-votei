'use client';

import { ParlamentarCard } from '@/components/ParlamentarCard';
import { ParlamentarCardSkeleton } from '@/components/ParlamentarCardSkeleton';
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
