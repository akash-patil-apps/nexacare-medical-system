/**
 * Single source for JWT_SECRET so local and Vercel stay in sync.
 * Trims the value so trailing newlines/spaces in env don't cause "invalid signature".
 */
import { config } from 'dotenv';
config(); // ensure .env is loaded before reading JWT_SECRET

const DEFAULT_JWT_SECRET = 'your-secret-key';

export function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET;
  if (raw == null || String(raw).trim() === '') return DEFAULT_JWT_SECRET;
  return String(raw).trim();
}
