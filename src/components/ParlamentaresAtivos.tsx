'use client';

import { useState, useEffect } from 'react';
import { ParlamentarCard } from '@/components/ParlamentarCard';
import { Badge } from '@/components/ui/Badge';
import type { Parlamentar } from '@prisma/client';

interface ParlamentarComProdutividade extends Parlamentar {
  _count?: {
    votos: number;
    discursos: number;
    proposicoes: number;
  };
  partido?: { sigla: string; nome: string; cor: string | null } | null;
  uf?: { sigla: string; nome: string; regiao: string } | null;
  produtividade?: {
    pontuacao: number;
    plApresentados: number;
    plAprovados: number;
    faltas: number;
    votosSimNao: number;
    discursos: number;
  };
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M3 16L5.2 8.2L9.6 12L12 5.5L14.4 12L18.8 8.2L21 16H3Z"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M4 16.8H20" stroke="#92400e" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="7.2" r="1.3" fill="white" stroke="#ca8a04" strokeWidth="0.7" />
      <circle cx="6.2" cy="9.5" r="0.9" fill="white" stroke="#ca8a04" strokeWidth="0.6" />
      <circle cx="17.8" cy="9.5" r="0.9" fill="white" stroke="#ca8a04" strokeWidth="0.6" />
    </svg>
  );
}

const RANK_STYLE: Record<number, string> = {
  0: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.35)]',
  1: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-800 border-slate-300 shadow-sm',
  2: 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white border-amber-600 shadow-sm',
};

export function ParlamentaresAtivos({ limit = 5 }: { limit?: number }) {
  const [parlamentares, setParlamentares] = useState<ParlamentarComProdutividade[]>([]);
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
    <ol className="space-y-5" aria-label="Ranking de produtividade">
      {parlamentares.map((parlamentar, idx) => {
        const score = parlamentar.produtividade?.pontuacao ?? 0;
        const isTop = idx === 0;
        const rankClass =
          RANK_STYLE[idx] ??
          'bg-card text-muted-foreground border-border hover:border-accent/40 hover:text-foreground';
        return (
          <li key={parlamentar.id} className="relative flex gap-3 sm:gap-4 group">
            {/* Trilha / número */}
            <div className="hidden sm:flex flex-col items-center pt-1 shrink-0">
              <div className="relative">
                {isTop && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none select-none drop-shadow-sm" aria-hidden="true">
                    <CrownIcon className="w-7 h-7" />
                  </span>
                )}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black tracking-tight transition-all duration-200 ${rankClass} ${
                    isTop ? 'scale-110' : 'group-hover:scale-[1.03]'
                  }`}
                  aria-hidden="true"
                >
                  {idx + 1}
                </div>
              </div>
              <div className="mt-2 h-full w-px bg-gradient-to-b from-border to-transparent hidden sm:block" aria-hidden="true" />
            </div>

            {/* Card + métrica */}
            <div className="flex-1 min-w-0">
              {/* Número mobile */}
              <div className="sm:hidden mb-2 flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${rankClass}`}
                >
                  {idx + 1}
                </span>
                {isTop && <CrownIcon className="w-5 h-5" />}
                <span className="text-xs font-medium text-muted-foreground">#{idx + 1} mais produtivo</span>
              </div>

              <div className={`rounded-xl transition-all duration-200 ${isTop ? 'ring-1 ring-amber-300/50 shadow-md' : ''}`}>
                <ParlamentarCard parlamentar={parlamentar} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={`gap-1.5 font-mono text-xs px-2.5 py-1 border ${
                    isTop
                      ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                      : 'bg-card'
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
                  {score.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
                </Badge>
                <span className="text-xs text-muted-foreground">
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
