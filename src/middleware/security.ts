// src/middleware/security.ts
import { Elysia } from 'elysia';
import { Environment } from '../config/environment';

export const securityMiddleware = new Elysia()
  .derive(({ request, set }) => {
    // Security headers
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.headers['X-Frame-Options'] = 'DENY';
    set.headers['X-XSS-Protection'] = '1; mode=block';
    set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
    
    if (Environment.NODE_ENV === 'production') {
      set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
    
    // Request size validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      set.status = 413;
      throw new Error('Request entity too large');
    }
    
    // Content-Type validation for POST/PUT requests
    const method = request.method;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = request.headers.get('content-type');
      // Only validate if there's a body (content-length > 0)
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 0) {
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('⚠️ Invalid Content-Type:', contentType, 'for method:', method);
          set.status = 415;
          throw new Error('Unsupported Media Type. Expected application/json');
        }
      }
    }
    
    return {};
  });

// CORS configuration with security considerations
export const corsConfig = {
  origin: true, // Allow all origins for now - can be restricted later
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining', 
    'X-RateLimit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

// Input sanitization middleware
export const sanitizationMiddleware = new Elysia()
  .derive(async ({ request }) => {
    // Only process JSON requests
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {};
    }
    
    try {
      // Clone the request to read body
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      
      // Basic sanitization
      const sanitizeValue = (value: any): any => {
        if (typeof value === 'string') {
          return value
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, ''); // Remove event handlers
        }
        if (typeof value === 'object' && value !== null) {
          const sanitized: any = {};
          for (const [key, val] of Object.entries(value)) {
            sanitized[key] = sanitizeValue(val);
          }
          return sanitized;
        }
        return value;
      };
      
      return { sanitizedBody: sanitizeValue(body) };
    } catch (error) {
      // If body parsing fails, continue without sanitization
      return {};
    }
  });
