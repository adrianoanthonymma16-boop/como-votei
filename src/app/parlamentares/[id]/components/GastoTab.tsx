'use client';

import { useEffect, useState } from 'react';
import { cn, formatDate, formatCurrency, truncate, useDebounce } from '@/lib/utils';
import { ANOS_JANELA } from '@/lib/despesas';
import { escolherAnoPadrao } from '@/lib/ano-padrao';
import { FiltroAno } from '@/components/FiltroAno';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Button } from '@/components/ui/Button';

interface Despesa {
  idExterno: string;
  data: string | null;
  categoria: string;
  fornecedor: string;
  valor: string;
  urlDocumento: string | null;
  nomeParlamentarRaw: string;
}

interface DespesaMeta {
  pagina: number;
  itensPorPagina: number;
  totalPaginas: number;
  totalItens: number;
  totalGasto: number;
  mesesComDespesa: number;
  mediaMensal: number;
  categorias: { nome: string; total: number }[];
}

interface GastoTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

const ITENS_POR_PAGINA = 20;

export function GastoTab({ parlamentarId, casa }: GastoTabProps) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [meta, setMeta] = useState<DespesaMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [filtroAno, setFiltroAno] = useState<number | undefined>(() => escolherAnoPadrao(Array.from(ANOS_JANELA)));
  const [filtroCategoria, setFiltroCategoria] = useState<string | undefined>(undefined);
  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, 350);

  const temFiltro = filtroAno !== undefined || filtroCategoria !== undefined || busca.trim() !== '';

  useEffect(() => {
    const controller = new AbortController();
    let ativo = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          pagina: String(page),
          itensPorPagina: String(ITENS_POR_PAGINA),
        });
        if (filtroAno !== undefined) params.set('ano', String(filtroAno));
        if (filtroCategoria) params.set('categoria', filtroCategoria);
        if (buscaDebounced.trim()) params.set('busca', buscaDebounced.trim());

        const res = await fetch(
          `/api/parlamentares/${parlamentarId}/despesas?${params.toString()}`,
          { cache: 'no-store', signal: controller.signal }
        );

        if (!res.ok) throw new Error('Não foi possível carregar as despesas');

        const json = await res.json();
        if (!ativo) return;

        setDespesas(Array.isArray(json.data) ? json.data : []);
        setMeta(json.meta ?? null);

        // A API clampa páginas órfãs (ex.: filtro reduziu o total) — sincroniza a UI.
        if (json.meta?.pagina && json.meta.pagina !== page) {
          setPage(json.meta.pagina);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        if (!ativo) return;
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (ativo) setIsLoading(false);
      }
    })();

    return () => {
      ativo = false;
      controller.abort();
    };
  }, [parlamentarId, page, filtroAno, filtroCategoria, buscaDebounced, reloadKey]);

  const limparFiltros = () => {
    setFiltroAno(undefined);
    setFiltroCategoria(undefined);
    setBusca('');
    setPage(1);
  };

  const fonteLabel = casa === 'CAMARA' ? 'Cota Parlamentar (CEAP)' : 'Custeio de Atividade Parlamentar (CEAPS)';
  const totalItens = meta?.totalItens ?? 0;
  const semResultados = !isLoading && !error && despesas.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="font-semibold mb-1">Resumo Financeiro</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {fonteLabel}
            {temFiltro ? ' · período filtrado' : ` · últimos ${ANOS_JANELA.length} anos`}
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="block text-muted-foreground">Total gasto</span>
              <span className="font-bold">{formatCurrency(meta?.totalGasto ?? 0)}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Despesas</span>
              <span className="font-bold">{totalItens.toLocaleString('pt-BR')}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Média/mês</span>
              <span className="font-bold">{formatCurrency(meta?.mediaMensal ?? 0)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Filtros</h3>
          <FiltroAno
            ano={filtroAno === undefined ? '' : String(filtroAno)}
            anos={Array.from(ANOS_JANELA)}
            onChange={(value: string) => {
              setFiltroAno(value === '' ? undefined : Number(value));
              setPage(1);
            }}
          />
          <select
            value={filtroCategoria ?? ''}
            onChange={(e) => {
              setFiltroCategoria(e.target.value === '' ? undefined : e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por categoria"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">Todas as categorias</option>
            {(meta?.categorias ?? []).map((c) => (
              <option key={c.nome} value={c.nome}>
                {truncate(c.nome || 'Sem categoria', 60)} ({c.total.toLocaleString('pt-BR')})
              </option>
            ))}
          </select>
          <div className="mt-3">
            <label htmlFor="busca-despesas" className="text-sm text-muted-foreground">
              Buscar despesas
            </label>
            <input
              id="busca-despesas"
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(1);
              }}
              placeholder="Fornecedor, categoria..."
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="mt-3">
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-6 rounded-md border border-destructive bg-destructive/10 text-destructive">
          <p className="font-medium mb-2">Erro ao carregar despesas</p>
          <p className="text-sm">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
            className="mt-3"
          >
            Tentar novamente
          </Button>
        </div>
      ) : isLoading && despesas.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-6 w-full rounded-md" />
        </div>
      ) : semResultados ? (
        <div className="p-6 text-center text-muted-foreground">
          <p>Nenhuma despesa encontrada{temFiltro ? ' com os filtros atuais' : ' neste parlamentar'}.</p>
          {temFiltro && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="mt-3">
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <div aria-busy={isLoading}>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full">
              <thead>
                <tr>
                  <th scope="col" className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Data
                  </th>
                  <th scope="col" className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Categoria
                  </th>
                  <th scope="col" className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Fornecedor
                  </th>
                  <th scope="col" className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Valor
                  </th>
                  <th scope="col" className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Comprovante
                  </th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => {
                  const negativo = Number(d.valor) < 0;
                  return (
                    <tr key={d.idExterno} className="border-b last:border-none hover:bg-accent/5">
                      <td className="p-3 align-middle text-sm whitespace-nowrap">
                        {d.data ? formatDate(d.data) : '—'}
                      </td>
                      <td className="p-3 align-middle text-sm">
                        {d.categoria || '—'}
                      </td>
                      <td className="p-3 align-middle text-sm">
                        {d.fornecedor || '—'}
                      </td>
                      <td
                        className={`p-3 align-middle text-right text-sm whitespace-nowrap tabular-nums ${
                          negativo ? 'text-destructive' : ''
                        }`}
                      >
                        {formatCurrency(Number(d.valor))}
                      </td>
                      <td className="p-3 align-middle text-right">
                        {d.urlDocumento ? (
                          <a
                            href={d.urlDocumento}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver comprovante de ${d.categoria || 'despesa'} na fonte oficial (abre em nova aba)`}
                            title="Ver comprovante na fonte oficial"
                            className={cn(
                              'inline-flex items-center justify-center rounded-lg p-2 font-medium text-foreground transition-colors',
                              'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
                            )}
                          >
                            <svg
                              className="h-4 w-4"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <path d="M15 3h6v6" />
                              <path d="M10 14 21 3" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-muted-foreground" aria-label="Sem comprovante disponível">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <PaginacaoNumerica
              page={meta?.pagina ?? page}
              totalPages={meta?.totalPaginas ?? 1}
              onChange={(p: number) => setPage(p)}
              total={totalItens}
              label="Despesas"
            />
          </div>
        </div>
      )}
    </div>
  );
}
