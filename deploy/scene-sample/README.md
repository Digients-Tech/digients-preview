# scene.sample.digients.tech — placeholder gate

`index.html` is the visitor-facing placeholder for the scene sample portal. The
sample set does not exist yet; the page exists so that a visitor arriving from
the marketing site meets a gate instead of a 404. **No password opens it**, and
there is no backend behind it — see the comment at the top of `index.html` for
the two properties that file has to keep.

It is static and self-contained. It does not go through the `digients-preview`
Node process on 8787/8788.

## Deploy

⚠️ **`deploy/Caddyfile` in this repo is not the live config.** The box serves
four sites (prod, `dev.sample`, a "we moved" notice on `dev.digients.tech`, and
Matt's `wholebodysample` mocap gate); the tracked file still has only the first.
Edit `/etc/caddy/Caddyfile` in place — do not copy the repo file over it, or
Matt's site disappears with it.

1. DNS (GoDaddy, owned by Shawn): `scene.sample` → A → `18.142.14.149`, the same
   static IP the other three subdomains already point at.

2. Copy the page onto the box:

   ```bash
   ssh digients-preview 'sudo install -d -m 755 /srv/scene-sample'
   scp deploy/scene-sample/index.html digients-preview:/tmp/scene-index.html
   ssh digients-preview 'sudo install -m 644 -o root -g root \
     /tmp/scene-index.html /srv/scene-sample/index.html && rm /tmp/scene-index.html'
   ```

3. Append to `/etc/caddy/Caddyfile`:

   ```
   # Placeholder gate for the scene sample set, which does not exist yet. No
   # password opens it and there is nothing behind it, so unlike the mocap block
   # above there is no authed branch and no protected data path to 401.
   scene.sample.digients.tech {
   	encode zstd gzip
   	root * /srv/scene-sample
   	header Cache-Control "no-store"
   	file_server
   }
   ```

4. `ssh digients-preview 'sudo caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy'`

Caddy issues the certificate on the first request, so step 4 only works once the
DNS record from step 1 has propagated.

## Verify

```bash
curl -sI https://scene.sample.digients.tech/ | head -3   # 200, no-store
curl -s  https://scene.sample.digients.tech/ | grep -c 'Wrong password'
```

## When the real portal lands

Delete the Caddy block and `/srv/scene-sample`, and point the host at whatever
serves the real thing. Nothing else references this directory.
