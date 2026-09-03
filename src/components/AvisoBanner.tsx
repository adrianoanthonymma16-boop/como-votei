'use client';

import { useState } from 'react';
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

export function AvisoBanner() {
  const [visivel, setVisivel] = useState(true);

  if (!visivel) return null;

  return (
    <section
      aria-label="Manifesto pelo voto consciente"
      className="relative overflow-hidden bg-slate-950 text-white animate-fade-in"
    >
      {/* Fundo: gradiente + palavra fantasma */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-7 left-0 select-none whitespace-nowrap text-[22vw] sm:text-[11rem] font-black leading-none tracking-tighter text-white/[0.04]"
        aria-hidden="true"
      >
        PODER
      </div>
      <div
        className="pointer-events-none absolute -top-10 right-6 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Ícone */}
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
            <UrnaIcon className="h-7 w-7" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">
              <span className="inline-block h-px w-6 bg-amber-300/60" aria-hidden="true" />
              Todo o poder emana do povo
            </p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-black tracking-tight leading-tight text-balance">
              Voto não é torcida. <span className="text-amber-300">É poder.</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
              Pare de terceirizar a culpa: estude como cada candidato vota, o que propõe e o que
              defende. Quem vota no escuro, entrega o país no escuro — vote com responsabilidade.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/parlamentares"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-300 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_4px_20px_rgba(251,191,36,0.35)] transition-all hover:bg-amber-200 hover:shadow-[0_4px_28px_rgba(251,191,36,0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100"
              >
                Começar a estudar
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/sobre"
                className="inline-flex items-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                Como apuramos os dados
              </Link>
            </div>
          </div>

          {/* Fechar */}
          <button
            type="button"
            onClick={() => setVisivel(false)}
            aria-label="Fechar manifesto"
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-400 transition-all hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Linha de base em destaque */}
      <div className="relative h-1 bg-gradient-to-r from-amber-300 via-amber-400/60 to-transparent" aria-hidden="true" />
    </section>
  );
}
