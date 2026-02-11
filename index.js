/**
 * Vercel entry for Express backend.
 * After build (npm run build:server), tsc outputs to dist/server/server/ (rootDir "..").
 */
import app from './dist/server/server/index.js';
export default app;
