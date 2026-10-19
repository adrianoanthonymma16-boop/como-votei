/**
 * Cliente HTTP com rate limiting, retry e logging
 * Respeita limites gratuitos das APIs oficiais
 */

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit?: number;
  /** Intervalo mínimo entre requests. Padrão: derivado de `requestsPerMinute`. */
  minIntervalMs?: number;
}

/** Lê um número inteiro positivo de env, com fallback. */
function numeroDeEnv(nome: string, padrao: number): number {
  const bruto = Number.parseInt(process.env[nome] || '', 10);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : padrao;
}

/** URL pública do app, usada no User-Agent — configurável por env. */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://comovotei.vercel.app';

/** User-Agent único dos clientes (identifica o projeto perante as APIs oficiais). */
export const USER_AGENT = `ComoVotei/1.0 (Transparência Legislativa; +${APP_URL})`;

export interface RequestOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

interface QueuedRequest {
  resolve: (value: Response) => void;
  reject: (error: Error) => void;
  url: string;
  options: RequestOptions;
}

export class HttpClient {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestTimestamps: number[] = [];
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      burstLimit: config.burstLimit || 10,
      // Deriva o espaçamento do limite: com 120/min eram 100ms fixos, o que
      // somava um teto efetivo de 600/min — mas o gargalo real era a fase por
      // deputado, não o intervalo. Manter derivado evita config divergente.
      minIntervalMs: config.minIntervalMs ?? Math.ceil(60_000 / config.requestsPerMinute),
    };
  }

  private cleanupTimestamps() {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  }

  private async waitForSlot(): Promise<void> {
    this.cleanupTimestamps();
    
    if (this.requestTimestamps.length >= this.config.requestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitTime = oldest + 60_000 - Date.now() + 100; // +100ms buffer
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      this.cleanupTimestamps();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      await this.waitForSlot();
      
      const item = this.queue.shift()!;
      const timestamp = Date.now();
      this.requestTimestamps.push(timestamp);

      try {
        const response = await this.executeRequest(item.url, item.options);
        item.resolve(response);
      } catch (error) {
        item.reject(error as Error);
      }

      // Intervalo entre requests para não estourar burst
      await this.sleep(this.config.minIntervalMs);
    }

    this.processing = false;
  }

  private async executeRequest(url: string, options: RequestOptions): Promise<Response> {
    const { method = 'GET', headers = {}, body, timeout = 30_000, retries = 3 } = options;

    const defaultHeaders: Record<string, string> = {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      ...headers,
    };

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Um AbortController por tentativa: reaproveitar o mesmo signal (já
      // abortado/limpo) deixava as retentativas sem timeout e um fetch travado
      // segurava a fila indefinidamente.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: defaultHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          console.warn(`[HTTP] Rate limited, waiting ${waitTime}ms (attempt ${attempt + 1}/${retries + 1})`);
          await this.sleep(waitTime);
          continue;
        }

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        if (attempt < retries) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`[HTTP] Request failed (attempt ${attempt + 1}/${retries + 1}): ${lastError.message}. Retrying in ${waitTime}ms...`);
          await this.sleep(waitTime);
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError!;
  }

  async request(url: string, options: RequestOptions = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, url, options });
      this.processQueue();
    });
  }

  async get(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' });
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getCurrentRate(): number {
    this.cleanupTimestamps();
    return this.requestTimestamps.length;
  }
}

// Instâncias pré-configuradas para cada API (free tier limits).
// Os limites são ajustáveis por env para permitir backfill em lote (o teto
// conservador de 120/min tornava o backfill de um ano inviável em 6h).
export const camaraClient = new HttpClient({
  requestsPerMinute: numeroDeEnv('CAMARA_REQUESTS_PER_MINUTE', 120),
  burstLimit: 10,
});

export const senadoClient = new HttpClient({
  requestsPerMinute: numeroDeEnv('SENADO_REQUESTS_PER_MINUTE', 60), // Senado não publica limite oficial
  burstLimit: 5,
});

export const portalTransparenciaClient = new HttpClient({
  requestsPerMinute: numeroDeEnv('PORTAL_REQUESTS_PER_MINUTE', 350), // Portal: 400/min dia, 700/min madrugada
  burstLimit: 20,
});
