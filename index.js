/**
 * Vercel entry for Express backend.
 * After build (npm run build:server), tsc outputs to dist/server/server/ (rootDir "..").
 *
 * NOTE: The "import express" line is required so Vercel's Express framework
 * detection recognises this file as the entrypoint. Without it the build
 * fails with "No entrypoint found which imports express".
 */
import express from 'express';          // keep — Vercel entrypoint detection
import app from './dist/server/server/index.js';
export default app;
