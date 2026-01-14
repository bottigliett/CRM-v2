import { Request, Response, NextFunction } from 'express';

/**
 * Debug middleware to log request details
 */
export const debugLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log('='.repeat(80));
  console.log(`[DEBUG] ${new Date().toISOString()}`);
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  console.log(`[DEBUG] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`[DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[DEBUG] Body:`, JSON.stringify(req.body, null, 2));
  console.log(`[DEBUG] Query:`, JSON.stringify(req.query, null, 2));
  console.log('='.repeat(80));

  next();
};
