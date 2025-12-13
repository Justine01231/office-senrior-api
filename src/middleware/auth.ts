// src/middleware/auth.ts
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';
import { Environment } from '../config/environment';

// Use the same JWT secret as the auth routes to keep token signing and
// verification in sync. Environment.JWT_SECRET already validates presence
// and minimum length, so we don't fall back to a different hardcoded key.
const JWT_SECRET = Environment.JWT_SECRET;

export const authMiddleware = new Elysia()
  .derive(({ headers }) => {
    console.log('🔍 Auth middleware called');
    console.log('📋 Headers:', headers);
    
    const authHeader = headers.authorization;
    console.log('🔑 Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return { user: null };
    }
    
    const token = authHeader.substring(7);
    console.log('🎫 Token extracted:', token.substring(0, 20) + '...');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ JWT verified successfully:', decoded);
      console.log('🔍 Decoded role specifically:', decoded.role, 'type:', typeof decoded.role);
      
      const user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email || null,
        role: decoded.role,
        seniorId: decoded.seniorId || null,
        id: decoded.userId // Add id field for compatibility
      };
      
      console.log('👤 User object created:', user);
      console.log('🔍 Final user role:', user.role, 'type:', typeof user.role);
      return { user };
    } catch (error: any) {
      console.log('❌ JWT verification failed:', error?.message);
      return { user: null };
    }
  });
