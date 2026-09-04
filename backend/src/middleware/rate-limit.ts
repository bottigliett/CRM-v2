import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * @param windowMs - Time window in milliseconds
 * @param maxRequests - Max requests per window per IP
 */
export function rateLimit(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.baseUrl}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Troppe richieste. Riprova più tardi.',
      });
    }

    next();
  };
}

// Presets
// ponytail: global lock per IP, per-route buckets if needed
export const authLimiter = rateLimit(15 * 60 * 1000, 20); // 20 requests per 15 min
export const loginLimiter = rateLimit(15 * 60 * 1000, 10); // 10 login attempts per 15 min
export const activationLimiter = rateLimit(15 * 60 * 1000, 10); // 10 activation attempts per 15 min
