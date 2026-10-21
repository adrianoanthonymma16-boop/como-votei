'use client';

/**
 * Leitura de API no client com um único lugar para abortar, limpar estado e
 * reportar erro. Substitui os efeitos duplicados de fetch em cada aba/card.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { escolherAnoPadrao } from '@/lib/ano-padrao';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** GET + parse JSON; lança `HttpError` com a mensagem da API quando a resposta não é ok. */
export async function fetchJson<T>(
  url: string,
  init: { signal?: AbortSignal; cache?: RequestCache } = {}
): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  if (!response.ok) {
    const corpo = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new HttpError(response.status, corpo?.error ?? `Falha ao carregar dados (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

export interface ApiResource<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

interface ApiResourceOptions {
  /** Segura a requisição até as dependências estarem prontas. */
  enabled?: boolean;
}

function descreverErro(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro desconhecido';
}

/**
 * Busca `url` quando ela muda e descarta respostas de requisições abortadas.
 * `data` mantém o último valor válido durante um novo carregamento.
 */
export function useApiResource<T>(url: string | null, { enabled = true }: ApiResourceOptions = {}): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(enabled && url !== null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!enabled || url === null) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetchJson<T>(url, { signal: controller.signal })
      .then((json) => {
        if (!controller.signal.aborted) setData(json);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(descreverErro(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [url, enabled, reloadKey]);

  return { data, isLoading, error, reload };
}

export interface AnosDisponiveis {
  anos: number[];
  ano: string;
  setAno: (ano: string) => void;
  pronto: boolean;
}

/**
 * Anos com dados de um parlamentar + ano pré-selecionado (corrente quando tem
 * dados, senão o mais recente). `fonte` restringe a lista ao tipo da aba.
 */
export function useAnosDisponiveis(
  parlamentarId: string,
  fonte?: 'votos' | 'discursos' | 'proposicoes'
): AnosDisponiveis {
  const url = `/api/parlamentares/${parlamentarId}/anos${fonte ? `?fonte=${fonte}` : ''}`;
  const { data, isLoading } = useApiResource<{ anos?: number[] }>(url);
  const anos = useMemo(() => (Array.isArray(data?.anos) ? data.anos : []), [data]);
  const [ano, setAno] = useState('');
  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current || isLoading || anos.length === 0) return;
    inicializado.current = true;
    const padrao = escolherAnoPadrao(anos);
    if (padrao !== undefined) setAno(String(padrao));
  }, [anos, isLoading]);

  return { anos, ano, setAno, pronto: !isLoading };
}
