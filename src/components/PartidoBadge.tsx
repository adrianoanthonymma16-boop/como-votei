import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface PartidoBadgeProps {
  sigla: string;
  /** Cor oficial do partido — usada apenas no marcador, nunca como cor do texto. */
  cor?: string | null;
  nome?: string;
  className?: string;
}

/**
 * Badge de partido com contraste garantido: o texto usa a cor do design system
 * e a cor do partido aparece como marcador ao lado da sigla. Cores de partido
 * vindas do banco (ex.: amarelo do NOVO, azul do PSDB) não passam no contraste
 * quando aplicadas como foreground.
 */
export function PartidoBadge({ sigla, cor, nome, className }: PartidoBadgeProps) {
  return (
    <Badge variant="outline" className={cn('shrink-0 gap-1.5', className)} title={nome ?? sigla}>
      {cor ? (
        <span
          className="size-2 rounded-full ring-1 ring-black/10 dark:ring-white/20"
          style={{ backgroundColor: cor }}
          aria-hidden="true"
        />
      ) : null}
      {sigla}
    </Badge>
  );
}
