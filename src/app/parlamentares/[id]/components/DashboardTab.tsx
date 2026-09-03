'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn, formatNumber, formatDate } from '@/lib/utils';

interface DashboardData {
  ano: number;
  anos: number[];
  semDados?: boolean;
  parlamentar: {
    id: string;
    nome: string;
    casa: string;
    partido: { sigla: string; cor?: string };
    uf: { sigla: string };
    legislatura: number;
  };
  frequencia: {
    totalSessoes: number;
    presencas: number;
    faltasJustificadas: number;
    faltasInjustificadas: number;
    taxaPresenca: number;
  };
  alinhamento: {
    totalVotacoes: number;
    votosAlinhados: number;
    percentualAlinhamento: number;
    rankingPartido?: number;
    totalPartido?: number;
  };
  atividade: {
    porMes: Array<{ mes: string; votações: number; discursos: number; proposicoes: number }>;
  };
  temas: Array<{ tema: string; total: number; votações: number; discursos: number; proposicoes: number }>;
}

interface DashboardTabProps {
  parlamentarId: string;
}

export function DashboardTab({ parlamentarId }: DashboardTabProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = ainda não escolhido: a API escolhe o ano mais recente com dados.
  const [ano, setAno] = useState<number | null>(null);
  const [anos, setAnos] = useState<number[]>([]);
  const anoCarregadoRef = useRef<number | null>(null);

  const loadData = async (alvo: number | null, mostrarLoading = true) => {
    try {
      if (mostrarLoading) setIsLoading(true);
      setError(null);

      const url = alvo
        ? `/api/parlamentares/${parlamentarId}/dashboard?ano=${alvo}`
        : `/api/parlamentares/${parlamentarId}/dashboard`;
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const result = await response.json();
      setData(result);
      setAnos(Array.isArray(result.anos) ? result.anos : result.ano ? [result.ano] : []);
      anoCarregadoRef.current = result.ano;

      // Primeira carga (sem ?ano): reflete o ano escolhido pelo servidor.
      if (alvo === null && typeof result.ano === 'number') {
        setAno(result.ano);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Evita recarregar quando apenas refletimos o ano vindo da primeira resposta.
    if (ano !== null && ano === anoCarregadoRef.current && data) return;
    loadData(ano);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parlamentarId, ano]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button className="btn-outline" onClick={() => loadData(ano)}>Tentar novamente</button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  if (data.semDados) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="font-semibold text-foreground">Sem dados na base para este parlamentar</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Nenhuma votação, discurso ou proposição foi sincronizado para este parlamentar ainda.
          Os dados são atualizados diariamente a partir das APIs oficiais.
        </p>
      </div>
    );
  }

  const { parlamentar, frequencia, alinhamento, atividade, temas } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com seletor de ano */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard do Parlamentar</h2>
          <p className="text-muted-foreground">Visão consolidada de atuação legislativa em {ano}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Ano
          <select
            value={ano ?? ''}
            onChange={(e) => setAno(Number(e.target.value))}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {anos.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Presença em Plenário"
          value={`${frequencia.taxaPresenca?.toFixed(1) || 0}%`}
          icon="calendario"
          trend={frequencia.taxaPresenca && frequencia.taxaPresenca >= 90 ? 'positive' : frequencia.taxaPresenca && frequencia.taxaPresenca >= 70 ? 'neutral' : 'negative'}
          subtitle={`${frequencia.presencas} de ${frequencia.totalSessoes} sessões`}
        />
        <StatCard
          label="Alinhamento Partidário"
          value={`${alinhamento.percentualAlinhamento?.toFixed(1) || 0}%`}
          icon="maos"
          trend={alinhamento.percentualAlinhamento && alinhamento.percentualAlinhamento >= 80 ? 'positive' : alinhamento.percentualAlinhamento && alinhamento.percentualAlinhamento >= 60 ? 'neutral' : 'negative'}
          subtitle={`${alinhamento.votosAlinhados} de ${alinhamento.totalVotacoes} votações`}
        />
        <StatCard
          label="Votações no Período"
          value={formatNumber(alinhamento.totalVotacoes)}
          icon="votacao"
          subtitle={`${frequencia.totalSessoes} sessões deliberativas`}
        />
        <StatCard
          label="Atividade Legislativa"
          value={formatNumber(atividade.porMes.reduce((a, b) => a + b.votações + b.discursos + b.proposicoes, 0))}
          icon="grafico"
          subtitle={`${atividade.porMes.length} meses de dados`}
        />
      </div>

      {/* Grid principal: Gráfico de atividade + Temas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atividade mensal - ocupa 2 colunas */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Atividade Legislativa Mensal</h3>
          <ActivityChart data={atividade.porMes} />
        </div>

        {/* Temas principais - ocupa 1 coluna */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Temas Principais</h3>
          <TemasList temas={temas} />
        </div>
      </div>

      {/* Detalhes de frequência e alinhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequência detalhada */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Frequência em Plenário</h3>
          <div className="space-y-4">
            <FrequencyBar label="Presenças" value={frequencia.presencas} total={frequencia.totalSessoes} color="bg-green-500" />
            <FrequencyBar label="Faltas Justificadas" value={frequencia.faltasJustificadas} total={frequencia.totalSessoes} color="bg-yellow-500" />
            <FrequencyBar label="Faltas Injustificadas" value={frequencia.faltasInjustificadas} total={frequencia.totalSessoes} color="bg-red-500" />
          </div>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Total de sessões: </span>
            <span className="font-medium">{frequencia.totalSessoes}</span>
            <span className="text-muted-foreground ml-4">Taxa de presença: </span>
            <span className="font-medium text-green-700">{frequencia.taxaPresenca?.toFixed(1)}%</span>
          </div>
        </div>

        {/* Alinhamento detalhado */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Alinhamento Partidário</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground mb-2">
                {alinhamento.percentualAlinhamento?.toFixed(1) || 0}%
              </div>
              <div className="w-48 h-8 bg-muted rounded-full overflow-hidden mx-auto">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${alinhamento.percentualAlinhamento || 0}%`,
                    backgroundColor: (alinhamento.percentualAlinhamento || 0) >= 80 ? '#16A34A' : (alinhamento.percentualAlinhamento || 0) >= 60 ? '#CA8A04' : '#DC2626'
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {alinhamento.votosAlinhados} de {alinhamento.totalVotacoes} votações alinhadas
              </p>
            </div>
            {alinhamento.rankingPartido && alinhamento.totalPartido && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Ranking no {parlamentar.partido.sigla}: <span className="font-medium">#{alinhamento.rankingPartido}</span> de {alinhamento.totalPartido}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  trend, 
  subtitle 
}: { 
  label: string; 
  value: string; 
  icon: 'calendario' | 'maos' | 'votacao' | 'grafico';
  trend?: 'positive' | 'neutral' | 'negative';
  subtitle?: string;
}) {
  const trendColors = {
    positive: 'text-green-600',
    neutral: 'text-yellow-600',
    negative: 'text-red-600',
  };

  const icones = {
    calendario: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    maos: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    votacao: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    grafico: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-accent" aria-hidden="true">{icones[icon]}</span>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={cn('text-xs font-medium', trendColors[trend])}>
            {trend === 'positive' ? 'Acima da média' : trend === 'neutral' ? 'Na média' : 'Abaixo da média'}
          </span>
        </div>
      )}
    </div>
  );
}

function ActivityChart({ data }: { data: Array<{ mes: string; votações: number; discursos: number; proposicoes: number }> }) {
  const maxValue = Math.max(...data.map(d => d.votações + d.discursos + d.proposicoes), 1);
  
  return (
    <div className="h-64 flex items-end gap-2" style={{ minHeight: '256px' }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div 
            className="w-full flex gap-1 justify-center"
            style={{ height: `${((d.votações + d.discursos + d.proposicoes) / maxValue) * 200}px`, minHeight: '4px' }}
          >
            <div 
              className="bg-blue-500 rounded-t" 
              style={{ width: `${(d.votações / (d.votações + d.discursos + d.proposicoes || 1)) * 100}%`, minWidth: '4px' }}
              title={`Votações: ${d.votações}`}
            />
            <div 
              className="bg-green-500 rounded-t" 
              style={{ width: `${(d.discursos / (d.votações + d.discursos + d.proposicoes || 1)) * 100}%`, minWidth: '4px' }}
              title={`Discursos: ${d.discursos}`}
            />
            <div 
              className="bg-purple-500 rounded-t" 
              style={{ width: `${(d.proposicoes / (d.votações + d.discursos + d.proposicoes || 1)) * 100}%`, minWidth: '4px' }}
              title={`Proposições: ${d.proposicoes}`}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">{d.mes}</span>
        </div>
      ))}
      <div className="flex gap-4 mt-4 justify-center text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> Votações</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Discursos</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-500 rounded" /> Proposições</span>
      </div>
    </div>
  );
}

function TemasList({ temas }: { temas: Array<{ tema: string; total: number; votações: number; discursos: number; proposicoes: number }> }) {
  if (!temas.length) {
    return <p className="text-muted-foreground text-sm text-center py-8">Nenhum tema identificado</p>;
  }

  return (
    <div className="space-y-3">
      {temas.slice(0, 8).map((t, i) => (
        <div key={t.tema} className="group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground truncate pr-2">{t.tema}</span>
            <span className="text-sm font-bold text-foreground">{t.total}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: `${(t.total / (temas[0]?.total || 1)) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true" /> {t.votações} votações</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" aria-hidden="true" /> {t.discursos} discursos</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true" /> {t.proposicoes} proposições</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FrequencyBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-foreground">{label}</span>
        <span className="font-medium text-foreground">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color.replace('bg-', '').replace('-500', '-500') }}
        />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-5 w-1/4 mb-4" />
          <div className="h-64 flex items-end gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-muted rounded-t"
                  style={{ height: `${60 + ((i * 37) % 5) * 34 + 20}px` }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-5 w-1/4 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-5 w-1/4 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-2 w-20" />
                <div className="h-2 bg-muted rounded-full overflow-hidden w-3/4">
                  <Skeleton className="h-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <Skeleton className="h-5 w-1/4 mb-4" />
          <div className="text-center">
            <Skeleton className="h-10 w-20 mx-auto mb-2" />
            <div className="w-48 h-8 bg-muted rounded-full overflow-hidden mx-auto">
              <Skeleton className="h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}