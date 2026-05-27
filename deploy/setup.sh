#!/usr/bin/env bash
# First-time provisioning for a fresh Ubuntu box (Lightsail / EC2).
# Run as a sudo-capable, non-root user (e.g. `ubuntu`):
#   curl -fsSL https://raw.githubusercontent.com/wyf-ACCEPT/digients-preview/main/deploy/setup.sh | bash
# or, after cloning: bash deploy/setup.sh
#
# Override defaults with env vars, e.g.:
#   PREVIEW_DOMAIN=preview.digients.tech NODE_MAJOR=22 bash deploy/setup.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/wyf-ACCEPT/digients-preview.git}"
APP_DIR="${APP_DIR:-/opt/digients-preview}"
NODE_MAJOR="${NODE_MAJOR:-22}"
RUN_USER="${RUN_USER:-$(whoami)}"

echo "==> [1/7] Node ${NODE_MAJOR} + git + ffmpeg"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs git ffmpeg
sudo corepack enable
corepack prepare pnpm@latest --activate

echo "==> [2/7] Caddy (reverse proxy + auto HTTPS)"
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update && sudo apt-get install -y caddy

echo "==> [3/7] Clone / update repo at ${APP_DIR}"
if [ ! -d "${APP_DIR}/.git" ]; then
  sudo mkdir -p "${APP_DIR}"
  sudo chown "${RUN_USER}:${RUN_USER}" "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
fi
cd "${APP_DIR}"
git pull --ff-only

echo "==> [4/7] Install deps + build frontend"
pnpm install --frozen-lockfile
pnpm build

echo "==> [5/7] Placeholder videos (if none present)"
if ! ls videos/*.mp4 >/dev/null 2>&1; then
  pnpm gen:samples || echo "  (skipped — drop real mp4s into ${APP_DIR}/videos later)"
fi

echo "==> [6/7] Env file + systemd service"
if [ ! -f /etc/digients-preview.env ]; then
  sudo cp deploy/digients-preview.env.example /etc/digients-preview.env
  sudo chmod 600 /etc/digients-preview.env
  echo "  -> EDIT /etc/digients-preview.env (set PREVIEW_PASSWORD + SESSION_SECRET)"
fi
sudo cp deploy/digients-preview.service /etc/systemd/system/digients-preview.service
sudo sed -i "s#__APP_DIR__#${APP_DIR}#g; s#__USER__#${RUN_USER}#g" /etc/systemd/system/digients-preview.service
sudo systemctl daemon-reload
sudo systemctl enable --now digients-preview

echo "==> [7/7] Caddy config"
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
if [ -n "${PREVIEW_DOMAIN:-}" ]; then
  sudo sed -i "s#preview.digients.tech#${PREVIEW_DOMAIN}#g" /etc/caddy/Caddyfile
fi
sudo systemctl reload caddy || sudo systemctl restart caddy

cat <<EOF

==> Done.
Local liveness check:   curl -s localhost:8787/healthz   (expect: ok)

Remaining manual steps:
  1. Set PREVIEW_PASSWORD + SESSION_SECRET in /etc/digients-preview.env, then:
       sudo systemctl restart digients-preview
  2. Point your domain's DNS A record at this box, set the domain in
     /etc/caddy/Caddyfile (default: preview.digients.tech), then:
       sudo systemctl reload caddy
  3. Open ports 80 + 443 in the Lightsail/EC2 firewall.
  4. Upload real demo clips:
       rsync -avz ./videos/ ${RUN_USER}@<box-ip>:${APP_DIR}/videos/
EOF
