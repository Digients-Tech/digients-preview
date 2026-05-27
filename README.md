# digients-preview

Client-facing **data-preview portal** — clients enter a shared password, browse the
embodied-AI data taxonomy (`Domain → Scenario → Task → Skill`), and play short video
demos per skill. Built to give buyers a polished preview instead of a raw S3 / Cyberduck
file dump.

Single repo, single always-on Node process: a [Hono](https://hono.dev) server serves the
built React frontend, the JSON catalog API, and the on-disk preview videos.

```
digients-preview/
├── web/        React + Vite + TypeScript frontend (no UI framework — bespoke CSS)
│   └── src/
│       ├── App.tsx                  auth flow + layout
│       └── components/              tabs, taxonomy browser, connectors, stat cards, video modal
├── server/     Hono backend (run directly with tsx, no build step)
│   ├── src/
│   │   ├── index.ts                 routes + static serving
│   │   ├── auth.ts                  shared-password gate (signed cookie)
│   │   ├── data.ts                  catalog seed (swap for real data later)
│   │   └── videos.ts                ranged video streaming + path-traversal guard
│   └── scripts/gen-sample-videos.ts ffmpeg placeholder clip generator
└── videos/     preview .mp4 files (gitignored; live on the server disk)
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

The taxonomy is hand-authored in [`server/src/data.ts`](server/src/data.ts) as a curated
presentation layer. Each skill has a `recordingCount` (the green badge) and a few
`previews` (viewable clips). Replace this seed with submission-derived data later; the API
shape (`GET /api/catalog`) is what the frontend depends on.

## Adding real videos

Preview files are matched by name to `previews[].file` in the seed. Drop an mp4 of the
matching name into `VIDEOS_DIR` and it plays; a missing file degrades to a "no preview
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
