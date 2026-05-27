#!/usr/bin/env bash
# Redeploy the latest code on an already-provisioned box: pull, rebuild, restart.
# Videos (gitignored) and /etc/digients-preview.env are left untouched.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/digients-preview}"
cd "${APP_DIR}"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing deps + rebuilding frontend"
pnpm install --frozen-lockfile
pnpm build

echo "==> Restarting service"
sudo systemctl restart digients-preview
sleep 1
systemctl --no-pager --lines=0 status digients-preview | head -4
echo "==> Liveness:" && curl -fsS localhost:8787/healthz && echo
