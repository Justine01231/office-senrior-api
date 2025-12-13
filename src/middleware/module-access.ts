// src/middleware/module-access.ts
import { Elysia } from 'elysia';
import { db } from '../db';
import { staffAssignments, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const moduleAccessMiddleware = new Elysia()
  .derive(async (context: any) => {
    const { user, request } = context;
    console.log('🔒 Module access middleware called');
    console.log('👤 User:', user);
    
    if (!user) {
      console.log('❌ No user - access denied');
      return { hasModuleAccess: false, moduleAccessReason: 'Not authenticated' };
    }

    // All authenticated users (admin, staff, senior) have full access to all modules
    console.log('✅ Authenticated user - full access granted');
    return { hasModuleAccess: true, moduleAccessReason: 'Authenticated user access' };
  });

// Helper function to require module access
export const requireModuleAccess = new Elysia()
  .use(moduleAccessMiddleware)
  .onBeforeHandle(({ hasModuleAccess, moduleAccessReason, set }: any) => {
    if (!hasModuleAccess) {
      console.log('🚫 Module access denied:', moduleAccessReason);
      set.status = 403;
      return {
        success: false,
        error: 'Access denied',
        message: moduleAccessReason
      };
    }
    console.log('✅ Module access granted:', moduleAccessReason);
  });
