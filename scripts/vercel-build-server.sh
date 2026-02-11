#!/usr/bin/env bash
# Run server build from repo root. Works whether Vercel cwd is repo root or client/.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
# Ensure deps exist in repo root (Vercel may have run npm install only in client/)
if [ ! -f "node_modules/.bin/tsc" ]; then
  npm install
fi
npx tsc --project server/tsconfig.server.json
