'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { FonteOficial } from '@/components/FonteOficial';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, cn } from '@/lib/utils';
import { temaCor, classificarTemas, descreverTipoProposicao } from '@/lib/temas';

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

/** Extrai tipo e número do PL a partir da descrição (ex: "PL 1234/2024") */
function extrairInfoProposicao(descricao: string, ementa?: string): { tipo?: string; numero?: string; texto?: string } {
  const texto = ementa || descricao;
  // Padrão: "PL 1234/2024" ou "PL nº 1234/2024"
  const match = texto.match(/\b(PL|PLP|PEC|PLV|PLVC|PDL|PRC|REQ|RIC|DEC|OFE)\s*(?:nº\s*)?(\d[\d./]*)/i);
  if (match) {
    return {
      tipo: match[1].toUpperCase(),
      numero: match[2],
      texto: descreverTipoProposicao(match[1].toUpperCase()),
    };
  }
  return {};
}

/** Gera um resumo educacional curto a partir da ementa */
function gerarResumo(ementa?: string, descricao?: string): string {
  const texto = ementa || descricao || '';
  if (!texto) return 'Votação sem detalhes disponíveis na fonte oficial.';

  // Se a ementa já é curta (até 200 chars), usar direto
  if (texto.length <= 200) return texto;

  // Cortar em frase completa até ~180 chars
  const cortado = texto.substring(0, 180);
  const ultimoPonto = cortado.lastIndexOf('.');
  if (ultimoPonto > 100) return cortado.substring(0, ultimoPonto + 1);

  const ultimoEspaco = cortado.lastIndexOf(' ');
  return cortado.substring(0, ultimoEspaco > 100 ? ultimoEspaco : 180) + '...';
}

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

  const getResultadoBadge = (resultado?: string) => {
    if (!resultado) return null;
    const variants: Record<string, 'success' | 'danger' | 'warning'> = {
      APROVADA: 'success',
      REJEITADA: 'danger',
    };
    return <Badge variant={variants[resultado] || 'secondary'}>{resultado}</Badge>;
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
        Toque em uma votação para entender o que foi votado e por que importa.
      </p>

      {votacoes.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground">
          Nenhuma votação encontrada para este parlamentar.
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Votações do parlamentar">
          {votacoes.map((v) => {
            const aberta = abertas.has(v.id);
            const info = extrairInfoProposicao(v.descricao, v.ementa);
            const temas = classificarTemas(v.ementa || v.descricao || '');
            const temaPrincipal = temas[0]?.tema || v.tema;
            const resumo = gerarResumo(v.ementa, v.descricao);

            return (
              <li key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Header clicável */}
                <button
                  type="button"
                  onClick={() => alternar(v.id)}
                  aria-expanded={aberta}
                  aria-controls={`votacao-${v.id}`}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {/* Data */}
                  <span className="w-20 sm:w-24 shrink-0 text-xs font-medium text-muted-foreground whitespace-nowrap mt-0.5">
                    {formatDate(v.data)}
                  </span>

                  {/* Conteúdo principal */}
                  <span className="flex-1 min-w-0">
                    {/* Tipo + número */}
                    {info.tipo && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent mb-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {info.texto || info.tipo} {info.numero && `nº ${info.numero}`}
                      </span>
                    )}

                    {/* Ementa / resumo */}
                    <span className="block text-sm font-medium text-foreground leading-snug">
                      {resumo}
                    </span>

                    {/* Tags de tema */}
                    {temaPrincipal && (
                      <span className="inline-flex items-center gap-1.5 mt-1.5">
                        {temas.slice(0, 2).map((t) => (
                          <span
                            key={t.tema}
                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${temaCor(t.tema)}`}
                          >
                            {t.tema}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>

                  {/* Voto + resultado */}
                  <span className="shrink-0 flex flex-col items-end gap-1">
                    {getVotoBadge(v.voto)}
                    {getResultadoBadge(v.resultado)}
                  </span>

                  {/* Chevron */}
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

                {/* Painel expandido — contexto educacional */}
                {aberta && (
                  <div id={`votacao-${v.id}`} className="border-t border-border bg-muted/20 px-4 py-5 animate-fade-in">
                    {/* Contexto do voto */}
                    <div className="rounded-lg bg-background border border-border p-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {nome ? <strong>{nome}</strong> : <strong>O parlamentar</strong>} votou{' '}
                            <strong className={v.voto === 'SIM' ? 'text-green-700 dark:text-green-400' : v.voto === 'NAO' ? 'text-red-700 dark:text-red-400' : ''}>
                              {v.voto || '—'}
                            </strong>{' '}
                            nesta votação.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* O que é este projeto */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        O que foi votado
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {v.ementa || v.descricao || 'Votação sem detalhes disponíveis na fonte oficial.'}
                      </p>
                    </div>

                    {/* Descrição da Câmara (se diferente da ementa) */}
                    {v.descricao && v.descricao !== v.ementa && v.descricao.length > 10 && (
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Identificação oficial
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{v.descricao}</p>
                      </div>
                    )}

                    {/* Metadados */}
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Data</dt>
                        <dd className="font-medium text-foreground mt-0.5">{formatDate(v.data)}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tema</dt>
                        <dd className="font-medium text-foreground mt-0.5 capitalize">{temaPrincipal || 'Sem classificação'}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resultado</dt>
                        <dd className="font-medium text-foreground mt-0.5">{v.resultado || '—'}</dd>
                      </div>
                      <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Alinhamento</dt>
                        <dd className={cn('font-medium mt-0.5', getAlinhamentoColor(v.alinhamento))}>
                          {v.alinhamento !== undefined ? `${v.alinhamento}%` : '—'}
                        </dd>
                      </div>
                    </dl>

                    {/* Fonte oficial */}
                    <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
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
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      <PaginacaoNumerica page={page} totalPages={totalPages} total={total} onChange={handlePageChange} />

      <FonteOficial casa={casa} />
    </div>
  );
}
