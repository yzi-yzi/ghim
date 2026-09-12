# Ghim browser extension

Chrome-first WXT + React shell for Ghim. The Chrome artifact is compatible with
Microsoft Edge; WXT also builds an Edge target from the same entrypoints.

## Commands

- `npm run dev`: run the Chrome development build.
- `npm run build`: build Chrome MV3 and Edge MV3 outputs.
- `npm run artifact`: create the Chrome ZIP retained by CI.
- `npm run lint`, `npm run typecheck`, `npm test`: verify the workspace.

## Permission baseline

Authentication requests only `identity` and `storage`, plus host access to the
configured Ghim API and Supabase origins. The content script never receives or
stores access/refresh tokens. The Capture ticket must justify each additional
permission it adds—expected candidates are `activeTab`, `contextMenus`, and
`scripting` following an explicit user gesture. Broad `<all_urls>` host access
is not part of the extension.

Live Capture requests, Firefox, and Safari remain outside this ticket. Auth
state and PKCE exchange live in the background worker. Signing out clears only
the Supabase session; a future offline Capture queue uses a separate storage
key so expired or revoked sessions cannot delete unsent words.

API contracts and the typed client boundary belong to `@ghim/api`. Extension
features consume that shared boundary directly rather than maintaining a local
HTTP transport or asserting response types themselves.
