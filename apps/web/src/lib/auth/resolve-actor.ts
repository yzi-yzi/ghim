import { ActorAuthenticationError, normalizeLearnerActor } from "@ghim/api";

interface AuthVerifier {
  getClaims(token?: string): Promise<{
    data: { claims?: unknown } | null;
    error: unknown;
  }>;
  getUser(token?: string): Promise<{
    data: { user: { id: string } | null };
    error: unknown;
  }>;
}

export async function resolveLearnerActor(auth: AuthVerifier, token?: string) {
  const { data: claimsData, error: claimsError } = await auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    throw new ActorAuthenticationError("AUTH_REQUIRED");
  }

  // getClaims verifies the JWT; the fresh lookup also rejects a user/session
  // revoked server-side before the locally cached access token expires.
  const { data: userData, error: userError } = await auth.getUser(token);
  const subject = (claimsData.claims as { sub?: unknown }).sub;
  if (userError || !userData.user || userData.user.id !== subject) {
    throw new ActorAuthenticationError("AUTH_REQUIRED");
  }

  return normalizeLearnerActor(claimsData.claims);
}
