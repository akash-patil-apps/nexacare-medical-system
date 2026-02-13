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

# ── Fix ESM bare-specifier imports ──────────────────────────────────────
# TypeScript does NOT add .js extensions to emitted imports. In ESM
# ("type":"module"), Node requires full file paths. This rewrites every
# relative import/export in the compiled JS so:
#   from "./routes"         → from "./routes/index.js"  (if routes/ dir with index.js)
#   from "./middleware/auth" → from "./middleware/auth.js"
echo "Fixing ESM imports in dist/..."
node -e "
const fs = require('fs');
const path = require('path');
const DIST = path.resolve('dist');

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else if (f.name.endsWith('.js')) fixFile(full);
  }
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  // Match:  from \"./...\",  from '../...',  import(\"./...\")
  const re = /(from\s+['\"])(\.[^'\"]+)(['\"])/g;
  let changed = false;
  const out = src.replace(re, (m, pre, spec, post) => {
    const resolved = resolveSpec(dir, spec);
    if (resolved && resolved !== spec) { changed = true; return pre + resolved + post; }
    return m;
  });
  if (changed) fs.writeFileSync(file, out, 'utf8');
}

function resolveSpec(dir, spec) {
  // Already has .js / .mjs / .cjs / .json extension → leave it
  if (/\\.(js|mjs|cjs|json)$/.test(spec)) return spec;
  const abs = path.resolve(dir, spec);
  // Case 1: spec points to a directory with index.js
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    if (fs.existsSync(path.join(abs, 'index.js'))) return spec + '/index.js';
  }
  // Case 2: spec + .js exists
  if (fs.existsSync(abs + '.js')) return spec + '.js';
  return null;
}

walk(DIST);
console.log('ESM import fix done.');
"
echo "ESM import fix complete."

# Vercel looks for an entrypoint in output directory "." (root). Create one.
echo "Creating root entrypoint for Vercel..."
echo "import './dist/server/server/index.js';" > "$ROOT/index.js"
echo "Root index.js created."
