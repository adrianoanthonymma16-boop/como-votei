'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { FonteOficial } from '@/components/FonteOficial';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';

interface Proposicao {
  id: string;
  idExterno: string;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string;
  autorPrincipal: boolean;
  status: string;
  dataApresentacao: string;
  urlOriginal: string;
  tema?: string;
  casa: string;
}

interface ProposicoesTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

const CORES_TIPO: Record<string, string> = {
  PL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  PEC: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  MPL: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  REQ: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  PDC: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
};

const SIGLAS_TIPO: Record<string, string> = {
  PL: 'Projeto de Lei',
  PEC: 'Proposta de Emenda à Constituição',
  PDC: 'Projeto de Decreto Legislativo',
  PLP: 'Projeto de Lei Complementar',
  MPL: 'Medida Provisória',
  REQ: 'Requerimento',
  IND: 'Indicação',
  RIC: 'Requerimento de Informação',
  RCP: 'Requerimento de Comissão Parlamentar',
  SUG: 'Sugestão',
};

const PER_PAGE = 10;

export function ProposicoesTab({ parlamentarId, casa }: ProposicoesTabProps) {
  const [proposicoes, setProposicoes] = useState<Proposicao[]>([]);
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
      const response = await fetch(`/api/parlamentares/${parlamentarId}/proposicoes?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar proposições');
      const data = await response.json();
      setProposicoes(data.data);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'default'> = {
      APRESENTADA: 'secondary',
      EM_TRAMITACAO: 'info',
      APROVADA_CAMARA: 'success',
      APROVADA_SENADO: 'success',
      SANCIONADA: 'success',
      VETADA: 'danger',
      ARQUIVADA: 'default',
      RETIRADA: 'default',
    };
    const labels: Record<string, string> = {
      APRESENTADA: 'Apresentada',
      EM_TRAMITACAO: 'Em Tramitação',
      APROVADA_CAMARA: 'Aprovada Câmara',
      APROVADA_SENADO: 'Aprovada Senado',
      SANCIONADA: 'Sancionada',
      VETADA: 'Vetada',
      ARQUIVADA: 'Arquivada',
      RETIRADA: 'Retirada',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => (
    <Badge variant="outline" className={CORES_TIPO[tipo] || ''}>{tipo}</Badge>
  );

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
        Toque em uma proposição para ler o que ela propõe e ver a tramitação oficial.
      </p>

      {proposicoes.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          Nenhuma proposição encontrada para este parlamentar.
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Proposições do parlamentar">
          {proposicoes.map((p) => {
            const aberta = abertas.has(p.id);
            return (
              <li key={p.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => alternar(p.id)}
                  aria-expanded={aberta}
                  aria-controls={`proposicao-${p.id}`}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      {getTipoBadge(p.tipo)}
                      <span className="text-sm font-semibold text-foreground">
                        {p.tipo} {p.numero}/{p.ano}
                      </span>
                      {!p.autorPrincipal && <Badge variant="secondary" className="text-xs">Coautoria</Badge>}
                      {p.tema && (
                        <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{p.tema}</Badge>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground line-clamp-2">{p.ementa}</span>
                  </span>
                  <span className="w-24 shrink-0 pt-0.5 text-right">
                    <span className="block text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {formatDate(p.dataApresentacao)}
                    </span>
                    <span className="block">{getStatusBadge(p.status)}</span>
                  </span>
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
                  <div id={`proposicao-${p.id}`} className="border-t border-border bg-muted/20 px-4 py-4 animate-fade-in">
                    <p className="text-sm leading-relaxed text-foreground">
                      <span className="font-medium">{SIGLAS_TIPO[p.tipo] || `Proposição de tipo ${p.tipo}`} </span>
                      {p.numero}/{p.ano} — {p.autorPrincipal ? 'de autoria do parlamentar' : 'em coautoria'}.
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">O que propõe: </span>
                      {p.ementa || 'Sem ementa disponível.'}
                    </p>
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Apresentação</dt>
                        <dd className="font-medium text-foreground">{formatDate(p.dataApresentacao)}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Situação</dt>
                        <dd className="font-medium text-foreground">{getStatusBadge(p.status)}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Autoria</dt>
                        <dd className="font-medium text-foreground">
                          {p.autorPrincipal ? 'Principal' : 'Coautoria'}
                        </dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2">
                        <dt className="text-xs text-muted-foreground">Tema</dt>
                        <dd className="font-medium text-foreground capitalize">{p.tema || 'Sem tema'}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Identificador oficial: {p.idExterno}</p>
                      <a
                        href={p.urlOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                      >
                        Ver ficha oficial da tramitação
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {isLoading && proposicoes.length === 0 && (
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
