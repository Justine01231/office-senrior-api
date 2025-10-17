// src/routes/users.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { AuthService } from '../services/auth';
import * as jwt from 'jsonwebtoken';

export const usersRoutes = new Elysia({ prefix: '/api/users' })
  .derive(({ headers }) => {
    console.log('🔍 Direct auth check in users route');
    console.log('📋 Headers received:', headers);
    
    const authHeader = headers.authorization;
    console.log('🔑 Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return { user: null };
    }
    
    const token = authHeader.substring(7);
    console.log('🎫 Token extracted:', token.substring(0, 20) + '...');
    
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';
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
  })
  
  // GET current user profile
  .get('/profile', async (context: any) => {
    try {
      const { user, set } = context;
      if (!user) {
        set.status = 401;
        throw new Error('Authentication required');
      }
    
    const userProfile = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1);
    
    if (!userProfile.length) {
      throw new Error('User not found');
    }
    
      return {
        success: true,
        data: userProfile[0]
      };
    } catch (error: any) {
      console.error('Get profile error:', error);
      context.set.status = 500;
      return {
        success: false,
        message: error?.message || 'Failed to get profile'
      };
    }
  })
  
  // PUT update user profile
  .put('/profile', async (context: any) => {
    const { body, user } = context;
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Check if email is already taken by another user
    if (body.email) {
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      
      if (existingUser.length && existingUser[0]?.id !== user.userId) {
        throw new Error('Email is already taken');
      }
    }
    
    const updatedUser = await db.update(users)
      .set({
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.userId))
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role
      });
    
    if (!updatedUser.length) {
      throw new Error('Failed to update profile');
    }
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser[0]
    };
  }, {
    body: t.Object({
      firstName: t.String({ minLength: 1 }),
      lastName: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' })
    })
  })
  
  // PUT change password
  .put('/password', async (context: any) => {
    try {
      console.log('🔍 Password change route called');
      console.log('📋 Full context keys:', Object.keys(context));
      console.log('👤 User from context:', context.user);
      console.log('📝 Headers:', context.headers);
      
      const { body, user, set } = context;
      if (!user) {
        console.log('❌ No user found in context');
        set.status = 401;
        throw new Error('Authentication required');
      }
    
    // Get current user with password
    const currentUser = await db.select()
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);
    
    if (!currentUser.length) {
      throw new Error('User not found');
    }
    
    // Verify current password using proper password verification
    const userPasswordHash = currentUser[0]?.passwordHash;
    if (!userPasswordHash) {
      throw new Error('User password not found');
    }
    
    const isCurrentPasswordValid = await AuthService.verifyPassword(body.currentPassword, userPasswordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash the new password properly
    const hashedNewPassword = await AuthService.hashPassword(body.newPassword);
    
    // Update password in database
    await db.update(users)
      .set({
        passwordHash: hashedNewPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.userId));
    
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      context.set.status = 500;
      return {
        success: false,
        message: error?.message || 'Failed to change password'
      };
    }
  }, {
    body: t.Object({
      currentPassword: t.String({ minLength: 1 }),
      newPassword: t.String({ minLength: 6 })
    })
  });
