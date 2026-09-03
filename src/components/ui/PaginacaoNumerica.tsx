'use client';

import { cn } from '@/lib/utils';

interface PaginacaoNumericaProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total?: number;
  label?: string;
}

/**
 * Paginação numérica (anterior/próxima + números).
 * Usa windowing: mostra no máximo ~7 números ao redor da página atual.
 */
export function PaginacaoNumerica({ page, totalPages, onChange, total, label = 'Resultados' }: PaginacaoNumericaProps) {
  if (totalPages <= 1) return null;

  const paginas = windowedPages(page, totalPages);

  const goTo = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onChange(p);
  };

  const baseBtn =
    'inline-flex items-center justify-center min-w-9 h-9 px-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav aria-label="Paginação de resultados" className="flex flex-col items-center gap-3 py-6">
      {typeof total === 'number' && (
        <p className="text-sm text-muted-foreground">
          {label}: <span className="font-semibold text-foreground">{total.toLocaleString('pt-BR')}</span> · Página{' '}
          <span className="font-semibold text-foreground">{page}</span> de{' '}
          <span className="font-semibold text-foreground">{totalPages}</span>
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className={cn(baseBtn, 'border border-border bg-card text-foreground hover:bg-muted disabled:hover:bg-card')}
          aria-label="Página anterior"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {paginas.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p as number)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                baseBtn,
                p === page
                  ? 'bg-accent text-accent-foreground shadow-sm hover:bg-accent/90'
                  : 'border border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className={cn(baseBtn, 'border border-border bg-card text-foreground hover:bg-muted disabled:hover:bg-card')}
          aria-label="Próxima página"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

function windowedPages(page: number, totalPages: number): Array<number | '…'> {
  const total = Math.max(1, totalPages);
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const inicio = Math.max(1, page - 2);
  const fim = Math.min(total, page + 2);

  const paginas: Array<number | '…'> = [];
  if (inicio > 1) {
    paginas.push(1);
    if (inicio > 2) paginas.push('…');
  }
  for (let p = inicio; p <= fim; p++) paginas.push(p);
  if (fim < total) {
    if (fim < total - 1) paginas.push('…');
    paginas.push(total);
  }
  return paginas;
}
