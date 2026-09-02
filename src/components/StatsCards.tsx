'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

interface StatsData {
  parlamentares: number;
  votacoes: number;
  discursos: number;
  proposicoes: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({
    parlamentares: 0,
    votacoes: 0,
    discursos: 0,
    proposicoes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/visao-geral');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (isLoading) {
    return <StatsCardsSkeleton />;
  }

  const cards = [
    { label: 'Parlamentares', value: stats.parlamentares, icon: '👥', color: 'text-primary' },
    { label: 'Votações', value: stats.votacoes, icon: '🗳️', color: 'text-blue-500' },
    { label: 'Discursos', value: stats.discursos, icon: '🎤', color: 'text-purple-500' },
    { label: 'Proposições', value: stats.proposicoes, icon: '📋', color: 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="stat-card group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
            <span className="text-2xl" aria-hidden="true">{card.icon}</span>
          </div>
          <div className={`text-3xl font-bold ${card.color} transition-colors`}>
            {formatNumber(stats[card.label.toLowerCase() as keyof StatsData] || 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat-card animate-pulse pointer-events-none">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="h-8 w-32 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
