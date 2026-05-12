#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/coinin}"
REPO_URL="${REPO_URL:-https://github.com/thedoy12/coinin.git}"
BRANCH="${BRANCH:-main}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 20+ first."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f .env ]; then
  echo "Missing $APP_DIR/.env. Create it before deploying."
  echo "Use .env.example as the base and fill production secrets."
  exit 1
fi

npm ci --no-audit
npm run build
npm run db:push

pm2 startOrReload deploy/vps/ecosystem.config.cjs --env production
pm2 save

echo "CoinIn is running behind PM2 on 127.0.0.1:3001."
echo "Check: curl http://127.0.0.1:3001/api/health"
