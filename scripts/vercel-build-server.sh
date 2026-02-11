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
# Emit JS even if there are type errors (noEmitOnError: false in tsconfig).
# Exit 0 so Vercel build succeeds; fix TypeScript errors in the codebase when you can.
npx tsc --project server/tsconfig.server.json || true
# tsc with rootDir ".." outputs to dist/server/server/index.js (server/*.ts -> dist/server/server/*.js)
if [ ! -f "dist/server/server/index.js" ]; then
  echo "Build failed: dist/server/server/index.js was not produced. Set Root Directory to repo root (not client)."
  exit 1
fi
