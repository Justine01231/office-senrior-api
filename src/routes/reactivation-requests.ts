// src/routes/reactivation-requests.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { reactivationRequests, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔄 REACTIVATION REQUESTS ROUTES LOADED');

export const reactivationRequestsRoutes = new Elysia({ prefix: '/api/reactivation-requests' })
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
      throw new Error('Invalid token');
    }
  })
  
  // CREATE reactivation request (Staff only)
  .post('/', async ({ user, body }) => {
    try {
      console.log(`📝 Reactivation request by staff ID: ${user.id}`);
      
      // Verify user is staff
      if (user.role !== 'staff') {
        return {
          success: false,
          error: 'Access denied. Staff role required.'
        };
      }

      const { seniorId, reason } = body;

      // Check if senior exists and is inactive
      const senior = await db
        .select()
        .from(users)
        .where(eq(users.id, seniorId))
        .limit(1);

      if (senior.length === 0) {
        return {
          success: false,
          error: 'Senior not found'
        };
      }

      const seniorData = senior[0]!;
      if (seniorData.isActive) {
        return {
          success: false,
          error: 'Senior is already active'
        };
      }

      // Check if there's already a pending request for this senior
      const existingRequest = await db
        .select()
        .from(reactivationRequests)
        .where(
          and(
            eq(reactivationRequests.seniorId, seniorId),
            eq(reactivationRequests.status, 'pending')
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        return {
          success: false,
          error: 'A reactivation request for this senior is already pending'
        };
      }

      // Create reactivation request
      const [newRequest] = await db
        .insert(reactivationRequests)
        .values({
          seniorId,
          requestedBy: user.userId,
          reason,
          status: 'pending'
        })
        .returning();

      console.log(`✅ Reactivation request created - ID: ${newRequest!.id}`);

      return {
        success: true,
        message: 'Reactivation request submitted successfully',
        data: {
          requestId: newRequest!.id,
          seniorId,
          reason,
          status: 'pending',
          requestedAt: newRequest!.requestedAt
        }
      };

    } catch (error) {
      console.error('❌ Error creating reactivation request:', error);
      return {
        success: false,
        error: 'Failed to create reactivation request'
      };
    }
  }, {
    body: t.Object({
      seniorId: t.Number(),
      reason: t.String({ minLength: 10, maxLength: 500 })
    })
  })
  
  // GET all reactivation requests (Admin only)
  .get('/admin', async ({ user }) => {
    try {
      console.log(`📋 Admin reactivation requests requested by: ${user.id}`);
      
      // Verify user is admin
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Access denied. Admin role required.'
        };
      }

      // Get all reactivation requests with senior and staff details
      const requests = await db
        .select({
          id: reactivationRequests.id,
          seniorId: reactivationRequests.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorEmail: users.email,
          requestedBy: reactivationRequests.requestedBy,
          staffName: users.firstName,
          staffLastName: users.lastName,
          reason: reactivationRequests.reason,
          status: reactivationRequests.status,
          reviewedBy: reactivationRequests.reviewedBy,
          reviewedAt: reactivationRequests.reviewedAt,
          reviewNotes: reactivationRequests.reviewNotes,
          requestedAt: reactivationRequests.requestedAt
        })
        .from(reactivationRequests)
        .innerJoin(users, eq(reactivationRequests.seniorId, users.id))
        .orderBy(desc(reactivationRequests.requestedAt));

      // Get staff details for each request
      const requestsWithStaffDetails = await Promise.all(
        requests.map(async (request) => {
          const staff = await db
            .select({
              firstName: users.firstName,
              lastName: users.lastName,
              position: users.position
            })
            .from(users)
            .where(eq(users.id, request.requestedBy))
            .limit(1);

          return {
            ...request,
            staffName: staff[0]?.firstName || 'Unknown',
            staffLastName: staff[0]?.lastName || 'Staff',
            staffPosition: staff[0]?.position || 'Staff'
          };
        })
      );

      console.log(`✅ Found ${requests.length} reactivation requests`);

      return {
        success: true,
        data: requestsWithStaffDetails
      };

    } catch (error) {
      console.error('❌ Error fetching reactivation requests:', error);
      return {
        success: false,
        error: 'Failed to fetch reactivation requests'
      };
    }
  })
  
  // APPROVE/DENY reactivation request (Admin only)
  .patch('/:id/:action', async ({ user, params, body }) => {
    try {
      const { id, action } = params;
      console.log(`⚖️ Reactivation request ${action} by admin ID: ${user.id} for request: ${id}`);
      
      // Verify user is admin
      if (user.role !== 'admin') {
        return {
          success: false,
          error: 'Access denied. Admin role required.'
        };
      }

      if (!['approve', 'deny'].includes(action)) {
        return {
          success: false,
          error: 'Invalid action. Use "approve" or "deny"'
        };
      }

      const { reviewNotes } = body || {};

      // Get the request
      const request = await db
        .select()
        .from(reactivationRequests)
        .where(eq(reactivationRequests.id, parseInt(id)))
        .limit(1);

      if (request.length === 0) {
        return {
          success: false,
          error: 'Reactivation request not found'
        };
      }

      const requestData = request[0]!;
      if (requestData.status !== 'pending') {
        return {
          success: false,
          error: 'Request has already been reviewed'
        };
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      // Update request status
      await db
        .update(reactivationRequests)
        .set({
          status: newStatus,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null
        })
        .where(eq(reactivationRequests.id, parseInt(id)));

        // If approved, reactivate the senior
        if (action === 'approve') {
          await db
            .update(users)
            .set({
              isActive: true,
              updatedAt: new Date()
            })
            .where(eq(users.id, requestData.seniorId));

          console.log(`✅ Senior ${requestData.seniorId} reactivated successfully`);
        }

      console.log(`✅ Reactivation request ${newStatus} - ID: ${id}`);

      return {
        success: true,
        message: `Reactivation request ${newStatus} successfully`,
        data: {
          requestId: parseInt(id),
          status: newStatus,
          reviewedBy: user.id,
          reviewedAt: new Date(),
          seniorReactivated: action === 'approve'
        }
      };

    } catch (error) {
      console.error('❌ Error processing reactivation request:', error);
      return {
        success: false,
        error: 'Failed to process reactivation request'
      };
    }
  }, {
    body: t.Optional(t.Object({
      reviewNotes: t.Optional(t.String({ maxLength: 500 }))
    }))
  });
