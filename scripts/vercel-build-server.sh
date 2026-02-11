#!/usr/bin/env bash
# Run server build from repo root. Works whether cwd is repo root or client/.
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
npx tsc --project server/tsconfig.server.json
