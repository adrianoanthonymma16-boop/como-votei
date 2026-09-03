'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

interface StatsData {
  parlamentares: number;
  votacoes: number;
  discursos: number;
  proposicoes: number;
  deputados: number;
  senadores: number;
}

type IconName = 'pessoas' | 'votacao' | 'discurso' | 'proposicao';

const ICONES: Record<IconName, React.ReactNode> = {
  pessoas: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  votacao: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  discurso: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8m-8 4h5m-9 5V7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4z" />
    </svg>
  ),
  proposicao: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/visao-geral', { cache: 'no-store' });
        if (!response.ok) throw new Error('Falha ao carregar estatísticas');
        const data = await response.json();
        if (ativo) setStats(data);
      } catch (err) {
        if (ativo) setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (ativo) setIsLoading(false);
      }
    }
    fetchStats();
    return () => {
      ativo = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card animate-pulse pointer-events-none">
            <div className="h-4 w-28 bg-muted rounded mb-4" />
            <div className="h-8 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Não foi possível carregar as estatísticas.
      </div>
    );
  }

  const cards: Array<{ label: string; value: number; detail: string; icon: IconName; color: string }> = [
    { label: 'Parlamentares', value: stats.parlamentares, detail: `${formatNumber(stats.deputados)} deputados · ${formatNumber(stats.senadores)} senadores`, icon: 'pessoas', color: 'text-primary dark:text-primary-foreground' },
    { label: 'Votações nominais', value: stats.votacoes, detail: 'votações registradas na base', icon: 'votacao', color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Discursos', value: stats.discursos, detail: 'pronunciamentos em plenário', icon: 'discurso', color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Proposições', value: stats.proposicoes, detail: 'projetos e proposições', icon: 'proposicao', color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="stat-card group">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            <span className={card.color}>{ICONES[card.icon]}</span>
          </div>
          <div className="text-3xl font-bold text-foreground">{formatNumber(card.value)}</div>
          <p className="text-xs text-muted-foreground mt-1">{card.detail}</p>
        </div>
      ))}
    </div>
  );
}
