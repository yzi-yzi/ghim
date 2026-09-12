export interface ApiTransport {
  request<TResponse>(path: `/${string}`, init?: RequestInit): Promise<TResponse>;
}

interface CreateApiTransportOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export class ApiTransportError extends Error {
  constructor(readonly status: number) {
    super(`Ghim API request failed with status ${status}`);
    this.name = "ApiTransportError";
  }
}

export function createApiTransport({ baseUrl, fetcher = fetch }: CreateApiTransportOptions): ApiTransport {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async request<TResponse>(
      path: `/${string}`,
      init?: RequestInit,
    ): Promise<TResponse> {
      const response = await fetcher(`${normalizedBaseUrl}${path}`, init);

      if (!response.ok) throw new ApiTransportError(response.status);

      return (await response.json()) as TResponse;
    },
  };
}
