# digients-preview

Client-facing **data-preview portal** — clients enter a shared password, browse the data
taxonomy (`Domain → Scenario`, matching the Capture App's `scene_major` / `scene_minor`),
and preview a video demo per scenario. Built to give buyers a polished preview instead of
a raw S3 / Cyberduck file dump.

Single repo, single always-on Node process: a [Hono](https://hono.dev) server serves the
built React frontend, the catalog API, and the on-disk preview videos + posters.

```
digients-preview/
├── catalog.json   the taxonomy + demo content (edit this — no code change / rebuild)
├── web/        React + Vite + TypeScript frontend (no UI framework — bespoke CSS)
│   └── src/
│       ├── App.tsx                  auth flow + layout
│       └── components/              tabs, 2-column browser, connectors, inline preview, stat cards
├── server/     Hono backend (run directly with tsx, no build step)
│   ├── src/
│   │   ├── index.ts                 routes + static serving
│   │   ├── auth.ts                  shared-password gate (signed cookie)
│   │   ├── data.ts                  loads + validates catalog.json (mtime-cached)
│   │   └── videos.ts                ranged video + poster serving, path-traversal guard
│   └── scripts/                     ffmpeg placeholder clip + poster generators
├── videos/     preview .mp4 files (gitignored; live on the server disk)
└── posters/    generated keyframe .jpg posters (gitignored)
```

## Quick start

```bash
pnpm install
pnpm gen:samples        # generate 15 placeholder clips (needs ffmpeg) so the demo works
pnpm dev                # web on :5173 (proxies /api + /videos to the server on :8787)
```

Open http://localhost:5173. Default dev password: **`digients-demo`** (override with
`PREVIEW_PASSWORD`).

### Production (single process)

```bash
pnpm build              # builds the frontend into web/dist
PREVIEW_PASSWORD=... SESSION_SECRET=... NODE_ENV=production pnpm start
```

In production the server serves `web/dist` + the API + videos on one port (`PORT`, default
8787). Put it behind a reverse proxy / TLS as usual.

## Configuration

Copy `.env.example` → `.env`. Key vars:

| Var | Purpose |
|---|---|
| `PREVIEW_PASSWORD` | The shared password clients type. **Required in production.** |
| `SESSION_SECRET` | Signs the session cookie. Random per-boot if unset (sessions reset on restart). |
| `PORT` | Listen port (default `8787`). |
| `VIDEOS_DIR` | Where preview videos live (default `<repo>/videos`). |
| `STATIC_ROOT` | Built frontend path, relative to the server's cwd (default `../web/dist`). |

## Auth model

A single shared password gates the whole portal. On correct password the server sets a
signed, httpOnly cookie; the catalog API and every video request require it (so videos
can't be hot-linked without logging in). This is deliberately lightweight — swap in
per-user auth (invite codes / OTP via the main `digients-api`) when needed.

## Catalog data

The taxonomy lives in [`catalog.json`](catalog.json) — **edit that file, no code change or
rebuild**. Two levels: `domain` (scene_major) → `scenario` (scene_minor); each scenario has
a `recordingCount` (the green badge) and `previews` (viewable clips). The server validates
the file and caches it by mtime, so a save is picked up on the next request. The Ego
taxonomy mirrors the Capture App's `SCENE_CATALOG`; later this file can be generated from
real submission data. The API shape (`GET /api/catalog`) is what the frontend depends on.

## Adding real videos

Preview files are matched by name to `previews[].file` in `catalog.json`. Drop an mp4 of
the matching name into `VIDEOS_DIR` and it plays; a missing file degrades to a "no preview
yet" placeholder. Videos are streamed with HTTP Range support so the player can seek.
Re-generate the throwaway placeholders any time with `pnpm gen:samples`.

After adding or replacing videos, generate their **poster frames** (shown before
playback and as thumbnails in the clip list) with `pnpm gen:posters` — it extracts a
keyframe per clip into `posters/` (gitignored, served from `/posters/:file`).

## Deployment notes

Designed for a small always-on AWS instance (Lightsail / small EC2) in the same account as
the main backend — **not** the `digients-api` Lambda, which has no persistent disk for the
videos. Videos sit on the instance disk (the dataset of preview clips is small, ~GBs).

Full runbook + provisioning scripts (systemd + Caddy auto-HTTPS): [`deploy/README.md`](deploy/README.md).
One-time setup is `bash deploy/setup.sh`; redeploys are `bash deploy/update.sh`.
