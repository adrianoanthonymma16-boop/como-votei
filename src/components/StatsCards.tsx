'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
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
    { label: 'Parlamentares', value: stats.parlamentares, icon: '👥', color: 'primary' },
    { label: 'Votações', value: stats.votacoes, icon: '🗳️', color: 'secondary' },
    { label: 'Discursos', value: stats.discursos, icon: '🎤', color: 'success' },
    { label: 'Proposições', value: stats.proposicoes, icon: '📋', color: 'info' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{card.label}</span>
            <span className="text-2xl" aria-hidden="true">{card.icon}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(stats[card.label.toLowerCase() as keyof StatsData] || 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="animate-pulse rounded-md bg-gray-200 h-8 w-24 mb-4" />
          <div className="animate-pulse rounded-md bg-gray-200 h-12 w-32" />
        </div>
      ))}
    </div>
  );
}