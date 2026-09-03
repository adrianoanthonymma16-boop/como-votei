interface LogoProps {
  className?: string;
  withText?: boolean;
}

/**
 * Marca "Como Votei": um cartão de votação estilizado com um visto.
 * Vetorial (SVG), sem emojis, escala em qualquer tamanho.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="cv-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b4b7a" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#cv-grad)" />
      <rect x="2" y="2" width="44" height="44" rx="13" fill="none" stroke="currentColor" strokeOpacity="0.15" />
      <path
        d="M13.5 24.5l7 7 14-15.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 38.5h24" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, withText = true }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark className="w-8 h-8 shrink-0" />
      {withText && (
        <span className="font-bold leading-none tracking-tight text-lg">
          <span className="text-foreground">Como</span>{' '}
          <span className="text-accent">Votei</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
