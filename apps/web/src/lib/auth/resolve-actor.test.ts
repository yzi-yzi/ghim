import { ActorAuthenticationError } from "@ghim/api";
import { describe, expect, it } from "vitest";

import { resolveLearnerActor } from "./resolve-actor";

const learnerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function authVerifier({
  claims = { app_metadata: { provider: "google" }, sub: learnerId },
  claimsError = null,
  userError = null,
  userId = learnerId,
}: {
  claims?: unknown;
  claimsError?: unknown;
  userError?: unknown;
  userId?: string | null;
} = {}) {
  return {
    async getClaims() {
      return { data: { claims }, error: claimsError };
    },
    async getUser() {
      return { data: { user: userId ? { id: userId } : null }, error: userError };
    },
  };
}

describe("resolveLearnerActor", () => {
  it("accepts a verified Google user whose fresh identity matches the JWT", async () => {
    await expect(resolveLearnerActor(authVerifier())).resolves.toEqual({ learnerId });
  });

  it("verifies the same bearer token against claims and the fresh user lookup", async () => {
    const verifiedTokens: Array<string | undefined> = [];
    const auth = {
      async getClaims(token?: string) {
        verifiedTokens.push(token);
        return {
          data: { claims: { app_metadata: { provider: "google" }, sub: learnerId } },
          error: null,
        };
      },
      async getUser(token?: string) {
        verifiedTokens.push(token);
        return { data: { user: { id: learnerId } }, error: null };
      },
    };

    await resolveLearnerActor(auth, "bearer-test");
    expect(verifiedTokens).toEqual(["bearer-test", "bearer-test"]);
  });

  it.each([
    ["invalid or expired claims", authVerifier({ claimsError: new Error("expired") })],
    ["a revoked or deleted user", authVerifier({ userId: null })],
    ["a subject mismatch", authVerifier({ userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" })],
  ])("rejects %s", async (_name, auth) => {
    await expect(resolveLearnerActor(auth)).rejects.toMatchObject<
      Partial<ActorAuthenticationError>
    >({ code: "AUTH_REQUIRED" });
  });

  it("rejects a verified non-Google identity", async () => {
    const auth = authVerifier({
      claims: { app_metadata: { provider: "github" }, sub: learnerId },
    });
    await expect(resolveLearnerActor(auth)).rejects.toMatchObject<
      Partial<ActorAuthenticationError>
    >({ code: "AUTH_PROVIDER_NOT_ALLOWED" });
  });
});
