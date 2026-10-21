'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApiResource } from '@/lib/use-api-resource';

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
  const { data: dados, isLoading } = useApiResource<FrequenciaResponse>(
    `/api/parlamentares/${parlamentarId}/frequencia`
  );
  const [anoEscolhido, setAnoEscolhido] = useState<number | null>(null);
  const ano = anoEscolhido ?? dados?.anos[0] ?? null;
  const atual = dados?.porAno.find((r) => r.ano === ano) ?? null;

  return (
    <div className="stat-card col-span-3 md:col-span-1 px-4 sm:px-5 text-center sm:text-left" aria-live="polite">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs sm:text-sm text-muted-foreground">Presença em plenário</p>
        {dados && dados.anos.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="sr-only">Filtrar presença por ano</span>
            <select
              value={ano ?? ''}
              onChange={(e) => setAnoEscolhido(Number(e.target.value))}
              aria-label="Filtrar presença por ano"
              className="h-9 rounded-md border border-border bg-background px-2 text-base sm:text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="bg-green-600 dark:bg-green-500 h-full" style={{ width: `${pct(atual.presencas, atual.totalSessoes)}%` }} />
            <div
              className="bg-amber-600 dark:bg-amber-500 h-full"
              style={{ width: `${pct(atual.faltasJustificadas, atual.totalSessoes)}%` }}
            />
            <div
              className="bg-red-600 dark:bg-red-500 h-full"
              style={{ width: `${pct(atual.faltasInjustificadas, atual.totalSessoes)}%` }}
            />
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-green-600 dark:bg-green-500" aria-hidden="true" />
              <dt className="sr-only">Presenças</dt>
              <dd>
                Presenças <strong className="font-semibold text-foreground">{atual.presencas}</strong>
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-amber-600 dark:bg-amber-500" aria-hidden="true" />
              <dt className="sr-only">Faltas justificadas</dt>
              <dd>
                Justificadas <strong className="font-semibold text-foreground">{atual.faltasJustificadas}</strong>
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-full bg-red-600 dark:bg-red-500" aria-hidden="true" />
              <dt className="sr-only">Faltas injustificadas</dt>
              <dd>
                Injustificadas <strong className="font-semibold text-foreground">{atual.faltasInjustificadas}</strong>
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
