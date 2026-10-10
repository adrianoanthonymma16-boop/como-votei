'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDate, formatCurrency, formatNumber } from '@/lib/utils';
import { ANOS_JANELA } from '@/lib/despesas';
import { FiltroAno } from '@/components/FiltroAno';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Button } from '@/components/ui/Button';

interface Despesa {
  idExterno: string;
  data: string | null;
  categoria: string;
  fornecedor: string;
  valor: string;
  urlDocumento: string | undefined;
  nomeParlamentarRaw: string;
}

interface GastoTabProps {
  parlamentarId: string;
  casa: 'CAMARA' | 'SENADO';
}

export function GastoTab({ parlamentarId, casa }: GastoTabProps) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | number>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [busca, setBusca] = useState<string>('');

  const loadData = useCallback(async (targetPage: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        pagina: String(targetPage),
        itensPorPagina: '20',
      });
      if (filtroPeriodo !== 'todos') params.set('ano', String(filtroPeriodo));
      if (filtroCategoria !== 'todos') params.set('categoria', filtroCategoria);
      if (busca) params.set('busca', busca);

      const res = await fetch(
        `/api/parlamentares/${parlamentarId}/despesas?${params.toString()}`,
        { cache: 'no-store' }
      );

      if (!res.ok) throw new Error('Erro ao carregar despesas');

      const data = await res.json();
      setDespesas(data.data || []);
      setTotal(data.meta?.totalItens ?? data.data.length);
      setTotalPages(data.meta?.totalPaginas ?? 1);
      setPage(data.meta?.pagina ?? targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, [parlamentarId, filtroPeriodo, filtroCategoria, busca]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleMudancaFiltro = useCallback((nome: string, valor: string | number | null) => {
    const newPage = 1;
    if (nome === 'periodo') {
      setFiltroPeriodo(valor === 'todos' ? 'todos' : Number(valor));
    } else if (nome === 'categoria') {
      setFiltroCategoria(valor === 'todos' ? 'todos' : String(valor));
    } else if (nome === 'busca') {
      setBusca(String(valor) || '');
    }
    loadData(newPage);
  }, [loadData]);

  const totalGasto = despesas.reduce(
    (sum, d) => sum + (Number(d.valor) || 0),
    0
  );
  const quantidade = despesas.length;
  const mediaMensal = quantidade > 0 ? totalGasto / 12 : 0;

  const handleVerComprovante = (url: string | undefined) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-6 w rounded-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-md border border-destructive bg-destructive/10 text-destructive">
        <p className="font-medium mb-2">Erro ao carregar despesas</p>
        <p className="text-sm">{error}</p>
        <Button
          onClick={() => {
            setError(null);
            loadData(1);
          }}
          className="mt-3"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (quantidade === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Não há despesas oficiais para este parlamentar neste período</p>
        <p className="mt-2">
          {filtroPeriodo !== 'todos' && (
            <p>Tente alterar o período ou remover os filtros.</p>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-3">Resumo Financeiro</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Total gasto</span>
              <span className="font-bold">{formatCurrency(totalGasto)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantidade</span>
              <span className="font-bold">{quantidade}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Média/mês</span>
              <span className="font-bold">{formatCurrency(mediaMensal / 12)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Filtros</h3>
<FiltroAno
          ano={filtroPeriodo === 'todos' ? '' : String(filtroPeriodo)}
          anos={Array.from(ANOS_JANELA)}
          onChange={(value: string) => handleMudancaFiltro('periodo', value)}
        />
          <select
            value={filtroCategoria}
            onChange={(e) => handleMudancaFiltro('categoria', e.target.value)}
            aria-label="Filtrar por categoria"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="todos">Todas</option>
            <option value="salario">Salário</option>
            <option value="material de expediente">Material de expediente</option>
            <option value="viagem">Viagem</option>
            <option value="outros">Outros</option>
          </select>
          <div className="mt-3">
            <label htmlFor="busca-despesas" className="text-sm text-muted-foreground">
              Buscar despesas
            </label>
            <input
              id="busca-despesas"
              type="text"
              value={busca}
              onChange={(e) => handleMudancaFiltro('busca', e.target.value)}
              placeholder="Palavra-chave... "
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        </div>
      </div>

      <div>
        <table className="w-full rounded-md border">
          <thead>
            <tr role="row">
              <th
                className="text-left p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                scope="col"
              >
                Data
              </th>
              <th
                className="text-left p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                scope="col"
              >
                Categoria
              </th>
              <th
                className="text-left p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                scope="col"
              >
                Fornecedor
              </th>
              <th
                className="text-right p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider"
                scope="col"
              >
                Valor
              </th>
              <th className="text-right p-3 font-medium text-xs text-muted-foreground uppercase tracking-wider" scope="col">
                Ação
              </th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d, i) => (
              <tr
                key={d.idExterno}
                role="row"
                className="border-b last:border-none hover:bg-accent/5"
              >
                <td
                  role="gridcell"
                  className="p-3 align-middle text-sm"
                >
                  {d.data ? formatDate(new Date(d.data)) : '—'}
                </td>
                <td role="gridcell" className="p-3 align-middle text-sm">
                  {d.categoria}
                </td>
                <td role="gridcell" className="p-3 align-middle text-sm">
                  {d.fornecedor}
                </td>
                <td role="gridcell" className="p-3 align-middle text-right text-sm">
                  {formatCurrency(Number(d.valor))}
                </td>
                <td role="gridcell" className="p-3 align-middle text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleVerComprovante(d.urlDocumento)}
                    aria-label={`Ver comprovante de ${d.categoria}`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2 4lM2 4l10 20 10-20zM2 4l15.5 7.3L20 12l-5.3 8.7L2 4z" />
                    </svg>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4">
<PaginacaoNumerica
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          total={total}
/>
        </div>
      </div>
    </div>
  );
}