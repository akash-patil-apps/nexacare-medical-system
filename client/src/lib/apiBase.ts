/**
 * API base URL for production (e.g. Vercel). Empty string = same origin (dev proxy).
 * Set VITE_API_BASE_URL in Vercel env to your backend URL (e.g. https://api.yourdomain.com).
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? '';
export const apiUrl = (path: string): string =>
  path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
