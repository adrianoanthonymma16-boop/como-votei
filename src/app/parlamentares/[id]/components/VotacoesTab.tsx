'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { FonteOficial } from '@/components/FonteOficial';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, cn } from '@/lib/utils';

interface Votacao {
  id: string;
  idExterno: string;
  data: string;
  descricao: string;
  ementa?: string;
  tema?: string;
  resultado?: string;
  casa: string;
  voto?: string;
  alinhamento?: number;
}

interface VotacoesTabProps {
  parlamentarId: string;
  nome?: string;
  casa: 'CAMARA' | 'SENADO';
}

const PER_PAGE = 10;

export function VotacoesTab({ parlamentarId, nome, casa }: VotacoesTabProps) {
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const loadData = async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PER_PAGE),
      });
      const response = await fetch(`/api/parlamentares/${parlamentarId}/votacoes?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar votações');
      const data = await response.json();
      setVotacoes(data.data);
      setTotal(data.total ?? data.data.length);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [parlamentarId]);

  const handlePageChange = (p: number) => {
    loadData(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const alternar = (id: string) =>
    setAbertas((prev) => {
      const prox = new Set(prev);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });

  const getVotoBadge = (voto?: string) => {
    const rotulos: Record<string, string> = {
      SIM: 'Sim',
      NAO: 'Não',
      ABSTENCAO: 'Abstenção',
      ARTICULACAO: 'Articulação',
      OBSTRUCAO: 'Obstrução',
      AUSENTE: 'Ausente',
      LICENCA: 'Licença',
      MISSAO: 'Missão',
    };
    if (!voto || !rotulos[voto]) return <Badge variant="secondary">—</Badge>;
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'secondary'> = {
      SIM: 'success',
      NAO: 'danger',
      ABSTENCAO: 'warning',
      ARTICULACAO: 'info',
      OBSTRUCAO: 'danger',
      AUSENTE: 'secondary',
      LICENCA: 'secondary',
      MISSAO: 'secondary',
    };
    return <Badge variant={variants[voto]}>{rotulos[voto]}</Badge>;
  };

  const getAlinhamentoColor = (alinhamento?: number) => {
    if (alinhamento === undefined) return 'text-muted-foreground';
    if (alinhamento >= 80) return 'text-green-700 dark:text-green-400';
    if (alinhamento >= 60) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <button className="btn-outline" onClick={() => loadData(page)}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Toque em uma votação para ler o resumo e entender o que foi decidido.
      </p>

      {votacoes.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          Nenhuma votação encontrada para este parlamentar.
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Votações do parlamentar">
          {votacoes.map((v) => {
            const aberta = abertas.has(v.id);
            return (
              <li key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => alternar(v.id)}
                  aria-expanded={aberta}
                  aria-controls={`votacao-${v.id}`}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {formatDate(v.data)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {v.ementa || v.descricao}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate mt-0.5">
                      {v.descricao !== (v.ementa || v.descricao) ? v.descricao : v.tema || `Votação ${v.idExterno}`}
                    </span>
                  </span>
                  <span className="shrink-0">{getVotoBadge(v.voto)}</span>
                  <span
                    className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border border-border text-muted-foreground transition-transform duration-200 ${
                      aberta ? 'rotate-180 text-accent border-accent' : ''
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {aberta && (
                  <div id={`votacao-${v.id}`} className="border-t border-border bg-muted/20 px-4 py-4 animate-fade-in">
                    <p className="text-sm text-foreground leading-relaxed">
                      {nome ? <strong>{nome}</strong> : <strong>O parlamentar</strong>} votou{' '}
                      <strong>{v.voto || '—'}</strong> nesta deliberação.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">Sobre o que foi: </span>
                      {v.ementa || v.descricao || 'Votação sem ementa disponível.'}
                    </p>
                    {v.descricao && v.descricao !== v.ementa && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.descricao}</p>
                    )}
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Data</dt>
                        <dd className="font-medium text-foreground">{formatDate(v.data)}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Tema</dt>
                        <dd className="font-medium text-foreground capitalize">{v.tema || 'Sem tema'}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Resultado</dt>
                        <dd className="font-medium text-foreground">{v.resultado || '—'}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Alinhamento</dt>
                        <dd className={cn('font-medium', getAlinhamentoColor(v.alinhamento))}>
                          {v.alinhamento !== undefined ? `${v.alinhamento}%` : '—'}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Registro sincronizado via API oficial — identificador {v.idExterno}. Valide nos links abaixo.
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {isLoading && votacoes.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      <PaginacaoNumerica page={page} totalPages={totalPages} total={total} onChange={handlePageChange} />

      <FonteOficial casa={casa} />
    </div>
  );
}
