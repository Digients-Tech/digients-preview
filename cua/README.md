---
title: CUA sample preview
metadata:
  created: 2026-10-15
  modified:
    - date: 2026-10-15
      note: Add the independent ZBrush viewer and production deployment contract.
---

# CUA sample preview

One production site: `https://cua-sample.digients.tech/`. No CUA staging site is planned.
This directory contains the standalone HTML/JS/CSS viewer. It does not change the
existing React portal or Alex's L4 branch. Runtime media and annotations stay out of Git.

## Local development

From the repository root, run `pnpm dev:cua`, then open `http://127.0.0.1:8789/`.
The launcher reads only `PREVIEW_WEB_PASSWORD` and `PREVIEW_WEB_PASSWORD_EXTERNAL`
from the parent workspace's `.env`, using the same configured passwords as sample.
Values are passed in the child process environment and never printed. An explicitly
set `PREVIEW_PASSWORD` takes precedence. Without either configuration, the existing
server authentication module uses its local-only development fallback.

The launcher defaults `CUA_DATA_DIR` to `~/Downloads/digients-cua-review` for the current
local package. Set `CUA_DATA_DIR` to use another location. Production has no Downloads
fallback and requires an explicit valid dataset plus password and session settings.

```
CUA_DATA_DIR/
  assets/cua-windows-20260918-30fps/  # MP4, display/training PNGs, poster
  data/cua-windows-20260918-30fps/    # sample-data.js, steps-data.js, JSON/JSONL
```

Only the ZBrush sample ID is enabled. Do not restore the removed Markov or other sample
directories. Preserve source media, labels, timestamps and provenance; this frontend
does not regenerate or claim to validate the model annotations. Keep the original
package manifest with the dataset; it describes the original package, not this repo's
modified frontend sources.

## Design and validation

Production `web/src/index.css` owns the shared palette, fonts and login styling.
`pnpm build:cua` regenerates the CUA token/login CSS adapter. `portal-theme.css` maps
viewer roles onto those tokens, retaining functional action colors and dark media/code
areas. See root `DESIGN.md` for ownership and behavior.

- `pnpm check:cua`: token drift and authentication/media boundary tests.
- `pnpm typecheck` and `pnpm build`: existing portal validation.
- `node --check cua/*.js`: run separately for each file (or use a shell loop).

## Production deployment

1. Obtain the existing deployment authorization; DNS and storage provisioning are separate actions.
2. Provision storage first. The 2026-10-15 host check found only 4.8G free; the source
   package is about 6.9GB and must not be uploaded to the existing remaining root space.
3. Create an independent release checkout at `/opt/digients-cua-preview`, owned by
   `ubuntu`. Install dependencies with `pnpm install --frozen-lockfile`, run
   `pnpm build:cua`, `pnpm check:cua`, `pnpm typecheck`, and `pnpm build`.
4. Place only the approved ZBrush runtime directories in a versioned external data
   location. Verify its package SHA-256 entries against the copied files. Keep previous
   data revisions for rollback; never overwrite hardlinked files.
5. Install `deploy/digients-cua-preview.service`. It reads `/etc/digients-preview.env`
   to share sample's `PREVIEW_PASSWORD`, then `/etc/digients-cua-preview.env` for its own
   independent `SESSION_SECRET`, `PORT`, `STATS_PATH`, and `CUA_DATA_DIR`. Never put
   secrets into Git. If sample passwords rotate, restart CUA after sample so both
   processes load the updated shared password list.
6. Arrange the DNS A record for `cua-sample.digients.tech` with Shawn. Append only the
   CUA site block from `deploy/Caddyfile.cua.snippet` to the live Caddy configuration,
   validate it, and reload. Do not replace the host's multi-site configuration.
7. Verify public HTTPS health, failed/successful login, session/logout, unauthenticated
   denial for video/PNG/JS-data/JSON direct links, authenticated byte-range seeking,
   and the registered ZBrush sample. Recheck existing sample/dev services and hashes.
8. Only after activation succeeds, create an annotated
   `deploy/cua-sample/<YYYYMMDD-HHMMSS>-<short-sha>` tag on the actual running source
   commit. Record the external data revision/manifest hash in its message, push only
   that tag to origin, and verify the remote peeled commit. Preserve old tags.

Source integration, a pushed feature branch, working localhost, and production activation
are distinct states. This branch alone does not provision DNS, storage or a live site.
