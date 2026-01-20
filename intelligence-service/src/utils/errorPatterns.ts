import { ErrorPattern } from '../types/errors';

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Database
  {
    pattern: /ECONNREFUSED.*5432|Connection.*refused.*postgres|PrismaClientInitializationError/i,
    severity: 'critical',
    category: 'database',
  },
  {
    pattern: /prisma.*migration.*failed|schema.*mismatch/i,
    severity: 'high',
    category: 'database',
  },
  {
    pattern: /deadlock detected|lock timeout|connection pool exhausted/i,
    severity: 'high',
    category: 'database',
  },

  // Auth
  {
    pattern: /jwt.*expired|invalid.*token|JsonWebTokenError/i,
    severity: 'medium',
    category: 'auth',
  },
  {
    pattern: /unauthorized|authentication.*failed|invalid credentials/i,
    severity: 'medium',
    category: 'auth',
  },

  // CORS
  {
    pattern: /CORS.*blocked|Access-Control-Allow-Origin/i,
    severity: 'high',
    category: 'network',
  },

  // Puppeteer/Scraper
  {
    pattern: /puppeteer.*timeout|navigation.*timeout|TimeoutError/i,
    severity: 'medium',
    category: 'scraper',
  },
  {
    pattern: /Failed to launch.*browser|chromium.*not found/i,
    severity: 'critical',
    category: 'scraper',
  },

  // Memory
  {
    pattern: /ENOMEM|heap out of memory|JavaScript heap out of memory/i,
    severity: 'critical',
    category: 'performance',
  },

  // Rate limits
  {
    pattern: /rate limit.*exceeded|too many requests|429|quota exceeded/i,
    severity: 'medium',
    category: 'api',
  },

  // Network
  {
    pattern: /ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up/i,
    severity: 'medium',
    category: 'network',
  },

  // File system
  {
    pattern: /ENOENT.*no such file|EACCES.*permission denied/i,
    severity: 'medium',
    category: 'filesystem',
  },

  // General errors
  {
    pattern: /uncaught exception|unhandled rejection|fatal error/i,
    severity: 'high',
    category: 'general',
  },

  // Catch-all for any line with "error" (low severity as it's broad)
  {
    pattern: /error/i,
    severity: 'low',
    category: 'general',
  },
];

export function matchErrorPattern(message: string): ErrorPattern | null {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(message)) {
      return pattern;
    }
  }
  return null;
}

export function generateErrorSignature(message: string, category: string): string {
  // Extract key parts of the error message to create a unique signature
  const normalized = message
    .toLowerCase()
    .replace(/\d+/g, 'N') // Replace numbers with N
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .substring(0, 100); // Limit length

  return `${category}-${normalized}`;
}
