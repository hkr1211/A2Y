import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Store for tracking rate limit violations
const violationStore = new Map<string, { count: number; lastViolation: Date }>();

// Custom rate limit handler
const rateLimitHandler = (req: Request, res: Response) => {
  const clientId = req.ip || 'unknown';
  const violation = violationStore.get(clientId) || { count: 0, lastViolation: new Date() };
  
  violation.count += 1;
  violation.lastViolation = new Date();
  violationStore.set(clientId, violation);
  
  // Log security event
  console.warn(`Rate limit exceeded for IP: ${clientId}, violations: ${violation.count}`);
  
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
      retryAfter: 60
    },
    timestamp: new Date().toISOString()
  });
};

// Safe key generator that handles IPv6
const safeKeyGenerator = (req: Request, useUserId = false) => {
  if (useUserId) {
    const userId = (req as any).user?.userId;
    if (userId) return userId;
  }
  return req.ip || 'anonymous';
};

// General API rate limiter
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => safeKeyGenerator(req, true)
});

// Strict rate limiter for authentication endpoints
// 临时增加开发环境的限制次数
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'development' ? 100 : 10, // 开发环境放宽到100次
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req: Request) => safeKeyGenerator(req),
  skip: (req: Request) => {
    // Skip rate limiting for localhost during development
    return process.env.NODE_ENV === 'development' && (req.ip === '127.0.0.1' || req.ip === '::1');
  }
});

// File upload rate limiter
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each user to 50 file uploads per hour
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => safeKeyGenerator(req, true)
});

// Chat message rate limiter
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each user to 30 messages per minute
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => safeKeyGenerator(req, true)
});

// Translation API rate limiter
export const translationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each user to 20 translations per minute
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => safeKeyGenerator(req, true)
});

// Admin operations rate limiter
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Higher limit for admin operations
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => safeKeyGenerator(req, true)
});

// Cleanup function to remove old violation records
export const cleanupViolationStore = () => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  for (const [key, violation] of violationStore.entries()) {
    if (violation.lastViolation < oneHourAgo) {
      violationStore.delete(key);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupViolationStore, 60 * 60 * 1000);

// Export violation store for monitoring
export { violationStore };