import {
  classifyPendingCaptureAccount,
  createGhimApiClient,
  type LearnerActor,
  type PendingCaptureAccountState,
} from "@ghim/api";
import { createClient, type Session, type SupportedStorage } from "@supabase/supabase-js";

const pendingCaptureKey = "ghim.pending-captures.v1";

interface PendingCaptureIdentity {
  learnerId: string;
}

export interface ExtensionAuthState {
  accountState: PendingCaptureAccountState;
  actor: LearnerActor | null;
  status: "authenticated" | "configuration_required" | "signed_out";
}

const extensionStorage: SupportedStorage = {
  async getItem(key) {
    const stored = await browser.storage.local.get(key);
    return typeof stored[key] === "string" ? stored[key] : null;
  },
  async removeItem(key) {
    await browser.storage.local.remove(key);
  },
  async setItem(key, value) {
    await browser.storage.local.set({ [key]: value });
  },
};

function getClient() {
  const url = import.meta.env.WXT_PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.WXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
      storage: extensionStorage,
    },
  });
}

async function pendingCaptureOwners() {
  const stored = await browser.storage.local.get(pendingCaptureKey);
  if (!Array.isArray(stored[pendingCaptureKey])) return [];
  return stored[pendingCaptureKey]
    .filter(
      (capture): capture is PendingCaptureIdentity =>
        typeof capture === "object" &&
        capture !== null &&
        typeof (capture as PendingCaptureIdentity).learnerId === "string",
    )
    .map((capture) => capture.learnerId);
}

async function fetchActor(session: Session): Promise<LearnerActor> {
  const client = createGhimApiClient({
    accessToken: session.access_token,
    baseUrl: import.meta.env.WXT_PUBLIC_GHIM_API_URL,
  });
  return (await client.getSession()).actor;
}

async function currentSession() {
  const client = getClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  if (!data.session) return null;

  const expiresSoon = (data.session.expires_at ?? 0) <= Math.floor(Date.now() / 1000) + 30;
  if (!expiresSoon) return data.session;

  const refreshed = await client.auth.refreshSession(data.session);
  return refreshed.data.session;
}

export async function getExtensionAuthState(): Promise<ExtensionAuthState> {
  if (!getClient()) {
    return { accountState: "none", actor: null, status: "configuration_required" };
  }

  const session = await currentSession();
  if (!session) return { accountState: "none", actor: null, status: "signed_out" };

  try {
    const actor = await fetchActor(session);
    const accountState = classifyPendingCaptureAccount(
      await pendingCaptureOwners(),
      actor.learnerId,
    );
    return { accountState, actor, status: "authenticated" };
  } catch {
    return { accountState: "none", actor: null, status: "signed_out" };
  }
}

export async function signInWithGoogle() {
  const client = getClient();
  if (!client) throw new Error("AUTH_CONFIGURATION_REQUIRED");

  const redirectTo = browser.identity.getRedirectURL("auth/callback");
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error("AUTH_START_FAILED");

  const responseUrl = await browser.identity.launchWebAuthFlow({
    interactive: true,
    url: data.url,
  });
  if (!responseUrl) throw new Error("AUTH_CANCELLED");

  const code = new URL(responseUrl).searchParams.get("code");
  if (!code) throw new Error("AUTH_CALLBACK_FAILED");
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error) throw new Error("AUTH_CALLBACK_FAILED");

  return getExtensionAuthState();
}

export async function signOut() {
  const client = getClient();
  if (client) await client.auth.signOut({ scope: "local" });
  // Pending captures live under a separate key and deliberately survive sign-out.
  return getExtensionAuthState();
}
