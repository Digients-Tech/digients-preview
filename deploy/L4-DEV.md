# L4 collection on the development instance

The L4 explorer presents the 291-episode first 1x delivery. Its private runtime dataset joins the exact local L4 JSON files with delivered low-resolution recordings, rendered MANO hands, and MANO NPZ files. The public Git repository contains no delivery media or captions.

## Runtime data

Set `L4_DATA_DIR` to a directory containing:

```
catalog.json
captions/<clip-id>.json
videos/<clip-id>.recording.mp4
videos/<clip-id>.hand.mp4
posters/<clip-id>.jpg
poses/<clip-id>.mano.npz
```

The dataset builder also writes `source-manifest.json` with source keys and caption hashes. Media preparation writes per-file SHA-256/size receipts and probes both videos for every episode. These receipts stay with the private dataset.

`server/scripts/prepare-l4-delivery.py --help` documents the offline catalogue build. `prepare-l4-media.py DATA_DIR` accepts short-lived GET URLs as JSON on stdin; URLs and credentials must not be persisted or placed in command arguments. Only the Digients AWS account may generate those URLs. Do not use legacy `sync:*` commands for this collection.

Only verified media channels appear in the viewer. Independent head pose is not included in this delivery mapping; a MANO hand's global orientation is not head pose. Add a head channel only after its artifact, clip mapping, camera/time coordinate conventions, and alignment are verified.

## Build and release

1. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
2. Verify real playback and seeking, paused/playing media switches, language persistence, filters, caption downloads, byte ranges, authentication, and mobile widths. Full media preparation must succeed before activation.
3. Place the reviewed Git commit in a new `/opt/digients-preview-releases/l4-<date>-<sha>/` directory owned by `ubuntu`. Install dependencies there and copy or build `web/dist/`. The previous `/opt/digients-preview-dev` checkout must remain intact.
4. Point only `digients-preview-dev.service` to the release with `/etc/systemd/system/digients-preview-dev.service.d/30-l4-release.conf`. Retain its existing `EnvironmentFile=/etc/digients-preview-dev.env`, passwords, port 8788, and service identity. Use this drop-in structure, replacing the release path:

```ini
[Service]
WorkingDirectory=/opt/digients-preview-releases/RELEASE/server
ExecStart=
ExecStart=/usr/bin/env L4_DATA_DIR=/opt/digients-preview-data/l4-1x-20260921 STATS_PATH=/opt/digients-preview-dev/.stats/login-counts.json pnpm start
```

5. Reload systemd and restart **only** `digients-preview-dev`. Check `https://dev.sample.digients.tech/healthz`, authentication, 291 catalogue entries, and real video/caption/pose responses through the public HTTPS origin.
6. Compare the production service PID/start time, production HTML hash, Caddy configuration hash, and old dev Git status before/after. Do not edit Caddy, production files, shared symlinks, or the existing dev branch.

## Rollback

If this is the first L4 deployment, remove only the newly created `30-l4-release.conf`, then run `systemctl daemon-reload` and `systemctl restart digients-preview-dev`. The base unit points back to `/opt/digients-preview-dev/server`. For subsequent releases, restore the saved previous drop-in instead. Verify the dev health endpoint and preserve the independent data directory for investigation.

## L4 time semantics

Actions and subtasks use half-open intervals `[start_sec, end_sec)`. Gaps and the end of a clip do not display a stale active action. Media switches preserve the playback clock, speed, and play/pause intent; changing episodes resets them. Scene-memory entries are revealed according to their source `t_sec`; their prose is the supplied annotation and may describe a wider interval, so the UI does not claim a causally generated real-time state estimate.
