'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { FonteOficial } from '@/components/FonteOficial';
import { FiltroAno } from '@/components/FiltroAno';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  FATOR_COAUTORIA_POR_GRUPO,
  PESO_APRESENTACAO,
  PESO_APROVACAO,
  ROTULOS_GRUPO,
  somarContagem,
  type ContagemPorGrupo,
  type GrupoTipoProposicao,
} from '@/lib/produtividade';

interface ProdutividadeData {
  ano: number | null;
  anos: number[];
  parlamentar: { id: string; nome: string; casa: string };
  pontuacao: number;
  apresentadosPrincipal: ContagemPorGrupo;
  apresentadosCoautoria: ContagemPorGrupo;
  aprovados: ContagemPorGrupo;
  faltas: number;
  votosSimNao: number;
  discursos: number;
  resumo: { apresentadas: number; aprovadas: number };
}

interface ProdutividadeTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

const ORDEM_GRUPOS: GrupoTipoProposicao[] = ['PEC', 'PLP', 'PL', 'PDL_PRC', 'REQ', 'INC', 'OUTRO'];

export function ProdutividadeTab({ parlamentarId, casa }: ProdutividadeTabProps) {
  const [data, setData] = useState<ProdutividadeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ano, setAno] = useState('');

  const loadData = useCallback(
    async (anoFiltro?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const a = anoFiltro ?? ano;
        const url = `/api/parlamentares/${parlamentarId}/produtividade${a ? `?ano=${a}` : ''}`;
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Erro ao carregar produtividade');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    },
    [parlamentarId, ano]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAno = (novoAno: string) => {
    setAno(novoAno);
    loadData(novoAno);
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button className="btn-outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const gruposComDados = ORDEM_GRUPOS.filter(
    (g) =>
      (data.apresentadosPrincipal[g] ?? 0) > 0 ||
      (data.apresentadosCoautoria[g] ?? 0) > 0 ||
      (data.aprovados[g] ?? 0) > 0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <FiltroAno ano={ano} anos={data.anos ?? []} onChange={handleAno} />
      </div>

      {/* Pontuação */}
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Pontuação de produtividade{data.ano ? ` em ${data.ano}` : ' (todos os anos)'}
        </p>
        <p className="mt-1 text-5xl font-bold text-foreground">
          {data.pontuacao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="ml-2 text-lg font-medium text-muted-foreground">pts</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.resumo.apresentadas} proposições apresentadas · {data.resumo.aprovadas} aprovadas
        </p>
        <Link
          href={`/parlamentares/${parlamentarId}/proposicoes`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Ver cada proposição e sua situação
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Contadores gerais */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ContadorCard label="Autoria principal" value={somarContagem(data.apresentadosPrincipal)} hint="proposições apresentadas" />
        <ContadorCard label="Coautoria" value={somarContagem(data.apresentadosCoautoria)} hint="assinadas em conjunto" />
        <ContadorCard label="Aprovadas" value={data.resumo.aprovadas} hint="autoria principal" destaque />
        <ContadorCard label="Votos SIM/NÃO" value={data.votosSimNao} hint="em votações nominais" />
        <ContadorCard label="Discursos" value={data.discursos} hint="pronunciamentos" />
        <ContadorCard label="Faltas" value={data.faltas} hint="ausências (−0,02 cada)" />
      </div>

      {/* Detalhamento por tipo */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold text-foreground">Por tipo de proposição</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Apresentadas e aprovadas de autoria própria, com o peso que cada uma vale na pontuação.
        </p>
        {gruposComDados.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma proposição sincronizada para este parlamentar ainda.
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {gruposComDados.map((g) => {
              const princ = data.apresentadosPrincipal[g] ?? 0;
              const coaut = data.apresentadosCoautoria[g] ?? 0;
              const aprov = data.aprovados[g] ?? 0;
              const pontos =
                princ * PESO_APRESENTACAO[g] +
                coaut * PESO_APRESENTACAO[g] * FATOR_COAUTORIA_POR_GRUPO[g] +
                aprov * PESO_APROVACAO[g];
              return (
                <li key={g} className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ROTULOS_GRUPO[g].sigla}</Badge>
                      <span className="text-sm font-medium text-foreground">{ROTULOS_GRUPO[g].nome}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-accent">
                      +{pontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{princ} de autoria principal <span className="text-muted-foreground/70">(+{PESO_APRESENTACAO[g]} cada)</span></span>
                    {coaut > 0 && (
                      <span>
                        {coaut} em coautoria{' '}
                        {FATOR_COAUTORIA_POR_GRUPO[g] === 0 ? (
                          <span className="text-muted-foreground/70">(não pontua)</span>
                        ) : (
                          <span className="text-muted-foreground/70">(metade cada)</span>
                        )}
                      </span>
                    )}
                    {aprov > 0 && (
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {aprov} aprovada{aprov !== 1 ? 's' : ''} (+{PESO_APROVACAO[g]} cada)
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <FonteOficial casa={casa} />
    </div>
  );
}

function ContadorCard({
  label,
  value,
  hint,
  destaque,
}: {
  label: string;
  value: number;
  hint: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        destaque ? 'border-green-500/40 bg-green-500/5' : 'border-border bg-card'
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString('pt-BR')}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
