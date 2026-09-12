import { describe, expect, it, vi } from "vitest";

import { ApiTransportError, createApiTransport } from "./transport";

describe("createApiTransport", () => {
  it("normalizes the base URL and returns typed JSON", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ status: "ok" }),
      { headers: { "content-type": "application/json" }, status: 200 },
    ));
    const api = createApiTransport({ baseUrl: "https://api.ghim.app/", fetcher });

    const result = await api.request<{ status: "ok" }>("/api/v1/health");

    expect(result).toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledWith("https://api.ghim.app/api/v1/health", undefined);
  });

  it("turns non-success responses into a transport error", async () => {
    const api = createApiTransport({
      baseUrl: "https://api.ghim.app",
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
    });

    await expect(api.request("/api/v1/health")).rejects.toEqual(new ApiTransportError(503));
  });
});
