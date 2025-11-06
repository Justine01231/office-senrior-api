// src/routes/staff-dashboard.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, staffAssignments } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔥 STAFF DASHBOARD ROUTES LOADED');

export const staffDashboardRoutes = new Elysia({ prefix: '/api/staff' })
  .derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    
    const token = authorization.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      console.log('🔍 JWT Payload:', JSON.stringify(payload, null, 2));
      return { user: payload };
    } catch (error) {
      console.error('❌ JWT verification failed:', error);
      throw new Error('Invalid token');
    }
  })
  .get('/dashboard', async ({ user }) => {
    try {
      console.log(`📊 Staff dashboard requested by user ID: ${user.userId}`);
      
      // Verify user is staff
      if (user.role !== 'staff') {
        console.log(`❌ Access denied - user role: ${user.role}`);
        return {
          success: false,
          error: 'Access denied. Staff role required.'
        };
      }

      // Get staff's assigned seniors count (simple)
      const assignedSeniorsResult = await db
        .select({ count: count() })
        .from(staffAssignments)
        .innerJoin(users, eq(staffAssignments.seniorId, users.id))
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true),
            eq(users.isActive, true),
            eq(users.role, 'senior') // Only count active seniors
          )
        );

      const assignedSeniorsCount = assignedSeniorsResult[0]?.count || 0;

      // Get staff's assigned seniors details (only active seniors)
      const assignedSeniors = await db
        .select({
          seniorId: users.id,
          seniorUserId: users.id,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorEmail: users.email,
          seniorPhone: users.phone,
          seniorAddress: users.address,
          seniorDateOfBirth: users.dateOfBirth,
          seniorSocialSecurity: users.socialSecurity,
          seniorEmergencyContactName: users.emergencyContactName,
          seniorEmergencyContactPhone: users.emergencyContactPhone,
          seniorIsActive: users.isActive,
          assignedAt: staffAssignments.assignedAt,
          assignmentId: staffAssignments.id
        })
        .from(staffAssignments)
        .innerJoin(users, eq(staffAssignments.seniorId, users.id))
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true),
            eq(users.isActive, true),
            eq(users.role, 'senior') // Only include senior users
          )
        );

      // Calculate actual pending tasks using the same logic as pending-tasks.ts
      let pendingTasksCount = 0;
      
      for (const senior of assignedSeniors) {
        // Task 1: Missing phone number
        if (!senior.seniorPhone) {
          pendingTasksCount++;
        }
        
        // Task 2: Missing address
        if (!senior.seniorAddress) {
          pendingTasksCount++;
        }
        
        // Task 3: Missing emergency contact
        if (!senior.seniorEmergencyContactName || !senior.seniorEmergencyContactPhone) {
          pendingTasksCount++;
        }
        
        // Task 4: Health record follow-up (if assigned more than 7 days ago)
        const assignedDate = senior.assignedAt ? new Date(senior.assignedAt) : new Date();
        const daysSinceAssignment = Math.floor((new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceAssignment > 7) {
          pendingTasksCount++;
        }
        
        // Task 5: Medication review (for health coordinators, if assigned more than 14 days ago)
        if (user.position && user.position.toLowerCase().includes('health')) {
          if (daysSinceAssignment > 14) {
            pendingTasksCount++;
          }
        }
      }
      
      console.log(`📊 Calculated ${pendingTasksCount} actual pending tasks (was using placeholder calculation before)`);
      const pendingTasks = pendingTasksCount;

      console.log(`✅ Staff dashboard data retrieved for ${user.firstName} ${user.lastName}`);
      console.log(`📋 Assigned seniors: ${assignedSeniorsCount}, Pending tasks: ${pendingTasks}`);
      console.log(`🔍 Assigned seniors details:`, JSON.stringify(assignedSeniors, null, 2));
      
      // Debug: Show what we're returning to frontend
      const responseData = assignedSeniors.map(senior => ({
        id: senior.seniorId,
        seniorId: senior.seniorId, // Add this field for frontend compatibility
        userId: senior.seniorUserId,
        name: `${senior.seniorName} ${senior.seniorLastName}`,
        firstName: senior.seniorName,
        lastName: senior.seniorLastName,
        email: senior.seniorEmail,
        phone: senior.seniorPhone,
        address: senior.seniorAddress,
        dateOfBirth: senior.seniorDateOfBirth,
        socialSecurity: senior.seniorSocialSecurity,
        emergencyContactName: senior.seniorEmergencyContactName,
        emergencyContactPhone: senior.seniorEmergencyContactPhone,
        isActive: senior.seniorIsActive,
        assignedAt: senior.assignedAt,
        assignmentId: senior.assignmentId
      }));
      console.log(`🔍 Response data for frontend:`, JSON.stringify(responseData, null, 2));

      return {
        success: true,
        dashboard: {
          staffInfo: {
            id: user.userId,
            name: `${user.firstName} ${user.lastName}`,
            position: user.position,
            email: user.email
          },
          statistics: {
            assignedSeniors: assignedSeniorsCount,
            pendingTasks: pendingTasks,
            completedTasks: 0 // Placeholder
          },
          assignedSeniors: assignedSeniors.map(senior => ({
            id: senior.seniorId,
            seniorId: senior.seniorId, // Add this field for frontend compatibility
            userId: senior.seniorUserId,
            name: `${senior.seniorName} ${senior.seniorLastName}`,
            firstName: senior.seniorName,
            lastName: senior.seniorLastName,
            email: senior.seniorEmail,
            phone: senior.seniorPhone,
            address: senior.seniorAddress,
            dateOfBirth: senior.seniorDateOfBirth,
            socialSecurity: senior.seniorSocialSecurity,
            emergencyContactName: senior.seniorEmergencyContactName,
            emergencyContactPhone: senior.seniorEmergencyContactPhone,
            isActive: senior.seniorIsActive,
            assignedAt: senior.assignedAt,
            assignmentId: senior.assignmentId
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error fetching staff dashboard:', error);
      return {
        success: false,
        error: 'Failed to fetch dashboard data'
      };
    }
  })
  .get('/assigned-seniors', async ({ user }) => {
    try {
      console.log(`👥 Assigned seniors requested by staff ID: ${user.userId}`);
      
      // Verify user is staff
      if (user.role !== 'staff') {
        return {
          success: false,
          error: 'Access denied. Staff role required.'
        };
      }

      // Get detailed assigned seniors information
      const assignedSeniors = await db
        .select({
          assignmentId: staffAssignments.id,
          seniorId: users.id,
          seniorUserId: users.id,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorEmail: users.email,
          seniorPhone: users.phone,
          seniorDateOfBirth: users.dateOfBirth,
          seniorAddress: users.address,
          assignedAt: staffAssignments.assignedAt,
          isActive: staffAssignments.isActive
        })
        .from(staffAssignments)
        .innerJoin(users, eq(staffAssignments.seniorId, users.id))
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true),
            eq(users.isActive, true),
            eq(users.role, 'senior') // Only include senior users
          )
        );

      console.log(`✅ Found ${assignedSeniors.length} assigned seniors for staff ${user.firstName}`);

      return {
        success: true,
        assignedSeniors: assignedSeniors.map(senior => ({
          assignmentId: senior.assignmentId,
          senior: {
            id: senior.seniorId,
            userId: senior.seniorUserId,
            name: `${senior.seniorName} ${senior.seniorLastName}`,
            firstName: senior.seniorName,
            lastName: senior.seniorLastName,
            email: senior.seniorEmail,
            phone: senior.seniorPhone,
            dateOfBirth: senior.seniorDateOfBirth,
            address: senior.seniorAddress
          },
          assignedAt: senior.assignedAt,
          isActive: senior.isActive
        }))
      };

    } catch (error) {
      console.error('❌ Error fetching assigned seniors:', error);
      return {
        success: false,
        error: 'Failed to fetch assigned seniors'
      };
    }
  });
