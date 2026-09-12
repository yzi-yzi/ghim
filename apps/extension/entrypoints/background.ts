import {
  getExtensionAuthState,
  signInWithGoogle,
  signOut,
} from "../utils/auth";

export type AuthMessage =
  | { type: "AUTH_GET_STATE" }
  | { type: "AUTH_SIGN_IN" }
  | { type: "AUTH_SIGN_OUT" };

export default defineBackground(() => {
  // chrome.storage.local is exposed to content scripts by default. Restrict it
  // before servicing messages so persisted Supabase tokens stay in trusted
  // extension contexts (background and popup), never the page-facing script.
  const trustedStorage = browser.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });

  browser.runtime.onMessage.addListener(async (message: AuthMessage) => {
    await trustedStorage;
    switch (message.type) {
      case "AUTH_GET_STATE":
        return getExtensionAuthState();
      case "AUTH_SIGN_IN":
        return signInWithGoogle();
      case "AUTH_SIGN_OUT":
        return signOut();
    }
  });
});
