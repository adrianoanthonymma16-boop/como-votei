'use client';

import { cn, formatCurrency, truncate } from '@/lib/utils';

export interface Emenda {
  codigoEmenda: string;
  ano: number;
  tipo: string;
  numeroEmenda: string | null;
  funcao: string | null;
  subfuncao: string | null;
  localidadeRaw: string | null;
  uf: string | null;
  municipio: string | null;
  localidadeTipo: string | null;
  valorPago: number;
  valorEmpenhado: number;
  valorLiquidado: number;
  urlFonte: string;
}

interface TabelaEmendasProps {
  emendas: Emenda[];
  isLoading: boolean;
}

function rotuloLocalidade(e: Emenda): string {
  if (e.localidadeRaw) return e.localidadeRaw;
  if (e.uf) return e.uf;
  return '—';
}

/**
 * Tabela de emendas parlamentares.
 *
 * Em telas pequenas as colunas Função, Localidade, Pago, Empenhado e Fonte são
 * embutidas na célula da emenda: a tabela fica com uma coluna só e deixa de
 * exigir rolagem horizontal.
 */
export function TabelaEmendas({ emendas, isLoading }: TabelaEmendasProps) {
  return (
    <div aria-busy={isLoading}>
      <div
        className="overflow-x-auto rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        role="region"
        aria-label="Tabela de emendas"
        tabIndex={0}
      >
        <table className="w-full table-fixed">
          <thead>
            <tr>
              <th scope="col" className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Emenda
              </th>
              <th scope="col" className="hidden p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Função
              </th>
              <th scope="col" className="hidden w-32 p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Localidade
              </th>
              <th scope="col" className="hidden w-28 p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Pago
              </th>
              <th scope="col" className="hidden p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                Empenhado
              </th>
              <th scope="col" className="hidden w-14 p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                <span className="sr-only">Fonte</span>
                <span aria-hidden="true">Doc.</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {emendas.map((e) => (
              <tr key={e.codigoEmenda} className="border-b last:border-none hover:bg-accent/5">
                <td className="p-3 align-middle text-sm">
                  <span className="break-words font-medium tabular-nums">
                    {e.numeroEmenda ? `nº ${e.numeroEmenda}` : e.codigoEmenda}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
                    {e.ano} · {truncate(e.tipo, 44)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                    {rotuloLocalidade(e)}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2 sm:hidden">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(e.valorPago)}
                    </span>
                    <a
                      href={e.urlFonte}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Ver emenda ${e.numeroEmenda ?? e.codigoEmenda} no Portal da Transparência (abre em nova aba)`}
                      className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Ver no Portal
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <path d="M15 3h6v6" />
                        <path d="M10 14 21 3" />
                      </svg>
                    </a>
                  </span>
                </td>
                <td className="hidden p-3 align-middle text-sm sm:table-cell">{e.funcao || '—'}</td>
                <td className="hidden p-3 align-middle text-sm sm:table-cell">
                  {rotuloLocalidade(e)}
                  {e.municipio && e.uf && (
                    <span className="block text-xs text-muted-foreground">{e.uf}</span>
                  )}
                </td>
                <td className="hidden p-3 align-middle text-right text-sm whitespace-nowrap tabular-nums font-semibold sm:table-cell">
                  {formatCurrency(e.valorPago)}
                </td>
                <td className="hidden p-3 align-middle text-right text-sm whitespace-nowrap tabular-nums text-muted-foreground sm:table-cell">
                  {formatCurrency(e.valorEmpenhado)}
                </td>
                <td className="hidden p-3 align-middle text-right sm:table-cell">
                  <a
                    href={e.urlFonte}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Ver emenda ${e.numeroEmenda ?? e.codigoEmenda} no Portal da Transparência (abre em nova aba)`}
                    title="Ver no Portal da Transparência"
                    className={cn(
                      'inline-flex items-center justify-center rounded-lg p-2 font-medium text-foreground transition-colors',
                      'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
                    )}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
