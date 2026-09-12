# Google Auth setup and smoke checks

Ghim uses Supabase Auth as the identity broker. The web app uses SSR cookies;
the extension uses OAuth PKCE through `identity.launchWebAuthFlow`. Both arrive
at the same `/api/v1/session` boundary and are normalized from verified claims
to one Learner actor.

Run the guided setup from the repository root:

```bash
./scripts/setup-google-auth.sh
```

The script writes only public application configuration to `.env.local` and
walks through the secrets that must be pasted directly between Google Cloud,
Supabase and Vercel. Google client secrets must not be committed or exposed to
either client bundle.

## Required redirect URLs

- Google OAuth client → Supabase callback shown on the Google provider page,
  normally `https://<project-ref>.supabase.co/auth/v1/callback`.
- Supabase URL Configuration → `http://localhost:3000/auth/callback` for local
  web development and the exact deployed `/auth/callback` URL for production.
- Supabase URL Configuration → the exact value returned by
  `chrome.identity.getRedirectURL("auth/callback")`, normally
  `https://<extension-id>.chromiumapp.org/auth/callback`.

Use only `openid`, email and profile scopes. Ghim does not request or persist a
Google provider token.

## Web smoke check

1. Run `npm run dev --workspace @ghim/web` and open
   `http://localhost:3000`.
2. Choose **Tiếp tục với Google**, complete consent and confirm the callback
   lands on `/library`.
3. Reload `/library` to confirm the SSR cookie refresh remains authenticated.
4. Choose **Đăng xuất**, then confirm `/library` redirects to the signed-out
   home page.
5. Revoke the Ghim session in Supabase Auth, reload `/library`, and confirm the
   next API call returns the redacted `AUTH_REQUIRED` envelope.

## Extension smoke check

1. Run `npm run build:chrome --workspace @ghim/extension`, enable Developer
   mode at `chrome://extensions`, and load `apps/extension/.output/chrome-mv3`.
2. Confirm the generated manifest requests only `identity`, `storage`, and host
   access to the configured Ghim/Supabase origins.
3. Open the popup, choose **Tiếp tục với Google**, and confirm it shows the
   same email and Learner ID as the web session.
4. Inspect the content-script context: it must receive no access or refresh
   token. Auth storage and OAuth exchange belong only to the background worker.
5. Put a fixture record under `ghim.pending-captures.v1`, sign out or revoke the
   session, and confirm the record remains. Sign in as another account and
   confirm the popup reports **Khác tài khoản** rather than sending or deleting
   the queued record.

Never paste tokens, cookies, captured text, deck names or article URLs into
logs, telemetry, screenshots or bug reports.
