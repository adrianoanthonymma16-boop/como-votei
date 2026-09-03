'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FrequenciaAno {
  ano: number;
  totalSessoes: number;
  presencas: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
  taxaPresenca: number;
}

interface FrequenciaResponse {
  fonte: 'oficial';
  anos: number[];
  porAno: FrequenciaAno[];
}

function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

export function PresencaCard({ parlamentarId }: { parlamentarId: string }) {
  const [dados, setDados] = useState<FrequenciaResponse | null>(null);
  const [ano, setAno] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const response = await fetch(`/api/parlamentares/${parlamentarId}/frequencia`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data: FrequenciaResponse = await response.json();
        if (!ativo) return;
        setDados(data);
        setAno(data.anos[0] ?? null);
      } finally {
        if (ativo) setIsLoading(false);
      }
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, [parlamentarId]);

  const atual = dados?.porAno.find((r) => r.ano === ano) ?? null;

  return (
    <div className="stat-card text-center sm:text-left" aria-live="polite">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs sm:text-sm text-muted-foreground">Presença em votações</p>
        {dados && dados.anos.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="sr-only">Filtrar presença por ano</span>
            <select
              value={ano ?? ''}
              onChange={(e) => setAno(Number(e.target.value))}
              aria-label="Filtrar presença por ano"
              className="rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {dados.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      ) : !atual ? (
        <div>
          <p className="text-xl sm:text-2xl font-bold text-foreground/50">—</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Sem dados oficiais de presença. Os registros são sincronizados das fontes da Câmara e do Senado.
          </p>
          <Link
            href={`/parlamentares/${parlamentarId}/dashboard`}
            className="mt-2 inline-flex text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            Ver dashboard
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {atual.taxaPresenca.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </p>

          {/* Barra empilhada: presença / justificada / injustificada */}
          <div
            className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${atual.presencas} presenças, ${atual.faltasJustificadas} faltas justificadas e ${atual.faltasInjustificadas} faltas injustificadas em ${atual.totalSessoes} sessões de ${atual.ano}`}
          >
            <div className="bg-green-500 h-full" style={{ width: `${pct(atual.presencas, atual.totalSessoes)}%` }} />
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${pct(atual.faltasJustificadas, atual.totalSessoes)}%` }}
            />
            <div
              className="bg-red-500 h-full"
              style={{ width: `${pct(atual.faltasInjustificadas, atual.totalSessoes)}%` }}
            />
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              <dt className="sr-only">Presenças</dt>
              <dd>
                <strong className="font-semibold text-foreground">{atual.presencas}</strong> pres.
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
              <dt className="sr-only">Faltas justificadas</dt>
              <dd>
                <strong className="font-semibold text-foreground">{atual.faltasJustificadas}</strong> just.
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              <dt className="sr-only">Faltas injustificadas</dt>
              <dd>
                <strong className="font-semibold text-foreground">{atual.faltasInjustificadas}</strong> injust.
              </dd>
            </div>
          </dl>

          <p className="mt-1 text-xs text-muted-foreground">
            {atual.presencas} de {atual.totalSessoes} sessões em {atual.ano}
          </p>
        </div>
      )}
    </div>
  );
}
