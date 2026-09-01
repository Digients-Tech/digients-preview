#!/usr/bin/env bash
# Redeploy the latest code on an already-provisioned box: pull, rebuild, restart.
# Videos (gitignored) and the service's env file are left untouched.
#
#   bash deploy/update.sh                                   # prod
#   APP_DIR=/opt/digients-preview-dev bash deploy/update.sh # staging
#
# The service name and the liveness port are derived from APP_DIR rather than
# written down. Both checkouts live on one box, and this script used to take
# APP_DIR while restarting a hardcoded `digients-preview`: deploying staging
# built staging, restarted prod, and left staging running the old code -- with
# a liveness check against prod's port that reported ok either way.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/digients-preview}"
SERVICE="${SERVICE:-$(basename "$APP_DIR")}"

if ! systemctl cat "$SERVICE" >/dev/null 2>&1; then
  echo "No systemd unit named '${SERVICE}' -- check APP_DIR." >&2
  exit 1
fi

# Read the port from the unit's own EnvironmentFile so it cannot drift from
# what the service actually listens on. prod does not set PORT and falls
# through to the app's built-in default.
if [ -z "${PORT:-}" ]; then
  ENV_FILE="$(systemctl show -p EnvironmentFiles --value "$SERVICE" | awk '{print $1}' | sed 's/^-//')"
  PORT="$(sudo sed -n 's/^PORT=//p' "$ENV_FILE" 2>/dev/null | tail -1 || true)"
fi
PORT="${PORT:-8787}"

cd "${APP_DIR}"

echo "==> ${SERVICE} <- ${APP_DIR} (branch $(git branch --show-current), health on :${PORT})"

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing deps + rebuilding frontend"
pnpm install --frozen-lockfile
pnpm build

echo "==> Restarting service"
sudo systemctl restart "$SERVICE"
sleep 1
systemctl --no-pager --lines=0 status "$SERVICE" | head -4
echo "==> Liveness:" && curl -fsS "localhost:${PORT}/healthz" && echo
