'use client';

import { useState } from 'react';

const ITENS = [
  {
    rotulo: 'PL apresentado',
    peso: '+0,05',
    cor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    icone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    detalhe: 'Cada Projeto de Lei (PL) de autoria própria do parlamentar (autorPrincipal). Mostra iniciativa legislativa.',
  },
  {
    rotulo: 'PL aprovado (autoral)',
    peso: '+1,0',
    cor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    detalhe: 'PL de autoria própria com situação aprovada/sancionada. Mostra capacidade de levar a ideia até o fim.',
  },
  {
    rotulo: 'Falta (ausência)',
    peso: '−0,02',
    cor: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    icone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
      </svg>
    ),
    detalhe: 'Cada ausência registrada em votação nominal. Penaliza a pontuação.',
  },
  {
    rotulo: 'Voto SIM ou NÃO',
    peso: '+0,03',
    cor: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
    icone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    detalhe: 'Cada voto SIM ou NÃO em votação nominal. Mostra participação nas decisões.',
  },
  {
    rotulo: 'Discurso',
    peso: '+0,005',
    cor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icone: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    detalhe: 'Cada pronunciamento registrado em plenário. Mostra atividade de debate.',
  },
];

export function MetricaProdutividadeInfo() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </span>
          Como calculamos a pontuação
        </span>
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform duration-200 ${aberto ? 'rotate-180 border-accent text-accent' : ''}`}
          aria-hidden="true"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {aberto && (
        <div className="border-t border-border bg-muted/20 px-4 py-5 animate-fade-in">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-foreground">Ranking de produtividade</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Para facilitar a comparação, somamos pontos por tipo de atividade. Quanto maior a pontuação, mais
              atuação registrada na base. <strong className="text-foreground font-medium">PL aprovado</strong> tem mais peso
              porque representa resultado concreto.
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {ITENS.map((item) => (
              <div
                key={item.rotulo}
                className="flex items-start gap-3 rounded-lg border border-border bg-background px-3.5 py-3 transition-colors hover:border-accent/30 hover:bg-muted/20"
              >
                <span className={`mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-md border ${item.cor}`}>
                  {item.icone}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{item.rotulo}</span>
                    <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-xs font-mono font-bold text-accent">
                      {item.peso}
                    </span>
                  </div>
                  <span className="block text-xs leading-relaxed text-muted-foreground mt-0.5">{item.detalhe}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <strong>Idealização do desenvolvedor:</strong> esta pontuação é uma forma didática criada para este
                projeto — não é ranking oficial do Congresso, nem avaliação de mérito político. Use como ponto de
                partida e confira sempre os dados na fonte oficial de cada votação, discurso e proposição.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
