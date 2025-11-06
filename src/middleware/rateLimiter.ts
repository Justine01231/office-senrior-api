// src/middleware/rateLimiter.ts
import { Elysia } from 'elysia';
import { Environment } from '../config/environment';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = Environment.RATE_LIMIT_WINDOW, maxRequests: number = Environment.RATE_LIMIT_MAX) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      if (entry && entry.resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getClientKey(request: Request): string {
    // Try to get real IP from headers (for reverse proxy setups)
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded !== null && forwarded !== undefined) {
      const trimmedForwarded = forwarded.trim();
      if (trimmedForwarded.length > 0) {
        const firstIp = trimmedForwarded.split(',')[0];
        return firstIp ? firstIp.trim() : 'unknown';
      }
    }
    
    if (realIp !== null && realIp !== undefined) {
      const trimmedRealIp = realIp.trim();
      if (trimmedRealIp.length > 0) {
        return trimmedRealIp;
      }
    }
    
    // Fallback to connection info (may not be available in all environments)
    return 'unknown';
  }

  checkLimit(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const clientKey = this.getClientKey(request);
    const now = Date.now();
    
    const existingEntry = this.store[clientKey];
    
    if (!existingEntry || existingEntry.resetTime < now) {
      // First request or window expired
      this.store[clientKey] = {
        count: 1,
        resetTime: now + this.windowMs
      };
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }
    
    // Increment count
    existingEntry.count++;
    
    const remaining = Math.max(0, this.maxRequests - existingEntry.count);
    const allowed = existingEntry.count <= this.maxRequests;
    
    return {
      allowed,
      remaining,
      resetTime: existingEntry.resetTime
    };
  }

  // Getter method to access maxRequests from outside the class
  getMaxRequests(): number {
    return this.maxRequests;
  }
}

// Create rate limiter instances
const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
const authLimiter = new RateLimiter(15 * 60 * 1000, 20);     // 20 auth requests per 15 minutes
const strictLimiter = new RateLimiter(60 * 1000, 10);        // 10 requests per minute for sensitive endpoints

export const rateLimitMiddleware = (limiter: RateLimiter = generalLimiter) => {
  return new Elysia()
    .derive(({ request, set }) => {
      const result = limiter.checkLimit(request);
      
      // Add rate limit headers
      set.headers['X-RateLimit-Limit'] = limiter.getMaxRequests().toString();
      set.headers['X-RateLimit-Remaining'] = result.remaining.toString();
      set.headers['X-RateLimit-Reset'] = Math.ceil(result.resetTime / 1000).toString();
      
      if (!result.allowed) {
        set.status = 429;
        throw new Error('Too Many Requests');
      }
      
      return {};
    });
};

// Export specific limiters
export const authRateLimit = rateLimitMiddleware(authLimiter);
export const strictRateLimit = rateLimitMiddleware(strictLimiter);
export const generalRateLimit = rateLimitMiddleware(generalLimiter);
