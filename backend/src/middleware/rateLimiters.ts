import rateLimit from 'express-rate-limit';

// Base rate limiter configuration with standard headers
const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string
) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers
    message: {
      success: false,
      error: message,
      retryAfter: 'Check Retry-After header for when to retry',
    },
  });
};

// Auth routes: Strict limit to prevent brute force attacks
// 10 requests per 15 minutes per IP
export const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts. Please try again later.'
);

// Read-heavy routes: Generous limit for browsing restaurants, viewing leaderboard
// 300 requests per 15 minutes per IP
export const readLimiter = createRateLimiter(
  15 * 60 * 1000,
  300,
  'Too many requests. Please slow down and try again in a moment.'
);

// Write routes: Moderate limit for creating/updating visits, profile updates
// 100 requests per 15 minutes per IP
export const writeLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests. Please wait a moment before trying again.'
);

// Admin routes: Very generous limit for admin operations
// 1000 requests per 15 minutes per IP
export const adminLimiter = createRateLimiter(
  15 * 60 * 1000,
  1000,
  'Too many admin requests. Please try again later.'
);

// Global fallback limiter: Very generous limit as a safety net
// 500 requests per 15 minutes per IP (applies to routes without specific limiters)
export const globalLimiter = createRateLimiter(
  15 * 60 * 1000,
  500,
  'Too many requests. Please try again later.'
);
