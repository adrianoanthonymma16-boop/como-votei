'use client';

import { ParlamentarCard } from '@/components/ParlamentarCard';
import { useApiResource } from '@/lib/use-api-resource';
import { ParlamentarCardSkeleton } from '@/components/ParlamentarCardSkeleton';
import type { Parlamentar } from '@prisma/client';

interface ParlamentaresRecentProps {
  limit?: number;
}

export function ParlamentaresRecent({ limit = 10 }: ParlamentaresRecentProps) {
  const { data, isLoading, error } = useApiResource<{ data: Parlamentar[] }>(
    `/api/parlamentares?sort=recent&limit=${limit}`
  );
  const parlamentares = data?.data ?? [];

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
          <ParlamentarCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (parlamentares.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-muted-foreground">Nenhum parlamentar encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parlamentares.map((parlamentar) => (
        <ParlamentarCard key={parlamentar.id} parlamentar={parlamentar} />
      ))}
    </div>
  );
}
