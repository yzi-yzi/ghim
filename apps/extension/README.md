# Ghim browser extension

Chrome-first WXT + React shell for Ghim. The Chrome artifact is compatible with
Microsoft Edge; WXT also builds an Edge target from the same entrypoints.

## Commands

- `npm run dev`: run the Chrome development build.
- `npm run build`: build Chrome MV3 and Edge MV3 outputs.
- `npm run artifact`: create the Chrome ZIP retained by CI.
- `npm run lint`, `npm run typecheck`, `npm test`: verify the workspace.

## Permission baseline

The foundation requests no extension or host permissions. The content-script
entrypoint uses runtime registration and is not injected yet. The Capture ticket
must justify each permission it adds—expected candidates are `activeTab`,
`contextMenus`, and `scripting` following an explicit user gesture. Broad
`<all_urls>` host access is not part of this foundation.

Authentication, live Capture requests, offline retry, Firefox, and Safari are
deliberately outside this ticket.
