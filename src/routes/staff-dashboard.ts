// src/routes/staff-dashboard.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, staffAssignments, healthRecords } from '../db/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';
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
      console.log(`🏠 [DASHBOARD] GET /api/staff/dashboard - User: ${user.username} (ID: ${user.userId}) - Loading dashboard`);
      console.log(`👤 [DASHBOARD] Staff Details: ${user.firstName} ${user.lastName}, Role: ${user.role}`);
      
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
        
        // Task 5: Medication review (for all staff, if assigned more than 14 days ago)
        if (daysSinceAssignment > 14) {
          pendingTasksCount++;
        }
      }
      
      console.log(`📊 Calculated ${pendingTasksCount} actual pending tasks (was using placeholder calculation before)`);
      const pendingTasks = pendingTasksCount;

      console.log(`✅ [DASHBOARD] Dashboard data loaded successfully for ${user.firstName} ${user.lastName}`);
      console.log(`📊 [DASHBOARD] Statistics: ${assignedSeniorsCount} assigned seniors, ${pendingTasks} pending tasks`);
      console.log(`👥 [DASHBOARD] My Seniors List: ${assignedSeniors.map(s => `${s.seniorName} ${s.seniorLastName}`).join(', ')}`);
      console.log(`🔍 [DASHBOARD] Full assigned seniors data:`, JSON.stringify(assignedSeniors, null, 2));
      
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
  })
  
  // Get recent activities for staff
  .get('/recent-activities', async ({ user, query }) => {
    try {
      console.log(`📋 Recent activities requested by staff ID: ${user.userId}`);
      
      // Always return 3 recent activities (ignore any limit parameter from frontend)
      const limitNum = 3;
      
      // Get staff's assigned seniors
      const assignedSeniors = await db
        .select({ seniorId: staffAssignments.seniorId })
        .from(staffAssignments)
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true)
          )
        );
      
      if (assignedSeniors.length === 0) {
        console.log('📋 No assigned seniors found for staff');
        return {
          success: true,
          data: {
            activities: []
          }
        };
      }
      
      const seniorIds = assignedSeniors.map(s => s.seniorId);
      console.log('👥 Getting activities for seniors:', seniorIds);
      
      // Get recent health records as activities
      console.log('🔍 Querying health records for seniors:', seniorIds);
      const recentActivities = await db
        .select({
          id: healthRecords.id,
          type: healthRecords.type,
          title: healthRecords.title,
          description: healthRecords.description,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          createdAt: healthRecords.createdAt,
          status: healthRecords.status,
          // Additional fields for different activity types
          medicineName: healthRecords.medicineName,
          dosage: healthRecords.dosage,
          doctorName: healthRecords.doctorName,
          appointmentDate: healthRecords.appointmentDate,
          contactName: healthRecords.contactName,
          contactPhone: healthRecords.contactPhone,
          relationship: healthRecords.relationship
        })
        .from(healthRecords)
        .leftJoin(users, eq(healthRecords.seniorId, users.id))
        .where(sql`${healthRecords.seniorId} IN (${seniorIds.join(',')})`)
        .orderBy(desc(healthRecords.createdAt))
        .limit(limitNum);
      
      console.log('🔍 Raw health records found:', recentActivities.length);
      recentActivities.forEach((record, index) => {
        console.log(`📋 Raw Record ${index + 1}: ${record.type} - ${record.title} (${record.createdAt})`);
      });
      
      // Format activities for frontend
      const formattedActivities = recentActivities.map(activity => {
        let activityTitle = activity.title;
        let activityDescription = activity.description || '';
        let activityIcon = '📋';
        let activityColor = 'primary';
        
        // Customize based on type
        switch (activity.type?.toLowerCase()) {
          case 'medication':
            activityTitle = `Added medication record`;
            activityDescription = activity.medicineName ? 
              `${activity.medicineName} ${activity.dosage || ''}` : 
              activityDescription;
            activityIcon = '💊';
            activityColor = 'primary';
            break;
          case 'appointment':
            activityTitle = `Scheduled appointment`;
            activityDescription = activity.doctorName ? 
              `Appointment with ${activity.doctorName}` : 
              activityDescription;
            activityIcon = '📅';
            activityColor = 'success';
            break;
          case 'emergency contact':
            activityTitle = `Updated emergency contact`;
            activityDescription = activity.contactName ? 
              `Contact: ${activity.contactName}` : 
              activityDescription;
            activityIcon = '🚨';
            activityColor = 'error';
            break;
          case 'checkup':
            activityTitle = `Added checkup record`;
            activityIcon = '🩺';
            activityColor = 'info';
            break;
          case 'vaccination':
            activityTitle = `Added vaccination record`;
            activityIcon = '💉';
            activityColor = 'success';
            break;
          default:
            activityTitle = `Added ${activity.type || 'health'} record`;
            break;
        }
        
        // Calculate time ago
        const now = new Date();
        const createdAt = new Date(activity.createdAt || new Date());
        const diffMs = now.getTime() - createdAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let timeAgo = '';
        if (diffDays > 0) {
          timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        } else if (diffHours > 0) {
          timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          timeAgo = diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        }
        
        return {
          id: activity.id,
          type: activity.type,
          title: activityTitle,
          description: activityDescription,
          seniorName: `${activity.seniorName || ''} ${activity.seniorLastName || ''}`.trim(),
          staffName: user.username || 'Staff',
          createdAt: activity.createdAt,
          timeAgo: timeAgo,
          icon: activityIcon,
          color: activityColor,
          isUrgent: activity.type?.toLowerCase() === 'emergency contact'
        };
      });
      
      console.log(`📋 Found ${formattedActivities.length} recent activities (FORCED LIMIT: 3)`);
      
      // Debug: Log each activity for troubleshooting
      formattedActivities.forEach((activity, index) => {
        console.log(`📋 Activity ${index + 1}: ${activity.title} - ${activity.seniorName} (${activity.timeAgo})`);
        console.log(`    📝 ID: ${activity.id}, Type: ${activity.type}, Icon: ${activity.icon}`);
      });
      
      // Ensure we're returning exactly what we expect
      console.log(`🔍 Returning ${formattedActivities.length} activities to frontend`);
      console.log(`📤 FULL RESPONSE STRUCTURE:`, JSON.stringify({
        success: true,
        data: { activities: formattedActivities }
      }, null, 2));
      
      const response = {
        success: true,
        data: {
          activities: formattedActivities
        },
        meta: {
          count: formattedActivities.length,
          requestedLimit: limitNum,
          actualLimit: 3,
          message: "Backend forced 3 activities regardless of frontend request"
        }
      };
      
      console.log(`🚀 FINAL RESPONSE: ${JSON.stringify(response)}`);
      console.log(`🔥 CRITICAL: Backend is sending ${formattedActivities.length} activities but frontend UI only shows 1!`);
      console.log(`🔥 This is a FRONTEND UI ISSUE - not a backend problem!`);
      
      return response;
      
    } catch (error) {
      console.error('❌ Error fetching recent activities:', error);
      return {
        success: false,
        error: 'Failed to fetch recent activities'
      };
    }
  });
