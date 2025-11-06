// src/routes/staff-coverage.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, staffAssignments } from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔄 STAFF COVERAGE ROUTES LOADED');

export const staffCoverageRoutes = new Elysia({ prefix: '/api/staff-coverage' })
  .derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    
    const token = authorization.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return { user: payload };
    } catch (error) {
      console.error('❌ JWT verification failed:', error);
      throw new Error('Invalid token');
    }
  })

  // POST /api/staff-coverage/set-availability - Set staff availability status
  .post('/set-availability', async ({ user, body }) => {
    try {
      console.log(`🔄 Setting availability for staff ${user.userId}: ${body.isAvailable}`);
      
      if (user.role !== 'staff' && user.role !== 'admin') {
        return {
          success: false,
          error: 'Only staff and admin can set availability'
        };
      }

      // Update all assignments where this user is primary staff
      await db.update(staffAssignments)
        .set({ 
          isActive: body.isAvailable,
          updatedAt: new Date()
        })
        .where(eq(staffAssignments.staffId, user.userId));

      console.log(`✅ Updated availability for staff ${user.userId}`);
      
      return {
        success: true,
        message: `Availability set to ${body.isAvailable ? 'available' : 'unavailable'}`
      };

    } catch (error) {
      console.error('❌ Error setting staff availability:', error);
      return {
        success: false,
        error: 'Failed to update availability'
      };
    }
  }, {
    body: t.Object({
      isAvailable: t.Boolean()
    })
  })

  // POST /api/staff-coverage/assign-backup - Assign backup staff to a senior
  .post('/assign-backup', async ({ user, body }) => {
    try {
      console.log(`🔄 Assigning backup staff ${body.backupStaffId} to senior ${body.seniorId}`);
      
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Only admin can assign backup staff'
        };
      }

      // Verify backup staff exists and is staff role
      const backupStaff = await db.select()
        .from(users)
        .where(
          and(
            eq(users.id, body.backupStaffId),
            eq(users.role, 'staff'),
            eq(users.isActive, true)
          )
        )
        .limit(1);

      if (!backupStaff || backupStaff.length === 0) {
        return {
          success: false,
          error: 'Backup staff not found or not active'
        };
      }

      // Note: backupStaffId field doesn't exist in schema
      // For now, we'll add a note to the assignment
      await db.update(staffAssignments)
        .set({ 
          notes: `Backup staff assigned: ${body.backupStaffId}`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(staffAssignments.seniorId, body.seniorId),
            eq(staffAssignments.isActive, true)
          )
        );

      console.log(`✅ Backup staff assigned successfully`);
      
      return {
        success: true,
        message: 'Backup staff assigned successfully'
      };

    } catch (error) {
      console.error('❌ Error assigning backup staff:', error);
      return {
        success: false,
        error: 'Failed to assign backup staff'
      };
    }
  }, {
    body: t.Object({
      seniorId: t.Number(),
      backupStaffId: t.Number()
    })
  })

  // GET /api/staff-coverage/my-coverage - Get coverage info for current staff
  .get('/my-coverage', async ({ user }) => {
    try {
      console.log(`🔄 Getting coverage info for staff ${user.userId}`);
      
      if (user.role !== 'staff') {
        return {
          success: false,
          error: 'Only staff can view coverage info'
        };
      }

      // Get assignments where user is primary staff
      const primaryAssignments = await db
        .select({
          assignmentId: staffAssignments.id,
          seniorId: staffAssignments.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          isActive: staffAssignments.isActive,
          assignedAt: staffAssignments.assignedAt
        })
        .from(staffAssignments)
        .innerJoin(users, eq(staffAssignments.seniorId, users.id))
        .where(
          and(
            eq(staffAssignments.staffId, user.userId),
            eq(staffAssignments.isActive, true)
          )
        );

      // Note: backupStaffId doesn't exist in schema, so backup assignments are empty
      const backupAssignments: any[] = [];

      return {
        success: true,
        coverage: {
          primaryAssignments: primaryAssignments.map(assignment => ({
            assignmentId: assignment.assignmentId,
            seniorId: assignment.seniorId,
            seniorName: `${assignment.seniorName} ${assignment.seniorLastName}`,
            hasBackup: false, // backupStaffId field doesn't exist
            isActive: assignment.isActive,
            assignedAt: assignment.assignedAt
          })),
          backupAssignments: [] // Empty since backupStaffId field doesn't exist in schema
        }
      };

    } catch (error) {
      console.error('❌ Error getting coverage info:', error);
      return {
        success: false,
        error: 'Failed to get coverage information'
      };
    }
  })

  // POST /api/staff-coverage/demo-scenario - Demo scenario simulation
  .post('/demo-scenario', async ({ user, body }) => {
    try {
      console.log(`🎭 Demo scenario: ${body.scenario} for user ${user.userId}`);
      
      const scenarios: Record<string, any> = {
        'normal_day': {
          title: '🏥 Normal Day - Dr. Rodriguez Available',
          description: 'Primary staff available, normal operations',
          staffStatus: 'available',
          backupActive: false
        },
        'sick_leave': {
          title: '🤒 Dr. Rodriguez Goes on Sick Leave',
          description: 'Primary staff unavailable, activating backup',
          staffStatus: 'unavailable',
          backupActive: true,
          notification: 'Senior notified of staff change'
        },
        'backup_active': {
          title: '👩‍⚕️ Nurse Johnson Takes Over',
          description: 'Backup staff actively managing senior care',
          staffStatus: 'unavailable',
          backupActive: true,
          permissions: ['view_records', 'add_records', 'contact_senior']
        },
        'staff_return': {
          title: '✅ Dr. Rodriguez Returns to Work',
          description: 'Primary staff restored, backup on standby',
          staffStatus: 'available',
          backupActive: false,
          notification: 'Senior notified of staff return'
        }
      };

      const scenario = scenarios[body.scenario];
      if (!scenario) {
        return {
          success: false,
          error: 'Invalid scenario'
        };
      }

      // Simulate database update for demo (using isActive since isPrimaryActive doesn't exist)
      if (body.scenario === 'sick_leave' || body.scenario === 'backup_active') {
        // Simulate setting primary staff as unavailable
        await db.update(staffAssignments)
          .set({ isActive: false })
          .where(eq(staffAssignments.staffId, user.userId));
      } else if (body.scenario === 'staff_return' || body.scenario === 'normal_day') {
        // Simulate setting primary staff as available
        await db.update(staffAssignments)
          .set({ isActive: true })
          .where(eq(staffAssignments.staffId, user.userId));
      }

      return {
        success: true,
        scenario: scenario,
        message: `Demo scenario "${scenario.title}" activated`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error running demo scenario:', error);
      return {
        success: false,
        error: 'Failed to run demo scenario'
      };
    }
  }, {
    body: t.Object({
      scenario: t.String()
    })
  });
