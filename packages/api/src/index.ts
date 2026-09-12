import { Hono } from "hono";
import { z } from "zod";

export const apiErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export const learnerActorSchema = z.object({
  email: z.email().optional(),
  learnerId: z.uuid(),
});
export type LearnerActor = z.infer<typeof learnerActorSchema>;

export const sessionResponseSchema = z.object({ actor: learnerActorSchema });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

const verifiedClaimsSchema = z
  .object({
    app_metadata: z.object({ provider: z.literal("google") }).loose(),
    email: z.email().optional(),
    sub: z.uuid(),
  })
  .loose();

export type AuthErrorCode =
  | "AUTH_PROVIDER_NOT_ALLOWED"
  | "AUTH_REQUIRED";

export class ActorAuthenticationError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code);
    this.code = code;
    this.name = "ActorAuthenticationError";
  }
}

export function normalizeLearnerActor(claims: unknown): LearnerActor {
  const parsedClaims = verifiedClaimsSchema.safeParse(claims);

  if (!parsedClaims.success) {
    const provider = z
      .object({ app_metadata: z.object({ provider: z.string() }).loose() })
      .loose()
      .safeParse(claims);
    if (provider.success && provider.data.app_metadata.provider !== "google") {
      throw new ActorAuthenticationError("AUTH_PROVIDER_NOT_ALLOWED");
    }
    throw new ActorAuthenticationError("AUTH_REQUIRED");
  }

  const actor: LearnerActor = { learnerId: parsedClaims.data.sub };
  if (parsedClaims.data.email !== undefined) actor.email = parsedClaims.data.email;
  return actor;
}

export type PendingCaptureAccountState = "account_mismatch" | "none" | "ready";

export function classifyPendingCaptureAccount(
  pendingLearnerIds: readonly string[],
  currentLearnerId: string,
): PendingCaptureAccountState {
  if (pendingLearnerIds.length === 0) return "none";
  return pendingLearnerIds.every((learnerId) => learnerId === currentLearnerId)
    ? "ready"
    : "account_mismatch";
}

export type ResolveActor = (request: Request) => Promise<LearnerActor>;

interface CreateGhimApiOptions {
  createRequestId?: () => string;
  resolveActor: ResolveActor;
}

const publicErrors: Record<AuthErrorCode, { message: string; status: 401 | 403 }> = {
  AUTH_PROVIDER_NOT_ALLOWED: {
    message: "Ghim hiện chỉ hỗ trợ đăng nhập bằng Google.",
    status: 403,
  },
  AUTH_REQUIRED: {
    message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ.",
    status: 401,
  },
};

export function createGhimApi({
  createRequestId = () => crypto.randomUUID(),
  resolveActor,
}: CreateGhimApiOptions) {
  const app = new Hono().basePath("/api/v1");

  app.get("/session", async (context) => {
    try {
      return context.json(
        sessionResponseSchema.parse({ actor: await resolveActor(context.req.raw) }),
      );
    } catch (error) {
      const authError =
        error instanceof ActorAuthenticationError
          ? error
          : new ActorAuthenticationError("AUTH_REQUIRED");
      const publicError = publicErrors[authError.code];
      return context.json(
        apiErrorEnvelopeSchema.parse({
          error: {
            code: authError.code,
            message: publicError.message,
            requestId: createRequestId(),
          },
        }),
        publicError.status,
      );
    }
  });

  return app;
}

/** Shared transport boundary; clients never invent response shapes. */
export interface GhimApiClient {
  readonly apiVersion: "v1";
  getSession(): Promise<SessionResponse>;
}

interface CreateGhimApiClientOptions {
  accessToken: string;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export function createGhimApiClient({
  accessToken,
  baseUrl,
  fetch: request = globalThis.fetch,
}: CreateGhimApiClientOptions): GhimApiClient {
  return {
    apiVersion: "v1",
    async getSession() {
      const response = await request(
        `${baseUrl.replace(/\/$/, "")}/api/v1/session`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) throw new ActorAuthenticationError("AUTH_REQUIRED");
      return sessionResponseSchema.parse(await response.json());
    },
  };
}
