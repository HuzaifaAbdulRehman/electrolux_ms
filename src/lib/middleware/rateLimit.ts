import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { requests: number[], windowStart: number }>();

// Configuration for different endpoints
const RATE_LIMITS = {
  '/api/auth/register': { requests: 3, windowMs: 60000 }, // 3 requests per minute
  '/api/auth/login': { requests: 5, windowMs: 60000 }, // 5 requests per minute
  '/api/bills': { requests: 30, windowMs: 60000 }, // 30 requests per minute
  '/api/payments': { requests: 10, windowMs: 60000 }, // 10 requests per minute
  '/api/customers': { requests: 60, windowMs: 60000 }, // 60 requests per minute
  default: { requests: 100, windowMs: 60000 }, // 100 requests per minute
};

export function getRateLimitConfig(pathname: string) {
  // Find matching rate limit config
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (path === 'default') continue;
    if (pathname.startsWith(path)) {
      return config;
    }
  }
  return RATE_LIMITS.default;
}

export function checkRateLimit(
  identifier: string,
  pathname: string
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const config = getRateLimitConfig(pathname);

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    entry = {
      requests: [now],
      windowStart: now
    };
    rateLimitStore.set(identifier, entry);

    return {
      allowed: true,
      remaining: config.requests - 1,
      resetAt: new Date(now + config.windowMs)
    };
  }

  // Filter out old requests
  entry.requests = entry.requests.filter(
    timestamp => now - timestamp < config.windowMs
  );

  if (entry.requests.length >= config.requests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.windowStart + config.windowMs)
    };
  }

  // Add current request
  entry.requests.push(now);

  return {
    allowed: true,
    remaining: config.requests - entry.requests.length,
    resetAt: new Date(entry.windowStart + config.windowMs)
  };
}

// Middleware function for API routes
export async function rateLimitMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  // Get identifier (IP address or user ID)
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  const identifier = `ip:${ip}`;
  const pathname = request.nextUrl.pathname;

  const { allowed, remaining, resetAt } = checkRateLimit(identifier, pathname);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please wait before making another request',
        resetAt: resetAt.toISOString()
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(getRateLimitConfig(pathname).requests),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': resetAt.toISOString(),
          'Retry-After': String(Math.ceil((resetAt.getTime() - Date.now()) / 1000))
        }
      }
    );
  }

  // Request allowed - return null to continue
  return null;
}

// Clean up old entries periodically (every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.windowStart > 300000) { // 5 minutes
        rateLimitStore.delete(key);
      }
    }
  }, 300000);
}

