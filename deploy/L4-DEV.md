# L4 collection on the development instance

The first 1x delivery contains 291 episodes. The spatial dev version presents its 284 episodes with completed low-resolution hand and camera stages; seven failed-camera episodes are excluded. Its private runtime dataset joins the exact local L4 JSON files with delivered low-resolution recordings, rendered MANO hands, and MANO NPZ files. The public Git repository contains no delivery media or captions.

## Runtime data

Set `L4_DATA_DIR` to a directory containing:

```
catalog.json
captions/<clip-id>.json
videos/<clip-id>.recording.mp4
videos/<clip-id>.hand.mp4
posters/<clip-id>.jpg
poses/<clip-id>.mano.npz
spatial/<clip-id>.json.gz
```

The dataset builder also writes `source-manifest.json` with source keys and caption hashes. Media preparation writes per-file SHA-256/size receipts and probes both videos for every episode. These receipts stay with the private dataset.

The server enriches the v1 catalog from the immutable caption files once per catalog mtime. This adds exact L4 industry, scenes, task labels/classes and compact subtask segments for the flat gallery. It does not rewrite the runtime catalog or original captions. Full action and memory payloads are fetched when an episode opens. Gallery previews attach only while their card is visible; a single shared observer pauses/releases offscreen media. The delivered `hand` stream already contains skeleton overlays.

`server/scripts/prepare-l4-delivery.py --help` documents the offline catalogue build. `prepare-l4-media.py DATA_DIR` accepts short-lived GET URLs as JSON on stdin; URLs and credentials must not be persisted or placed in command arguments. Only the Digients AWS account may generate those URLs. Do not use legacy `sync:*` commands for this collection.

The spatial dataset uses corrected low-res.rendered.mp4, low-res.mano.npz and low-res.camera.npz from delivered/for-1x-first-3h/. The producer commit is 66da58edde58c1813ffa3c5ec4ad247e202c1703. Head orientation is represented by the SLAM camera pose, not anatomical head/neck joints. `spatial_payload.py::build_payload` validates aligned frames, timestamps, finite joints, quaternions and positive scale before conversion. MANO joints are already camera-space positions. Camera traj is camera-to-world xyz+xyzw and its translation is multiplied by scale. The viewer uses a first-camera local origin and y-up axes. Missing tracks remain absent; no pose quality or shared world calibration is inferred from successful stage status.

Camera NPZ files contain large disparity arrays that are unnecessary for this view. Read the ZIP directory with authenticated S3 byte ranges, pin reads with IfMatch to the inventory ETag, and extract only traj, scale, img_focal, img_center and tstamp. The full native MANO file is retained. Validate all per-clip payload hashes, caption hashes, video durations/codecs and counts on the host before creating COMPLETE.json. Private source-manifest.json and spatial-verification.json retain lineage and frame counts. Reuse verified original videos/captions/posters with hardlinks in the new isolated data directory; never overwrite a hardlinked file.

## Build and release

1. Run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
2. Verify real playback and seeking, paused/playing media switches, language persistence, filters, caption downloads, byte ranges, authentication, and mobile widths. Full media preparation must succeed before activation.
3. Place the reviewed Git commit in a new `/opt/digients-preview-releases/l4-<date>-<sha>/` directory owned by `ubuntu`. Install dependencies there and copy or build `web/dist/`. The previous `/opt/digients-preview-dev` checkout must remain intact.
4. Point only `digients-preview-dev.service` to the release with `/etc/systemd/system/digients-preview-dev.service.d/30-l4-release.conf`. Retain its existing `EnvironmentFile=/etc/digients-preview-dev.env`, passwords, port 8788, and service identity. Use this drop-in structure, replacing the release path:

```ini
[Service]
WorkingDirectory=/opt/digients-preview-releases/RELEASE/server
ExecStart=
ExecStart=/usr/bin/env L4_DATA_DIR=/opt/digients-preview-data/l4-1x-20260922-spatial STATS_PATH=/opt/digients-preview-dev/.stats/login-counts.json pnpm start
```

5. Reload systemd and restart **only** `digients-preview-dev`. Check `https://dev.sample.digients.tech/healthz`, authentication, 284 catalogue entries, and real video/caption/pose responses through the public HTTPS origin.
6. Compare the production service PID/start time, production HTML hash, Caddy configuration hash, and old dev Git status before/after. Do not edit Caddy, production files, shared symlinks, or the existing dev branch.

## Rollback

If this is the first L4 deployment, remove only the newly created `30-l4-release.conf`, then run `systemctl daemon-reload` and `systemctl restart digients-preview-dev`. The base unit points back to `/opt/digients-preview-dev/server`. For subsequent releases, restore the saved previous drop-in instead. Verify the dev health endpoint and preserve the independent data directory for investigation.

## L4 time semantics

Actions and subtasks use half-open intervals `[start_sec, end_sec)`. Gaps and the end of a clip do not display a stale active action. Media switches preserve the playback clock, speed, and play/pause intent. Detail opens at its gallery card's clock; direct moment links carry `episode`, `t` and `view`. Closing detail restores the gallery's filters, scroll and focus. Memory defaults to “At playhead”, selecting the latest entry per object through source `t_sec`, with “All events” exposing every source observation. A small green dot pulses on forward playback across a real observation timestamp, and reduced-motion removes animation. Both views and both timeline cursors follow the presented video frame. Segment and memory timestamp clicks seek and play; ordinary scrubbing retains playback intent. The prose is the supplied annotation and may describe a wider interval, so the UI does not claim a causally generated real-time state estimate.

## Media cache identity

The catalogue adds `mediaRevision` from the immutable dataset directory name. Both gallery/detail video URLs and the MANO download carry it as `?v=...`, so a data refresh cannot reuse a prior dataset's cached Range response. Use a new dataset directory for each data revision; do not replace media in place under the same version name.
