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

    // Only check module access for seniors
    if (user.role !== 'senior') {
      console.log('✅ Non-senior user - full access');
      return { hasModuleAccess: true, moduleAccessReason: 'Admin/Staff access' };
    }

    // Determine module from request URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const module = pathParts[2]; // /api/[module]/...
    
    console.log('📍 Checking access for module:', module);
    
    // Validate module exists
    if (!module) {
      console.log('❌ No module found in URL path');
      return { hasModuleAccess: false, moduleAccessReason: 'Invalid module path' };
    }
    
    // Check if senior has staff assignment for this module
    const hasAccess = await checkModuleAccess(user.seniorId, module);
    
    console.log('🎯 Module access result:', hasAccess);
    
    return { 
      hasModuleAccess: hasAccess.allowed, 
      moduleAccessReason: hasAccess.reason 
    };
  });

async function checkModuleAccess(seniorId: number, module: string): Promise<{allowed: boolean, reason: string}> {
  try {
    console.log(`🔍 Checking access for senior ${seniorId} to module ${module}`);
    
    // Get senior's staff assignment
    const assignment = await db.select({
      staffId: staffAssignments.staffId,
      staffPosition: users.position,
      isActive: staffAssignments.isActive
    })
    .from(staffAssignments)
    .innerJoin(users, eq(staffAssignments.staffId, users.id))
    .where(
      and(
        eq(staffAssignments.seniorId, seniorId),
        eq(staffAssignments.isActive, true)
      )
    )
    .limit(1);

    if (!assignment.length) {
      console.log('❌ No active staff assignment found');
      return { allowed: false, reason: 'No staff assignment' };
    }

    const staffPosition = assignment[0]?.staffPosition;
    console.log('👨‍⚕️ Staff position:', staffPosition);

    if (!staffPosition) {
      console.log('❌ No staff position found');
      return { allowed: false, reason: 'Staff position not defined' };
    }

    // Module-specific access control based on staff position
    const moduleAccess = getModuleAccessByPosition(module, staffPosition);
    
    console.log(`🎯 Access result for ${module}: ${moduleAccess.allowed} - ${moduleAccess.reason}`);
    return moduleAccess;
    
  } catch (error) {
    console.error('❌ Error checking module access:', error);
    return { allowed: false, reason: 'Access check failed' };
  }
}

function getModuleAccessByPosition(module: string, staffPosition: string): {allowed: boolean, reason: string} {
  // Always allow profile access
  if (module === 'profile') {
    return { allowed: true, reason: 'Profile always accessible' };
  }

  // Module access based on staff position
  switch (module) {
    case 'health':
      // Health module accessible to Health Coordinators, Doctors, Nurses
      const healthPositions = ['Health Coordinator', 'Doctor', 'Nurse', 'Medical Assistant'];
      const hasHealthAccess = healthPositions.some(pos => 
        staffPosition.toLowerCase().includes(pos.toLowerCase())
      );
      return { 
        allowed: hasHealthAccess, 
        reason: hasHealthAccess ? `Health access via ${staffPosition}` : `${staffPosition} cannot access health records`
      };

    case 'benefits':
      // Benefits module accessible to Social Workers, Benefits Coordinators
      const benefitsPositions = ['Social Worker', 'Benefits Coordinator', 'Case Manager'];
      const hasBenefitsAccess = benefitsPositions.some(pos => 
        staffPosition.toLowerCase().includes(pos.toLowerCase())
      );
      return { 
        allowed: hasBenefitsAccess, 
        reason: hasBenefitsAccess ? `Benefits access via ${staffPosition}` : `${staffPosition} cannot access benefits`
      };

    case 'programs':
      // Programs module accessible to Program Coordinators, Activity Directors
      const programsPositions = ['Program Coordinator', 'Activity Director', 'Community Outreach'];
      const hasProgramsAccess = programsPositions.some(pos => 
        staffPosition.toLowerCase().includes(pos.toLowerCase())
      );
      return { 
        allowed: hasProgramsAccess, 
        reason: hasProgramsAccess ? `Programs access via ${staffPosition}` : `${staffPosition} cannot access programs`
      };

    case 'contacts':
      // Contacts module accessible to Social Workers, Case Managers
      const contactsPositions = ['Social Worker', 'Case Manager', 'Family Liaison'];
      const hasContactsAccess = contactsPositions.some(pos => 
        staffPosition.toLowerCase().includes(pos.toLowerCase())
      );
      return { 
        allowed: hasContactsAccess, 
        reason: hasContactsAccess ? `Contacts access via ${staffPosition}` : `${staffPosition} cannot access contacts`
      };

    default:
      // Default: no access to unknown modules
      return { allowed: false, reason: `No access rules defined for ${module}` };
  }
}

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
