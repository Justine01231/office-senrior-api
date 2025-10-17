// src/middleware/auth.ts
import { Elysia } from 'elysia';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

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
      
      const user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        seniorId: decoded.seniorId
      };
      
      console.log('👤 User object created:', user);
      return { user };
    } catch (error: any) {
      console.log('❌ JWT verification failed:', error?.message);
      return { user: null };
    }
  });
