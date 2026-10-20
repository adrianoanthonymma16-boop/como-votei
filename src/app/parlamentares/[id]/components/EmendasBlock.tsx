'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, truncate } from '@/lib/utils';
import { escolherAnoPadrao } from '@/lib/ano-padrao';
import { FiltroAno } from '@/components/FiltroAno';
import { Skeleton } from '@/components/ui/Skeleton';
import { PaginacaoNumerica } from '@/components/ui/PaginacaoNumerica';
import { Button } from '@/components/ui/Button';
import { TabelaEmendas, type Emenda } from './TabelaEmendas';

/**
 * Bloco de emendas parlamentares na aba Gastos.
 *
 * Dinheiro de emenda não é gasto do gabinete — por isso vive em bloco próprio,
 * com total separado da cota. O que aparece em destaque é o valor **pago**
 * (dinheiro efetivamente desembolsado até hoje); empenhado vem ao lado.
 */

interface Grupo {
  chave: string;
  quantidade: number;
  pago: number;
  empenhado: number;
}

interface EmendaMeta {
  pagina: number;
  itensPorPagina: number;
  totalPaginas: number;
  totalItens: number;
  semDadosOficiais: boolean;
  anos: { ano: number; quantidade: number }[];
  funcoes: { nome: string | null; quantidade: number }[];
  total: { quantidade: number; pago: number; empenhado: number; liquidado: number };
  porFuncao: Grupo[];
  porLocalidade: Grupo[];
}

interface EmendasBlockProps {
  parlamentarId: string;
}

const ITENS_POR_PAGINA = 20;

function BarraRanking({ grupos, rotulo }: { grupos: Grupo[]; rotulo: string }) {
  if (grupos.length === 0) return null;
  const maior = Math.max(...grupos.map((g) => g.pago));
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{rotulo}</h3>
      <ul className="space-y-2">
        {grupos.slice(0, 6).map((g) => (
          <li key={g.chave}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={g.chave}>
                {g.chave}
              </span>
              <span className="shrink-0 tabular-nums">{formatCurrency(g.pago)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted" aria-hidden="true">
              <div
                className="h-1.5 rounded-full bg-accent"
                style={{ width: `${maior > 0 ? Math.max(2, (g.pago / maior) * 100) : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmendasBlock({ parlamentarId }: EmendasBlockProps) {
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [meta, setMeta] = useState<EmendaMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [filtroAno, setFiltroAno] = useState<number | undefined>(undefined);
  const [filtroFuncao, setFiltroFuncao] = useState<string | undefined>(undefined);

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
        if (filtroFuncao) params.set('funcao', filtroFuncao);

        const res = await fetch(`/api/parlamentares/${parlamentarId}/emendas?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Não foi possível carregar as emendas');

        const json = await res.json();
        if (!ativo) return;

        setEmendas(Array.isArray(json.data) ? json.data : []);
        setMeta(json.meta ?? null);
        if (json.meta?.pagina && json.meta.pagina !== page) setPage(json.meta.pagina);
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
  }, [parlamentarId, page, filtroAno, filtroFuncao, reloadKey]);

  // Primeira carga: pré-seleciona o ano padrão assim que os anos chegam da API.
  useEffect(() => {
    if (filtroAno !== undefined || !meta) return;
    const anos = meta.anos.map((a) => a.ano);
    if (anos.length === 0) return;
    setFiltroAno(escolherAnoPadrao(anos));
  }, [meta, filtroAno]);

  const limparFiltros = () => {
    setFiltroFuncao(undefined);
    setPage(1);
  };

  const semDados = !isLoading && !error && meta?.semDadosOficiais;

  return (
    <section className="space-y-6 border-t pt-6">
      <div>
        <h2 className="font-semibold mb-1">Emendas parlamentares</h2>
        <p className="text-xs text-muted-foreground">
          Recursos que o parlamentar destinou ao orçamento via emendas · Portal da Transparência.
          Valores independentes da cota acima.
        </p>
      </div>

      {error ? (
        <div className="p-6 rounded-md border border-destructive bg-destructive/10 text-destructive">
          <p className="font-medium mb-2">Erro ao carregar emendas</p>
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
      ) : isLoading && emendas.length === 0 && !meta ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : semDados ? (
        <div className="p-6 text-center text-muted-foreground">
          <p>Sem dados oficiais de emendas para este parlamentar no período.</p>
          <p className="mt-1 text-xs">
            A fonte pública não registra emendas individuais para ele nos últimos anos.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="mb-3">
                <FiltroAno
                  ano={filtroAno === undefined ? '' : String(filtroAno)}
                  anos={(meta?.anos ?? []).map((a) => a.ano)}
                  onChange={(value: string) => {
                    setFiltroAno(value === '' ? undefined : Number(value));
                    setPage(1);
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <span className="block text-muted-foreground">Pago</span>
                  <span className="text-lg font-bold tabular-nums">
                    {formatCurrency(meta?.total.pago ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground">Empenhado</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(meta?.total.empenhado ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="block text-muted-foreground">Emendas</span>
                  <span className="font-semibold tabular-nums">
                    {(meta?.total.quantidade ?? 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Pago = desembolsado até hoje. Empenhado = reservado, pode não ter sido pago.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 font-medium">Função</span>
                  <select
                    value={filtroFuncao ?? ''}
                    onChange={(e) => {
                      setFiltroFuncao(e.target.value === '' ? undefined : e.target.value);
                      setPage(1);
                    }}
                    aria-label="Filtrar emendas por função"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Todas as funções</option>
                    {(meta?.funcoes ?? [])
                      .filter((f) => f.nome)
                      .map((f) => (
                        <option key={f.nome} value={f.nome ?? ''}>
                          {truncate(f.nome ?? '', 50)} ({f.quantidade.toLocaleString('pt-BR')})
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {(meta?.funcoes ?? []).length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <BarraRanking grupos={meta?.porFuncao ?? []} rotulo="Por função" />
                  <BarraRanking grupos={meta?.porLocalidade ?? []} rotulo="Por localidade" />
                </div>
              )}
            </div>
          </div>

          {meta && meta.totalItens === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <p>Nenhuma emenda com os filtros atuais.</p>
              {filtroFuncao && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="mt-3">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div aria-busy={isLoading}>
              <TabelaEmendas emendas={emendas} isLoading={isLoading} />

              <div className="mt-4">
                <PaginacaoNumerica
                  page={meta?.pagina ?? page}
                  totalPages={meta?.totalPaginas ?? 1}
                  onChange={(p: number) => setPage(p)}
                  total={meta?.totalItens ?? 0}
                  label="Emendas"
                />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
