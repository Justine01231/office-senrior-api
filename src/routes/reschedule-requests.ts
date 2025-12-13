// src/routes/reschedule-requests.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { appointments, users, rescheduleRequests } from '../db/schema';
import { desc, asc, eq, and } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔄 RESCHEDULE REQUESTS ROUTES LOADED - NEW CODE IS RUNNING!');

export const rescheduleRequestsRoutes = new Elysia({ prefix: '/api/reschedule-requests' })
  .derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      console.log('❌ No auth header in reschedule-requests');
      return { user: null };
    }
    
    const token = authorization.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      console.log('🔍 JWT Payload in reschedule-requests:', JSON.stringify(payload, null, 2));
      return { user: payload };
    } catch (error) {
      console.error('❌ JWT verification failed in reschedule-requests:', error);
      return { user: null };
    }
  })
  
  // Create reschedule request (Senior)
  .post('/', async ({ body, user }) => {
    try {
      console.log('🔄 Creating reschedule request:', body);
      console.log('👤 Requested by user:', user?.userId);
      
      // Verify the appointment exists and belongs to the user
      const appointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, body.appointmentId))
        .limit(1);
      
      if (!appointment[0]) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }
      
      // For seniors, verify they own the appointment
      if (user?.role === 'senior' && appointment[0].seniorId !== user.userId) {
        return {
          success: false,
          error: 'You can only request reschedule for your own appointments'
        };
      }
      
      // Create the reschedule request
      const newRequest = await db.insert(rescheduleRequests).values({
        appointmentId: body.appointmentId,
        seniorId: appointment[0].seniorId,
        requestedBy: user?.userId || appointment[0].seniorId,
        reason: body.reason,
        requestedDate: body.requestedDate,
        requestedTime: body.requestedTime,
        status: 'pending',
        createdAt: new Date(),
      }).returning();
      
      if (!newRequest[0]) {
        throw new Error('Failed to create reschedule request');
      }
      
      console.log('✅ Reschedule request created:', newRequest[0]);
      
      // Get complete request data with appointment and senior info
      const completeRequestResult = await db
        .select({
          id: rescheduleRequests.id,
          appointmentId: rescheduleRequests.appointmentId,
          seniorId: rescheduleRequests.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          reason: rescheduleRequests.reason,
          requestedDate: rescheduleRequests.requestedDate,
          requestedTime: rescheduleRequests.requestedTime,
          status: rescheduleRequests.status,
          requestDate: rescheduleRequests.createdAt,
          appointmentTitle: appointments.title,
          originalDate: appointments.appointmentDate,
          originalTime: appointments.appointmentTime,
          appointmentType: appointments.type,
        })
        .from(rescheduleRequests)
        .leftJoin(users, eq(rescheduleRequests.seniorId, users.id))
        .leftJoin(appointments, eq(rescheduleRequests.appointmentId, appointments.id))
        .where(eq(rescheduleRequests.id, newRequest[0].id));
      
      const completeRequest = completeRequestResult[0];
      
      if (!completeRequest) {
        throw new Error('Failed to retrieve created reschedule request');
      }
      
      // Format for Android app compatibility
      const formattedRequest = {
        id: completeRequest.id,
        appointmentId: completeRequest.appointmentId,
        seniorId: completeRequest.seniorId,
        seniorName: completeRequest.seniorName && completeRequest.seniorLastName 
          ? `${completeRequest.seniorName} ${completeRequest.seniorLastName}` 
          : 'Unknown Senior',
        reason: completeRequest.reason,
        requestedDate: completeRequest.requestedDate,
        requestedTime: completeRequest.requestedTime,
        status: completeRequest.status,
        requestDate: completeRequest.requestDate,
        appointmentTitle: completeRequest.appointmentTitle,
        originalDate: completeRequest.originalDate,
        originalTime: completeRequest.originalTime,
        appointmentType: completeRequest.appointmentType,
      };
      
      console.log('✅ Complete reschedule request data:', formattedRequest);
      
      return {
        success: true,
        data: formattedRequest,
        message: 'Reschedule request submitted successfully'
      };
    } catch (error) {
      console.error('❌ Error creating reschedule request:', error);
      return {
        success: false,
        error: 'Failed to create reschedule request',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      appointmentId: t.Number(),
      reason: t.String(),
      requestedDate: t.String(),
      requestedTime: t.String(),
    })
  })
  
  // Get all reschedule requests (Health Coordinator/Admin)
  .get('/', async ({ user }) => {
    try {
      console.log('🔄 ===== RESCHEDULE REQUESTS API CALLED =====');
      console.log('🔄 User ID:', user?.userId);
      console.log('🔄 User Role:', user?.role);
      console.log('🔄 User Object:', JSON.stringify(user, null, 2));
      
      // Check authentication
      if (!user) {
        console.log('❌ No user found - authentication required');
        return {
          success: false,
          error: 'No user authentication',
          requests: [],
          data: [],
          count: 0,
          pendingCount: 0
        };
      }
      
      console.log('✅ User authenticated - User:', user.username, 'Role:', user.role);
      
      // Fetch all reschedule requests with related data
      const requestsList = await db
        .select({
          id: rescheduleRequests.id,
          appointmentId: rescheduleRequests.appointmentId,
          seniorId: rescheduleRequests.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          reason: rescheduleRequests.reason,
          requestedDate: rescheduleRequests.requestedDate,
          requestedTime: rescheduleRequests.requestedTime,
          status: rescheduleRequests.status,
          requestDate: rescheduleRequests.createdAt,
          appointmentTitle: appointments.title,
          originalDate: appointments.appointmentDate,
          originalTime: appointments.appointmentTime,
          appointmentType: appointments.type,
        })
        .from(rescheduleRequests)
        .leftJoin(users, eq(rescheduleRequests.seniorId, users.id))
        .leftJoin(appointments, eq(rescheduleRequests.appointmentId, appointments.id))
        .orderBy(desc(rescheduleRequests.createdAt));
      
      console.log(`🔄 Database query completed - Found ${requestsList.length} total reschedule requests`);
      
      // Log each request for debugging
      if (requestsList.length > 0) {
        console.log('📋 Reschedule Requests Details:');
        requestsList.forEach((req, index) => {
          console.log(`   ${index + 1}. ID: ${req.id}, Senior: ${req.seniorName} ${req.seniorLastName}, Status: ${req.status}, Reason: ${req.reason}`);
        });
      } else {
        console.log('📋 No reschedule requests found in database');
      }
      
      // Format for Android app compatibility
      const formattedRequests = requestsList.map(req => ({
        id: req.id,
        appointmentId: req.appointmentId,
        seniorId: req.seniorId,
        seniorName: req.seniorName && req.seniorLastName 
          ? `${req.seniorName} ${req.seniorLastName}` 
          : 'Unknown Senior',
        reason: req.reason,
        requestedDate: req.requestedDate,
        requestedTime: req.requestedTime,
        status: req.status,
        requestDate: req.requestDate,
        appointmentTitle: req.appointmentTitle,
        originalDate: req.originalDate,
        originalTime: req.originalTime,
        appointmentType: req.appointmentType,
      }));
      
      // Count pending requests
      const pendingCount = formattedRequests.filter(req => req.status === 'pending').length;
      console.log(`✅ Returning ${formattedRequests.length} total requests (${pendingCount} pending)`);
      
      const response = {
        success: true,
        requests: formattedRequests,
        data: formattedRequests, // Both for compatibility
        count: formattedRequests.length,
        pendingCount: pendingCount
      };
      
      console.log('✅ Response being sent:', JSON.stringify(response, null, 2));
      console.log('🔄 ===== END RESCHEDULE REQUESTS API =====');
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching reschedule requests:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        error: 'Failed to fetch reschedule requests',
        details: error instanceof Error ? error.message : 'Unknown error',
        requests: [],
        data: [],
        count: 0
      };
    }
  })
  
  // Get pending reschedule requests
  .get('/pending', async ({ user }) => {
    try {
      console.log('🔄 Getting pending reschedule requests');
      
      // Only staff and admin can view pending requests
      if (user?.role !== 'staff' && user?.role !== 'admin') {
        return {
          success: false,
          error: 'Unauthorized access'
        };
      }
      
      const pendingRequests = await db
        .select({
          id: rescheduleRequests.id,
          appointmentId: rescheduleRequests.appointmentId,
          seniorId: rescheduleRequests.seniorId,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          reason: rescheduleRequests.reason,
          requestedDate: rescheduleRequests.requestedDate,
          requestedTime: rescheduleRequests.requestedTime,
          status: rescheduleRequests.status,
          requestDate: rescheduleRequests.createdAt,
          appointmentTitle: appointments.title,
          originalDate: appointments.appointmentDate,
          originalTime: appointments.appointmentTime,
          appointmentType: appointments.type,
        })
        .from(rescheduleRequests)
        .leftJoin(users, eq(rescheduleRequests.seniorId, users.id))
        .leftJoin(appointments, eq(rescheduleRequests.appointmentId, appointments.id))
        .where(eq(rescheduleRequests.status, 'pending'))
        .orderBy(desc(rescheduleRequests.createdAt));
      
      console.log(`🔄 Found ${pendingRequests.length} pending reschedule requests`);
      
      // Format for Android app compatibility
      const formattedRequests = pendingRequests.map(req => ({
        id: req.id,
        appointmentId: req.appointmentId,
        seniorId: req.seniorId,
        seniorName: req.seniorName && req.seniorLastName 
          ? `${req.seniorName} ${req.seniorLastName}` 
          : 'Unknown Senior',
        reason: req.reason,
        requestedDate: req.requestedDate,
        requestedTime: req.requestedTime,
        status: req.status,
        requestDate: req.requestDate,
        appointmentTitle: req.appointmentTitle,
        originalDate: req.originalDate,
        originalTime: req.originalTime,
        appointmentType: req.appointmentType,
      }));
      
      return {
        success: true,
        requests: formattedRequests,
        data: formattedRequests, // Both for compatibility
        count: formattedRequests.length
      };
    } catch (error) {
      console.error('❌ Error fetching pending reschedule requests:', error);
      return {
        success: false,
        error: 'Failed to fetch pending reschedule requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })
  
  // Approve reschedule request
  .post('/:id/approve', async ({ params, body, user }) => {
    try {
      const requestId = parseInt(params.id);
      console.log('✅ Approving reschedule request:', requestId, 'with new schedule:', body);
      
      // Only staff and admin can approve requests
      if (user?.role !== 'staff' && user?.role !== 'admin') {
        return {
          success: false,
          error: 'Unauthorized access'
        };
      }
      
      // Get the reschedule request
      const rescheduleRequest = await db
        .select()
        .from(rescheduleRequests)
        .where(eq(rescheduleRequests.id, requestId))
        .limit(1);
      
      if (!rescheduleRequest[0]) {
        return {
          success: false,
          error: 'Reschedule request not found'
        };
      }
      
      if (rescheduleRequest[0].status !== 'pending') {
        return {
          success: false,
          error: 'Reschedule request is not pending'
        };
      }
      
      // Update the original appointment with new schedule
      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          appointmentDate: body.newDate,
          appointmentTime: body.newTime,
          notes: body.notes ? `${appointments.notes}\n\nReschedule approved: ${body.notes}` : appointments.notes,
        })
        .where(eq(appointments.id, rescheduleRequest[0].appointmentId))
        .returning();
      
      // Update reschedule request status
      const [updatedRequest] = await db
        .update(rescheduleRequests)
        .set({
          status: 'approved',
          approvedBy: user?.userId,
          approvedAt: new Date(),
          finalDate: body.newDate,
          finalTime: body.newTime,
          approvalNotes: body.notes,
        })
        .where(eq(rescheduleRequests.id, requestId))
        .returning();
      
      console.log('✅ Reschedule request approved:', updatedRequest);
      
      return {
        success: true,
        data: [updatedRequest], // Wrap in array for frontend compatibility
        message: 'Reschedule request approved successfully'
      };
    } catch (error) {
      console.error('❌ Error approving reschedule request:', error);
      return {
        success: false,
        error: 'Failed to approve reschedule request',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      newDate: t.String(),
      newTime: t.String(),
      notes: t.Optional(t.String()),
    })
  })
  
  // Reject reschedule request
  .post('/:id/reject', async ({ params, body, user }) => {
    try {
      const requestId = parseInt(params.id);
      console.log('❌ Rejecting reschedule request:', requestId, 'with reason:', body);
      
      // Only staff and admin can reject requests
      if (user?.role !== 'staff' && user?.role !== 'admin') {
        return {
          success: false,
          error: 'Unauthorized access'
        };
      }
      
      // Update reschedule request status
      const [updatedRequest] = await db
        .update(rescheduleRequests)
        .set({
          status: 'rejected',
          rejectedBy: user?.userId,
          rejectedAt: new Date(),
          rejectionReason: body.reason,
        })
        .where(eq(rescheduleRequests.id, requestId))
        .returning();
      
      if (!updatedRequest) {
        return {
          success: false,
          error: 'Reschedule request not found'
        };
      }
      
      console.log('❌ Reschedule request rejected:', updatedRequest);
      
      return {
        success: true,
        data: [updatedRequest], // Wrap in array for frontend compatibility
        message: 'Reschedule request rejected'
      };
    } catch (error) {
      console.error('❌ Error rejecting reschedule request:', error);
      return {
        success: false,
        error: 'Failed to reject reschedule request',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      reason: t.String(),
    })
  });