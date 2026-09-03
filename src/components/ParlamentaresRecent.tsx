'use client';

import { useState, useEffect } from 'react';
import { ParlamentarCard } from '@/components/ParlamentarCard';
import type { Parlamentar } from '@prisma/client';

interface ParlamentaresRecentProps {
  limit?: number;
}

export function ParlamentaresRecent({ limit = 10 }: ParlamentaresRecentProps) {
  const [parlamentares, setParlamentares] = useState<Parlamentar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function fetchData() {
      try {
        // Sempre busca a versão mais recente na base (sem cache).
        const response = await fetch(`/api/parlamentares?sort=recent&limit=${limit}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Erro ao carregar');
        const data = await response.json();
        if (ativo) setParlamentares(data.data);
      } catch (err) {
        if (ativo) setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (ativo) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      ativo = false;
    };
  }, [limit]);

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

function ParlamentarCardSkeleton() {
  return (
    <div className="parlamentar-card animate-pulse pointer-events-none">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted" />
        <div className="flex-1 min-w-0 w-full space-y-3">
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/4 bg-muted rounded" />
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
