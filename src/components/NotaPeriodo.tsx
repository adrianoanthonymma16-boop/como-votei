import { janelaAnos } from '@/lib/ano-padrao';

/**
 * Legenda explicativa da janela de retenção de dados (últimos 3 anos).
 *
 * A base é podada periodicamente (ver src/lib/gc.ts): registros mais antigos
 * que a janela são removidos. Sem esta legenda, um parlamentar sem dados na
 * janela pareceria "vazio" sem explicação — o aviso dá ciência ao consumidor.
 */
export function NotaPeriodo() {
  const anos = janelaAnos(3);
  const maisRecente = anos[0];
  const maisAntigo = anos[anos.length - 1];

  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs sm:text-sm text-muted-foreground"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-accent"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z"
        />
      </svg>
      <span>
        <strong className="font-medium text-foreground">Janela de dados:</strong> exibimos apenas os
        últimos 3 anos ({maisAntigo}–{maisRecente}). Registros mais antigos são removidos da base e
        deixam de aparecer aqui.
      </span>
    </div>
  );
}
