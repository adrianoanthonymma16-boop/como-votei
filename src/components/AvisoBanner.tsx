'use client';

import { useState } from 'react';

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
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
        strokeWidth="2"
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
    <div className="relative bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
      {/* Padrão decorativo de fundo */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute bottom-0 right-1/3 w-24 h-24 rounded-full bg-sky-300/20 blur-xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          {/* Ícone */}
          <div className="shrink-0 mt-0.5 sm:mt-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 shadow-sm">
              <ShieldIcon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-white">
              Diga não à polarização
            </h3>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed mt-0.5">
              Estude o histórico de cada candidato. Conheça como vota, o que propõe e o que fala antes de decidir.
              Dados oficiais ajudam você a votar com consciência.
            </p>
          </div>

          {/* Botão fechar */}
          <button
            type="button"
            onClick={() => setVisivel(false)}
            aria-label="Fechar aviso"
            className="shrink-0 mt-0.5 sm:mt-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <CloseIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
