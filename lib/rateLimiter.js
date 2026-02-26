/**
 * Rate Limiting Middleware
 *
 * Provides rate limiting functionality for API routes using fixed window strategy.
 * Configurable per endpoint type with different rate limits.
 */

import { NextResponse } from 'next/server';

// Rate limit configurations per endpoint type
const RATE_LIMITS = {
  // General API endpoints - 100 requests per minute
  general: {
    max: 100,
    window: 60 * 1000, // 1 minute
    message: 'Too many requests from this IP, please try again later.',
  },
  // Authentication endpoints - 10 requests per minute
  auth: {
    max: 10,
    window: 60 * 1000, // 1 minute
    message: 'Too many login attempts, please try again later.',
  },
  // Recording upload endpoints - 5 requests per 5 minutes
  upload: {
    max: 5,
    window: 5 * 60 * 1000, // 5 minutes
    message: 'Too many recording uploads, please try again later.',
  },
  // Twilio webhook endpoints - 20 requests per minute
  webhook: {
    max: 20,
    window: 60 * 1000, // 1 minute
    message: 'Too many webhook requests, please try again later.',
  },
};

// Store for rate limit counters (in production, use Redis)
const rateLimitStore = new Map();

/**
 * Get rate limit key for IP address and endpoint type
 */
function getRateLimitKey(ip, type) {
  return `${ip}:${type}`;
}

/**
 * Check if request is within rate limits
 */
function checkRateLimit(ip, type = 'general') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.general;
  const key = getRateLimitKey(ip, type);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry) {
    entry = {
      count: 0,
      windowStart: now,
    };
  }

  // Check if window has expired
  if (now - entry.windowStart > config.window) {
    entry = {
      count: 0,
      windowStart: now,
    };
  }

  // Check if rate limit exceeded
  if (entry.count >= config.max) {
    const windowEnd = entry.windowStart + config.window;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);

    return {
      allowed: false,
      retryAfter,
      message: config.message,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.max - entry.count,
    reset: entry.windowStart + config.window,
  };
}

/**
 * Rate limit middleware for Next.js API routes
 */
export function withRateLimit(type = 'general') {
  return function middlewareHandler(handler) {
    return async function wrappedHandler(request, ...args) {
      // Get IP address from request (handle proxies)
      let ip =
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

      // If multiple IPs in x-forwarded-for, use first one
      if (ip.includes(',')) {
        ip = ip.split(',')[0].trim();
      }

      // Check rate limit
      const rateLimitResult = checkRateLimit(ip, type);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: rateLimitResult.message,
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter.toString(),
            },
          }
        );
      }

      // Proceed with request
      const response = await handler(request, ...args);

      // Add rate limit headers
      response.headers.set(
        'X-RateLimit-Limit',
        (RATE_LIMITS[type] || RATE_LIMITS.general).max.toString()
      );
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.reset / 1000).toString());

      return response;
    };
  };
}

/**
 * Helper to get client IP address from request
 */
export function getClientIP(request) {
  let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  return ip;
}

// Pre-configured middleware for common endpoint types
export const rateLimitAuth = withRateLimit('auth');
export const rateLimitUpload = withRateLimit('upload');
export const rateLimitWebhook = withRateLimit('webhook');
export const rateLimitGeneral = withRateLimit('general');

export default withRateLimit;
