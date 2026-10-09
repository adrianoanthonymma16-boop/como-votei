'use client';

interface FiltroAnoProps {
  ano: string;
  anos: number[];
  onChange: (ano: string) => void;
}

/** Select "Ano" padronizado das abas do perfil (Todos + anos com dados). */
export function FiltroAno({ ano, anos, onChange }: FiltroAnoProps) {
  return (
    <label className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
      <span className="shrink-0 font-medium">Ano</span>
      <select
        value={ano}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filtrar por ano"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">Todos</option>
        {anos.map((a) => (
          <option key={a} value={String(a)}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}
