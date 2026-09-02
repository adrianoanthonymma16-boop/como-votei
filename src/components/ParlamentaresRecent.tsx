'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ParlamentarCard } from '@/components/ParlamentarCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Parlamentar } from '@prisma/client';

interface ParlamentaresRecentProps {
  limit?: number;
}

export function ParlamentaresRecent({ limit = 10 }: ParlamentaresRecentProps) {
  const [parlamentares, setParlamentares] = useState<Parlamentar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/parlamentares?limit=${limit}`);
        if (!response.ok) throw new Error('Erro ao carregar');
        const data = await response.json();
        setParlamentares(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [limit]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: limit }).map((_, i) => (
          <ParlamentarCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (parlamentares.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum parlamentar encontrado</p>
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