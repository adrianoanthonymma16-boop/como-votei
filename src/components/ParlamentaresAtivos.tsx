'use client';

import { useState, useEffect } from 'react';
import { ParlamentarCard } from '@/components/ParlamentarCard';
import { Badge } from '@/components/ui/Badge';

export function ParlamentaresAtivos({ limit = 5 }: { limit?: number }) {
  const [parlamentares, setParlamentares] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function fetchData() {
      try {
        const response = await fetch(`/api/parlamentares?sort=produtivos&limit=${limit}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Erro ao carregar parlamentares mais produtivos');
        const data = await response.json();
        if (ativo) setParlamentares(data.data.slice(0, limit));
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
        {Array.from({ length: limit }).map((_, i) => (
          <ParlamentarCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (parlamentares.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center">
        <p className="text-muted-foreground">Nenhum parlamentar com atividade registrada.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-4" aria-label="Ranking de produtividade">
      {parlamentares.map((parlamentar, idx) => {
        const score = parlamentar.produtividade?.pontuacao ?? 0;
        return (
          <li key={parlamentar.id} className="relative">
            <div className="absolute -left-1 top-3 hidden sm:flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold shadow-sm ring-2 ring-background">
              {idx + 1}
            </div>
            <div className="sm:pl-6">
              <ParlamentarCard parlamentar={parlamentar} />
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-1 text-xs">
                <Badge variant="outline" className="gap-1">
                  Pontuação {score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </Badge>
                <span className="text-muted-foreground">
                  {parlamentar.produtividade
                    ? `${parlamentar.produtividade.plApresentados} PL · ${parlamentar.produtividade.plAprovados} aprov. · ${parlamentar.produtividade.votosSimNao} votos SIM/NÃO · ${parlamentar.produtividade.discursos} discursos · ${parlamentar.produtividade.faltas} faltas`
                    : null}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
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
