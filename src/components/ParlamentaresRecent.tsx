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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {parlamentares.map((parlamentar) => (
        <ParlamentarCard key={parlamentar.id} parlamentar={parlamentar} />
      ))}
    </div>
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