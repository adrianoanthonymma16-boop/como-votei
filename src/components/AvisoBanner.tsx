'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

function UrnaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M4 9h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M2.5 9l1.6-4.5h15.8L21.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M9.5 15.5l2.2 2.2 3.8-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M18 6L6 18M6 6l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Estado = 'aberto' | 'fechando' | 'fechado';

const CHAVE_DISPENSA = 'comovotei:manifesto-dispensado';

/**
 * Manifesto pelo voto consciente com saída coreografada: o conteúdo se recolhe
 * em cascata, a linha âmbar "fecha o zíper" e o bloco colapsa — restando uma
 * tira fina para reler. Entrada usa o fade padrão; a saída é o momento autoral.
 */
export function AvisoBanner() {
  const [estado, setEstado] = useState<Estado>('aberto');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lê a dispensa só no cliente, depois da hidratação.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CHAVE_DISPENSA) === '1') setEstado('fechado');
    } catch {
      /* localStorage indisponível (modo privado) — mantém o banner visível */
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const fechar = () => {
    if (estado !== 'aberto') return;
    setEstado('fechando');
    // setTimeout (não transitionend): funciona também com reduced-motion,
    // onde as transições são zeradas pelo CSS global.
    timer.current = setTimeout(() => setEstado('fechado'), 480);
    try {
      window.localStorage.setItem(CHAVE_DISPENSA, '1');
    } catch {
      /* ignora falha de persistência */
    }
  };

  const reabrir = () => {
    if (timer.current) clearTimeout(timer.current);
    setEstado('aberto');
    try {
      window.localStorage.removeItem(CHAVE_DISPENSA);
    } catch {
      /* ignora falha de persistência */
    }
  };

  if (estado === 'fechado') {
    return (
      <button
        type="button"
        onClick={reabrir}
        aria-label="Reler manifesto pelo voto consciente"
        className="flex w-full items-center justify-center gap-2 border-y border-border bg-muted px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring animate-fade-in dark:border-transparent dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-amber-200 dark:focus-visible:ring-amber-300"
      >
        <span className="inline-block size-1.5 rounded-full bg-amber-500 dark:bg-amber-300" aria-hidden="true" />
        Manifesto: voto não é torcida — toque para reler
      </button>
    );
  }

  const fechando = estado === 'fechando';
  // Cascata de saída: ícone sai primeiro, CTAs por último.
  const cascata = (atraso: number) =>
    `transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      fechando ? `opacity-0 -translate-y-2 [transition-delay:${atraso}ms]` : '[transition-delay:0ms]'
    }`;

  return (
    <div
      className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        fechando ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <section
          aria-label="Manifesto pelo voto consciente"
          aria-hidden={fechando}
          className={`relative overflow-hidden border-y border-border bg-background text-foreground transition-opacity duration-300 dark:border-transparent dark:bg-slate-950 dark:text-white ${
            fechando ? 'opacity-90' : 'animate-fade-in'
          }`}
        >
          {/* Fundo: gradiente + palavra fantasma */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-background to-amber-100/70 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/60" aria-hidden="true" />
          <div
            className={`pointer-events-none absolute -bottom-7 left-0 select-none whitespace-nowrap text-[22vw] sm:text-[11rem] font-black leading-none tracking-tighter text-slate-900/[0.05] transition-[opacity,transform] duration-500 dark:text-white/[0.04] ${
              fechando ? 'opacity-0 translate-x-8' : ''
            }`}
            aria-hidden="true"
          >
            PODER
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="flex items-start gap-4 sm:gap-6">
              {/* Ícone */}
              <div className={`hidden sm:flex size-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-400/20 text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-300 dark:shadow-[0_0_30px_rgba(251,191,36,0.15)] ${cascata(0)}`}>
                <UrnaIcon className="size-7" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className={`flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300/90 ${cascata(60)}`}>
                  <span className="inline-block h-px w-6 bg-amber-600/60 dark:bg-amber-300/60" aria-hidden="true" />
                  Todo o poder emana do povo
                </p>
                <h2 className={`mt-2 text-2xl sm:text-4xl font-black tracking-tight leading-tight text-balance ${cascata(120)}`}>
                  Voto não é torcida. <span className="text-amber-700 dark:text-amber-300">É poder.</span>
                </h2>
                <p className={`mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-foreground/80 dark:text-slate-300 ${cascata(180)}`}>
                  Estude como cada candidato vota, o que propõe e o que defende. Quem vota no escuro
                  entrega o país no escuro — vote com responsabilidade.
                </p>
                <div className={`mt-5 flex flex-wrap items-center gap-3 ${cascata(240)}`}>
                  <Link
                    href="/parlamentares"
                    tabIndex={fechando ? -1 : undefined}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_4px_20px_rgba(251,191,36,0.35)] transition-[background-color,box-shadow] hover:bg-amber-200 hover:shadow-[0_4px_28px_rgba(251,191,36,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
                  >
                    Começar a estudar
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/sobre#metodologia"
                    tabIndex={fechando ? -1 : undefined}
                    className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/20 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus-visible:ring-white/60"
                  >
                    Como apuramos os dados
                  </Link>
                </div>
              </div>

              {/* Fechar */}
              <button
                type="button"
                onClick={fechar}
                disabled={fechando}
                aria-label="Fechar manifesto"
                className={`shrink-0 flex size-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-[background-color,color,transform] hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/15 dark:hover:text-white dark:focus-visible:ring-white/60 ${cascata(0)}`}
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Linha de base: "fecha o zíper" na saída */}
          <div
            className={`relative h-1 origin-right bg-gradient-to-r from-amber-500 via-amber-400/60 to-transparent dark:from-amber-300 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              fechando ? 'scale-x-0' : 'scale-x-100'
            }`}
            aria-hidden="true"
          />
        </section>
      </div>
    </div>
  );
}
