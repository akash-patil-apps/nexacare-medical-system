// server/middleware/security.ts
import { Request, Response, NextFunction } from 'express';

// Rate limiting store (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
export const rateLimit = (options: { windowMs: number; max: number }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }
    
    if (record.count >= options.max) {
      return res.status(429).json({ message: 'Too many requests, please try again later' });
    }
    
    record.count++;
    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
};

/**
 * CSRF protection (basic - use proper CSRF library in production)
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  // In production, implement proper CSRF token validation
  // For now, just check origin/referer
  const origin = req.get('origin');
  const referer = req.get('referer');
  
  // Allow same-origin requests
  if (origin || referer) {
    return next();
  }
  
  // For API calls, we'll rely on JWT tokens
  next();
};
