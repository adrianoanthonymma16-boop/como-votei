'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { FonteOficial } from '@/components/FonteOficial';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';

interface Discurso {
  id: string;
  idExterno: string;
  data: string;
  hora?: string;
  tipo: string;
  resumo: string;
  urlOriginal: string;
  tema?: string;
  duracaoSegundos?: number;
  casa: string;
}

interface DiscursosTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

const PER_PAGE = 10;

export function DiscursosTab({ parlamentarId, casa }: DiscursosTabProps) {
  const [discursos, setDiscursos] = useState<Discurso[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const loadData = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PER_PAGE),
      });
      const response = await fetch(`/api/parlamentares/${parlamentarId}/discursos?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar discursos');
      const data = await response.json();
      setDiscursos(data.data);
      setTotal(data.total ?? data.data.length);
      setTotalPages(data.totalPages ?? 1);
      setPage(data.page ?? targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [parlamentarId]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

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

  const getTipoBadge = (tipo: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
      ORDEM_DIA: 'info',
      PLENARIO: 'default',
      COMISSAO: 'success',
      LIDERANCA: 'warning',
      OUTRO: 'default',
    };
    const labels: Record<string, string> = {
      ORDEM_DIA: 'Ordem do Dia',
      PLENARIO: 'Plenário',
      COMISSAO: 'Comissão',
      LIDERANCA: 'Liderança',
      OUTRO: 'Outro',
    };
    return <Badge variant={variants[tipo] || 'default'}>{labels[tipo] || tipo}</Badge>;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const primeiroParagrafo = (resumo: string) => resumo.split(/\n{2,}/)[0] || resumo;

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
        Toque em um pronunciamento para ler o resumo e acessar o texto oficial.
      </p>

      {discursos.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          Nenhum discurso encontrado para este parlamentar.
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Discursos do parlamentar">
          {discursos.map((d) => {
            const aberta = abertas.has(d.id);
            const abreviado = primeiroParagrafo(d.resumo || '');
            return (
              <li key={d.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => alternar(d.id)}
                  aria-expanded={aberta}
                  aria-controls={`discurso-${d.id}`}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="w-24 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {formatDate(d.data)}
                    {d.hora && <span className="block">{d.hora.substring(0, 5)}</span>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-foreground line-clamp-2">
                      {abreviado || 'Sem resumo disponível'}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      {getTipoBadge(d.tipo)}
                      {d.tema && (
                        <Badge variant="outline" className="text-xs capitalize">{d.tema}</Badge>
                      )}
                      {d.duracaoSegundos ? (
                        <span className="text-xs text-muted-foreground">{formatDuration(d.duracaoSegundos)}</span>
                      ) : null}
                    </span>
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
                  <div id={`discurso-${d.id}`} className="border-t border-border bg-muted/20 px-4 py-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-medium text-foreground">Resumo do pronunciamento: </span>
                      {d.resumo || 'Sem resumo disponível.'}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Pronunciamento registrado em {formatDate(d.data)}
                        {d.hora ? ` às ${d.hora.substring(0, 5)}` : ''} · identificador {d.idExterno}
                      </p>
                      <a
                        href={d.urlOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                      >
                        Ler texto integral na fonte oficial
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

      {isLoading && discursos.length === 0 && (
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
