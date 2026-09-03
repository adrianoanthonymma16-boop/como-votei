'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/utils';

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

interface PorCasa {
  CAMARA: number;
  SENADO: number;
}

interface ItemDetalhe {
  porCasa: PorCasa;
  porAno?: Array<{ ano: number; total: number }>;
  descricao?: string;
}

interface StatsData {
  parlamentares: number;
  deputados: number;
  senadores: number;
  votacoes: number;
  discursos: number;
  proposicoes: number;
  partidos: number;
  detalhe: {
    parlamentares: ItemDetalhe;
    votacoes: ItemDetalhe;
    discursos: ItemDetalhe;
    proposicoes: ItemDetalhe;
  };
}

type CardId = 'parlamentares' | 'votacoes' | 'discursos' | 'proposicoes';

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aberto, setAberto] = useState<CardId | null>(null);

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

  const cards: Array<{ id: CardId; label: string; value: number; detail: string; icon: IconName; color: string }> = [
    { id: 'parlamentares', label: 'Parlamentares', value: stats.parlamentares, detail: `${formatNumber(stats.deputados)} deputados · ${formatNumber(stats.senadores)} senadores`, icon: 'pessoas', color: 'text-primary dark:text-primary-foreground' },
    { id: 'votacoes', label: 'Votações nominais', value: stats.votacoes, detail: 'registros de votações na base', icon: 'votacao', color: 'text-blue-600 dark:text-blue-400' },
    { id: 'discursos', label: 'Discursos', value: stats.discursos, detail: 'pronunciamentos em plenário', icon: 'discurso', color: 'text-purple-600 dark:text-purple-400' },
    { id: 'proposicoes', label: 'Proposições', value: stats.proposicoes, detail: 'projetos e proposições', icon: 'proposicao', color: 'text-green-600 dark:text-green-400' },
  ];

  const alternar = (id: CardId) => setAberto((atual) => (atual === id ? null : id));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const isOpen = aberto === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => alternar(card.id)}
              aria-expanded={isOpen}
              aria-controls={`detalhe-${card.id}`}
              className="stat-card group w-full text-left cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{card.label}</span>
                <span className={card.color}>{ICONES[card.icon]}</span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="text-3xl font-bold text-foreground">{formatNumber(card.value)}</div>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full border border-border text-muted-foreground transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-accent border-accent' : 'group-hover:border-accent group-hover:text-accent'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.detail}</p>
            </button>
          );
        })}
      </div>

      {aberto && stats.detalhe[aberto] && (
        <div id={`detalhe-${aberto}`} className="mt-4 animate-fade-in">
          <StatDetalhe id={aberto} stats={stats} />
        </div>
      )}
    </div>
  );
}

function StatDetalhe({ id, stats }: { id: CardId; stats: StatsData }) {
  const item = stats.detalhe[id];
  const totalCasa = item.porCasa.CAMARA + item.porCasa.SENADO;
  const total = stats[id];
  const porCasa = [
    { nome: 'Câmara dos Deputados', sigla: 'CD', valor: item.porCasa.CAMARA },
    { nome: 'Senado Federal', sigla: 'SF', valor: item.porCasa.SENADO },
  ];
  const cores: Record<CardId, string> = {
    parlamentares: 'bg-blue-500',
    votacoes: 'bg-blue-500',
    discursos: 'bg-purple-500',
    proposicoes: 'bg-green-500',
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">
            {stats.detalhe[id].descricao ? 'Como ler este número' : 'Detalhamento'}
          </h3>
          {item.descricao && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.descricao}</p>}
          <p className="mt-3 text-sm text-muted-foreground">
            Total de <strong className="text-foreground">{formatNumber(total)}</strong> registros sincronizados das
            APIs oficiais da Câmara dos Deputados e do Senado Federal.
          </p>
        </div>

        <div className="w-full lg:w-72 shrink-0 space-y-3">
          {porCasa.map((c) => {
            const pct = totalCasa > 0 ? Math.round((c.valor / totalCasa) * 100) : 0;
            return (
              <div key={c.sigla}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{c.nome}</span>
                  <span className="font-semibold text-foreground">
                    {formatNumber(c.valor)} <span className="font-normal text-muted-foreground">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cores[id]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {item.porAno && item.porAno.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Registros por ano</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {item.porAno.slice(0, 6).map((a) => (
              <div key={a.ano} className="rounded-lg border border-border bg-background px-3 py-2 text-center">
                <div className="text-lg font-bold text-foreground">{formatNumber(a.total)}</div>
                <div className="text-xs text-muted-foreground">{a.ano}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
