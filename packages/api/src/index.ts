export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

/**
 * Shared client boundary for Ghim's versioned API.
 *
 * Endpoint methods are added here alongside their validated request and
 * response contracts, so clients never invent transport-level response types.
 */
export interface GhimApiClient {
  readonly apiVersion: "v1";
}
