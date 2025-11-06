// src/routes/admin-approvals.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { seniors, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const adminApprovalsRoutes = new Elysia({ prefix: '/api/admin' })
  .derive(async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { user: decoded };
    } catch (error) {
      throw new Error('Invalid token');
    }
  })
  
  // Get pending seniors awaiting approval
  .get('/pending-seniors', async ({ user }) => {
    console.log('🔍 PENDING SENIORS REQUEST - User:', user.username);
    
    try {
      // Verify admin role
      if (user.role !== 'admin') {
        return {
          success: false,
          message: 'Access denied. Admin role required.',
          data: null
        };
      }

      // Get all pending seniors with user details
      const pendingSeniors = await db
        .select({
          seniorId: seniors.id,
          userId: seniors.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          address: users.address,
          dateOfBirth: users.dateOfBirth,
          approvalStatus: users.approvalStatus,
          createdAt: seniors.createdAt,
          userEmail: users.email,
          userUsername: users.username,
          userIsActive: users.isActive
        })
        .from(seniors)
        .innerJoin(users, eq(seniors.userId, users.id))
        .where(eq(users.approvalStatus, 'pending'));

      console.log(`📋 Found ${pendingSeniors.length} pending seniors`);

      return {
        success: true,
        message: 'Pending seniors retrieved successfully',
        data: {
          pendingSeniors: pendingSeniors.map(senior => ({
            id: senior.seniorId,
            userId: senior.userId,
            firstName: senior.firstName,
            lastName: senior.lastName,
            fullName: `${senior.firstName} ${senior.lastName}`,
            email: senior.userEmail,
            username: senior.userUsername,
            phone: senior.phone || 'Not provided',
            address: senior.address || 'Not provided',
            dateOfBirth: senior.dateOfBirth,
            approvalStatus: senior.approvalStatus,
            registeredAt: senior.createdAt,
            isActive: senior.userIsActive
          })),
          count: pendingSeniors.length
        }
      };

    } catch (error) {
      console.error('❌ Error fetching pending seniors:', error);
      return {
        success: false,
        message: 'Failed to fetch pending seniors',
        data: null
      };
    }
  })

  // Get seniors by status (pending, approved, rejected, active)
  .get('/seniors', async ({ user, query }) => {
    const status = query.status;
    console.log(`🔍 ADMIN SENIORS FILTER REQUEST - Status: ${status}, User: ${user.username}`);
    
    try {
      // Verify admin role
      if (user.role !== 'admin') {
        return {
          success: false,
          message: 'Access denied. Admin role required.',
          data: null
        };
      }

      let whereCondition;
      if (status === 'pending') {
        whereCondition = and(eq(users.role, 'senior'), eq(users.approvalStatus, 'pending'));
      } else if (status === 'approved') {
        whereCondition = and(eq(users.role, 'senior'), eq(users.approvalStatus, 'approved'));
      } else if (status === 'rejected') {
        whereCondition = and(eq(users.role, 'senior'), eq(users.approvalStatus, 'rejected'));
      } else if (status === 'active') {
        whereCondition = and(eq(users.role, 'senior'), eq(users.approvalStatus, 'approved'), eq(users.isActive, true));
      } else {
        // Default: all seniors
        whereCondition = eq(users.role, 'senior');
      }

      // Get seniors with user details
      const seniorsData = await db
        .select({
          seniorId: seniors.id,
          userId: seniors.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          address: users.address,
          dateOfBirth: users.dateOfBirth,
          gender: users.gender,
          emergencyContactName: users.emergencyContactName,
          emergencyContactPhone: users.emergencyContactPhone,
          approvalStatus: users.approvalStatus,
          createdAt: seniors.createdAt,
          userEmail: users.email,
          userUsername: users.username,
          userIsActive: users.isActive
        })
        .from(seniors)
        .innerJoin(users, eq(seniors.userId, users.id))
        .where(whereCondition);

      console.log(`📋 RESULT: Found ${seniorsData.length} seniors with status: ${status}`);
      console.log('📋 Raw data:', seniorsData.map(s => `${s.firstName} ${s.lastName} (${s.approvalStatus})`));

      const mappedData = seniorsData.map(senior => ({
        id: senior.seniorId,
        userId: senior.userId,
        firstName: senior.firstName,
        lastName: senior.lastName,
        fullName: `${senior.firstName} ${senior.lastName}`,
        email: senior.userEmail,
        username: senior.userUsername,
        phone: senior.phone || 'Not provided',
        address: senior.address || 'Not provided',
        dateOfBirth: senior.dateOfBirth,
        gender: senior.gender || 'Not specified',
        emergencyContactName: senior.emergencyContactName || 'Not provided',
        emergencyContactPhone: senior.emergencyContactPhone || 'Not provided',
        approvalStatus: senior.approvalStatus,
        registeredAt: senior.createdAt,
        isActive: senior.userIsActive
      }));

      console.log(`📋 MAPPED DATA: ${mappedData.length} seniors mapped for frontend`);

      return {
        success: true,
        message: `Seniors with status '${status}' retrieved successfully`,
        data: mappedData,
        count: seniorsData.length
      };

    } catch (error) {
      console.error('❌ Error fetching seniors by status:', error);
      return {
        success: false,
        message: 'Failed to fetch seniors',
        data: null
      };
    }
  })

  // Approve a senior
  .post('/approve-senior/:id', async ({ params, user }) => {
    const seniorId = parseInt(params.id);
    console.log(`✅ Admin approving senior ID: ${seniorId}, by user:`, user.username);
    
    try {
      // Verify admin role
      if (user.role !== 'admin') {
        return {
          success: false,
          message: 'Access denied. Admin role required.'
        };
      }

      // Check if senior exists and is pending
      const existingSenior = await db
        .select({
          userId: seniors.userId,
          approvalStatus: users.approvalStatus
        })
        .from(seniors)
        .innerJoin(users, eq(seniors.userId, users.id))
        .where(eq(seniors.id, seniorId))
        .limit(1);

      if (existingSenior.length === 0) {
        return {
          success: false,
          message: 'Senior not found'
        };
      }

      if (existingSenior[0]?.approvalStatus !== 'pending') {
        return {
          success: false,
          message: 'Senior is not in pending status'
        };
      }

      // Update user approval status and activate account
      await db
        .update(users)
        .set({
          approvalStatus: 'approved',
          isActive: true,  // ✅ Automatically activate when approved
          approvedBy: user.userId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, existingSenior[0].userId));

      console.log(`✅ Senior ${seniorId} approved successfully by admin ${user.username}`);

      return {
        success: true,
        message: 'Senior approved successfully'
      };

    } catch (error) {
      console.error('❌ Error approving senior:', error);
      return {
        success: false,
        message: 'Failed to approve senior'
      };
    }
  })

  // Reject a senior
  .post('/reject-senior/:id', async ({ params, user, body }) => {
    const seniorId = parseInt(params.id);
    console.log(`❌ Admin rejecting senior ID: ${seniorId}, by user:`, user.username);
    
    try {
      // Verify admin role
      if (user.role !== 'admin') {
        return {
          success: false,
          message: 'Access denied. Admin role required.'
        };
      }

      // Check if senior exists and is pending
      const existingSenior = await db
        .select({
          userId: seniors.userId,
          approvalStatus: users.approvalStatus
        })
        .from(seniors)
        .innerJoin(users, eq(seniors.userId, users.id))
        .where(eq(seniors.id, seniorId))
        .limit(1);

      if (existingSenior.length === 0) {
        return {
          success: false,
          message: 'Senior not found'
        };
      }

      if (existingSenior[0]?.approvalStatus !== 'pending') {
        return {
          success: false,
          message: 'Senior is not in pending status'
        };
      }

      // Update user approval status (not seniors table)
      await db
        .update(users)
        .set({
          approvalStatus: 'rejected',
          approvedBy: user.userId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, existingSenior[0].userId));

      // Update seniors table with rejection notes
      await db
        .update(seniors)
        .set({
          notes: body?.reason || 'No reason provided',
          updatedAt: new Date()
        })
        .where(eq(seniors.id, seniorId));

      console.log(`❌ Senior ${seniorId} rejected by admin ${user.username}`);

      return {
        success: true,
        message: 'Senior rejected successfully'
      };

    } catch (error) {
      console.error('❌ Error rejecting senior:', error);
      return {
        success: false,
        message: 'Failed to reject senior'
      };
    }
  }, {
    body: t.Optional(t.Object({
      reason: t.Optional(t.String())
    }))
  });
