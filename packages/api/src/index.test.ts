import { describe, expect, it } from "vitest";

import {
  ActorAuthenticationError,
  apiErrorEnvelopeSchema,
  classifyPendingCaptureAccount,
  createGhimApi,
  createGhimApiClient,
  normalizeLearnerActor,
  sessionResponseSchema,
} from "./index.js";

const learnerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("normalizeLearnerActor", () => {
  it("derives the learner only from verified Google claims", () => {
    expect(
      normalizeLearnerActor({
        app_metadata: { provider: "google" },
        email: "learner@example.test",
        sub: learnerId,
      }),
    ).toEqual({ email: "learner@example.test", learnerId });
  });

  it("rejects non-Google identities", () => {
    expect(() =>
      normalizeLearnerActor({
        app_metadata: { provider: "github" },
        sub: learnerId,
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ActorAuthenticationError>>({
        code: "AUTH_PROVIDER_NOT_ALLOWED",
      }),
    );
  });

  it("never accepts a client-shaped learner id as claims", () => {
    expect(() => normalizeLearnerActor({ learnerId })).toThrowError(
      expect.objectContaining<Partial<ActorAuthenticationError>>({
        code: "AUTH_REQUIRED",
      }),
    );
  });
});

describe("pending Capture ownership", () => {
  it("keeps same-account queued captures ready", () => {
    expect(classifyPendingCaptureAccount([learnerId, learnerId], learnerId)).toBe(
      "ready",
    );
  });

  it("makes account mismatch explicit without deleting queued captures", () => {
    expect(
      classifyPendingCaptureAccount(
        ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
        learnerId,
      ),
    ).toBe("account_mismatch");
  });
});

describe("Ghim API auth contract", () => {
  it("returns the normalized actor", async () => {
    const app = createGhimApi({ resolveActor: async () => ({ learnerId }) });
    const response = await app.request("/api/v1/session");
    expect(response.status).toBe(200);
    expect(sessionResponseSchema.parse(await response.json())).toEqual({
      actor: { learnerId },
    });
  });

  it("returns a stable, redacted auth error envelope", async () => {
    const app = createGhimApi({
      createRequestId: () => "request-test",
      resolveActor: async () => {
        throw new Error("secret bearer token");
      },
    });
    const response = await app.request("/api/v1/session");
    const body = apiErrorEnvelopeSchema.parse(await response.json());
    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "AUTH_REQUIRED",
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
        requestId: "request-test",
      },
    });
    expect(JSON.stringify(body)).not.toContain("secret bearer token");
  });
});

describe("Ghim API client", () => {
  it("sends the bearer token and validates the shared response contract", async () => {
    const client = createGhimApiClient({
      accessToken: "access-test",
      baseUrl: "https://ghim.example/",
      fetch: async (input, init) => {
        expect(input).toBe("https://ghim.example/api/v1/session");
        expect(init?.headers).toEqual({ Authorization: "Bearer access-test" });
        return Response.json({ actor: { learnerId } });
      },
    });

    await expect(client.getSession()).resolves.toEqual({ actor: { learnerId } });
  });
});
