'use client';

import { cn, formatDate, formatCurrency } from '@/lib/utils';

export interface Despesa {
  idExterno: string;
  data: string | null;
  categoria: string;
  fornecedor: string;
  valor: string;
  urlDocumento: string | null;
  nomeParlamentarRaw: string;
}

interface TabelaDespesasProps {
  despesas: Despesa[];
  isLoading: boolean;
}

/**
 * Tabela de despesas da cota parlamentar.
 *
 * Em telas pequenas as colunas Data, Categoria, Valor e Comprovante são
 * embutidas na célula do fornecedor: a tabela fica com uma coluna só e deixa de
 * exigir rolagem horizontal.
 */
export function TabelaDespesas({ despesas, isLoading }: TabelaDespesasProps) {
  return (
    <div aria-busy={isLoading}>
      <div
        className="overflow-x-auto rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="region"
        aria-label="Tabela de despesas"
        tabIndex={0}
      >
        <table className="w-full table-fixed">
          <thead>
            <tr>
              <th scope="col" className="hidden w-24 p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Data
              </th>
              <th scope="col" className="hidden w-40 p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Categoria
              </th>
              <th scope="col" className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fornecedor
              </th>
              <th scope="col" className="hidden w-28 p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Valor
              </th>
              <th scope="col" className="hidden w-14 p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                <span className="sr-only">Comprovante</span>
                <span aria-hidden="true">Doc.</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {despesas.map((d) => {
              const negativo = Number(d.valor) < 0;
              return (
                <tr key={d.idExterno} className="border-b last:border-none hover:bg-accent/5">
                  <td className="hidden p-3 align-middle text-sm whitespace-nowrap sm:table-cell">
                    {d.data ? formatDate(d.data) : '—'}
                  </td>
                  <td className="hidden p-3 align-middle text-sm sm:table-cell">
                    {d.categoria || '—'}
                  </td>
                  <td className="p-3 align-middle text-sm" title={d.fornecedor ?? undefined}>
                    <span className="block text-xs text-muted-foreground sm:hidden">
                      {d.data ? formatDate(d.data) : '—'}
                      {d.categoria ? ` · ${d.categoria}` : ''}
                    </span>
                    <span className="break-words">{d.fornecedor || '—'}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 sm:hidden">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          negativo && 'text-destructive'
                        )}
                      >
                        {formatCurrency(Number(d.valor))}
                      </span>
                      {d.urlDocumento ? (
                        <a
                          href={d.urlDocumento}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ver comprovante de ${d.categoria || 'despesa'} na fonte oficial (abre em nova aba)`}
                          className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Comprovante
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <path d="M15 3h6v6" />
                            <path d="M10 14 21 3" />
                          </svg>
                        </a>
                      ) : null}
                    </span>
                  </td>
                  <td
                    className={cn(
                      'hidden p-3 align-middle text-right text-sm whitespace-nowrap tabular-nums sm:table-cell',
                      negativo && 'text-destructive'
                    )}
                  >
                    {formatCurrency(Number(d.valor))}
                  </td>
                  <td className="hidden p-3 align-middle text-right sm:table-cell">
                    {d.urlDocumento ? (
                      <a
                        href={d.urlDocumento}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver comprovante de ${d.categoria || 'despesa'} na fonte oficial (abre em nova aba)`}
                        title="Ver comprovante na fonte oficial"
                        className="inline-flex size-10 items-center justify-center rounded-lg font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <svg
                          className="size-4"
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
    </div>
  );
}
