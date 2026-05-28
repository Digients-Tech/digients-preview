# Deploying the preview portal

Target: one small always-on instance (AWS Lightsail or a `t3.micro`-class EC2) in the same
account as the main backend. The single Node (Hono) process serves the frontend + API +
videos; **Caddy** sits in front for automatic HTTPS; **systemd** keeps it running. Videos
live on the instance disk — this is *not* the `digients-api` Lambda.

```
deploy/
├── setup.sh                      one-time provisioning (Node, Caddy, build, service)
├── update.sh                     redeploy latest code (pull, rebuild, restart)
├── digients-preview.service      systemd unit (templated)
├── digients-preview.env.example  secrets template -> /etc/digients-preview.env
└── Caddyfile                     reverse proxy + auto HTTPS
```

## 1. Create the instance

- **Lightsail**: Ubuntu 24.04, the **$5–7/mo** plan is plenty (1 GB RAM). Give it a static
  IP. In *Networking*, open **HTTP (80)** and **HTTPS (443)**.
- **EC2 equivalent**: `t3.micro`, Ubuntu 24.04, security group allowing 80 + 443 (+ 22 for SSH).

Sizing: the app is tiny; the only real disk consideration is the videos (~5 GB for 100
clips, per the plan). The default 20–40 GB volume is fine.

## 2. Provision

SSH in as `ubuntu`, then:

```bash
curl -fsSL https://raw.githubusercontent.com/wyf-ACCEPT/digients-preview/main/deploy/setup.sh | bash
```

This installs Node 22 + Caddy + ffmpeg, clones to `/opt/digients-preview`, builds the
frontend, generates placeholder clips, and starts the `digients-preview` systemd service.

## 3. Set secrets

```bash
sudo nano /etc/digients-preview.env      # set PREVIEW_PASSWORD + SESSION_SECRET
sudo systemctl restart digients-preview
curl -s localhost:8787/healthz           # -> ok
```

Generate a session secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Domain + HTTPS

Point a DNS A record (e.g. `sample.digients.tech` — DNS is on GoDaddy) at the instance's
static IP. Then set the domain in Caddy and reload:

```bash
sudo sed -i 's/sample.digients.tech/YOUR.DOMAIN/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy fetches and renews the TLS cert automatically. Visit `https://YOUR.DOMAIN`, enter the
password, done.

## 5. Upload real demo videos

Placeholder clips are generated on setup. Replace them by name-matching
`previews[].file` in `server/src/data.ts`:

```bash
rsync -avz ./videos/ ubuntu@<box-ip>:/opt/digients-preview/videos/
ssh ubuntu@<box-ip> 'cd /opt/digients-preview && pnpm gen:posters'   # poster frames
```

Missing files degrade gracefully to a "no preview yet" placeholder in the UI.

## 6. Redeploy after code changes

```bash
ssh ubuntu@<box-ip> 'cd /opt/digients-preview && bash deploy/update.sh'
```

## Operations cheat-sheet

```bash
sudo systemctl status digients-preview      # service state
sudo journalctl -u digients-preview -f      # live logs
sudo systemctl restart digients-preview     # restart app
sudo systemctl reload caddy                 # reload proxy/TLS config
```
