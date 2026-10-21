import { fetchJson, HttpError } from '@/lib/use-api-resource';

type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

function resposta(corpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(corpo),
  } as Response;
}

describe('fetchJson', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devolve o JSON quando a resposta é ok', async () => {
    fetchMock.mockResolvedValue(resposta({ data: [{ id: '1' }], total: 1 }));

    await expect(fetchJson<{ total: number }>('/api/x')).resolves.toEqual({ data: [{ id: '1' }], total: 1 });
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { cache: 'no-store' });
  });

  it('usa a mensagem de erro da API quando a resposta não é ok', async () => {
    fetchMock.mockResolvedValue(resposta({ error: 'Parlamentar não encontrado' }, 404));

    const erro = await fetchJson('/api/x').catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(HttpError);
    expect((erro as HttpError).status).toBe(404);
    expect((erro as HttpError).message).toBe('Parlamentar não encontrado');
  });

  it('cai na mensagem genérica quando o corpo do erro não é JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new SyntaxError('Unexpected token <')),
    } as unknown as Response);

    const erro = await fetchJson('/api/x').catch((e: unknown) => e);

    expect((erro as HttpError).message).toBe('Falha ao carregar dados (HTTP 502)');
  });

  it('repassa o signal de aborto para o fetch', async () => {
    fetchMock.mockResolvedValue(resposta({}));
    const controller = new AbortController();

    await fetchJson('/api/x', { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('/api/x', { cache: 'no-store', signal: controller.signal });
  });
});
