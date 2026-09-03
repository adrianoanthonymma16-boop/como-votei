'use client';

import { useState } from 'react';

const ITENS = [
  {
    rotulo: 'PL apresentado',
    peso: '+0,5',
    detalhe: 'Cada Projeto de Lei (PL) de autoria do parlamentar. Mostra iniciativa legislativa.',
  },
  {
    rotulo: 'PL aprovado',
    peso: '+1,0',
    detalhe: 'PL com situação aprovada/sancionada. Mostra capacidade de levar a ideia até o fim.',
  },
  {
    rotulo: 'Falta (ausência em votação)',
    peso: '−0,2',
    detalhe: 'Cada ausência registrada em votação nominal. Penaliza a pontuação.',
  },
  {
    rotulo: 'Voto SIM ou NÃO',
    peso: '+0,3',
    detalhe: 'Cada voto SIM ou NÃO em votação nominal. Mostra participação nas decisões.',
  },
  {
    rotulo: 'Discurso',
    peso: '+0,05',
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
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          Como calculamos a pontuacao
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
        <div className="border-t border-border bg-muted/20 px-4 py-4 animate-fade-in">
          <p className="text-sm font-medium text-foreground">Ranking de produtividade</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Para facilitar a comparação, somamos pontos por tipo de atividade. Quanto maior a pontuação, mais
            atuação registrada na base.
          </p>

          <ol className="mt-4 space-y-2">
            {ITENS.map((item) => (
              <li key={item.rotulo} className="flex gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <span className="shrink-0 font-mono text-sm font-bold text-accent">{item.peso}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{item.rotulo}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{item.detalhe}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Idealização do desenvolvedor:</strong> esta pontuação é uma forma didática criada para este
            projeto — não é ranking oficial do Congresso, nem avaliação de mérito político. Use como ponto de
            partida e confira sempre os dados na fonte oficial de cada votação, discurso e proposição.
          </div>
        </div>
      )}
    </div>
  );
}
