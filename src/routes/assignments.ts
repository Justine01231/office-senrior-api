import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, seniors, staffAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

console.log('🔥 ASSIGNMENTS ROUTES LOADED - NEW CODE IS RUNNING!');

export const assignmentsRoutes = new Elysia({ prefix: '/api/assignments' })
  .onRequest((context) => {
    // Only log requests that actually match this route prefix
    if (context.request.url.includes('/api/assignments')) {
      console.log(`📥 ASSIGNMENTS ROUTE REQUEST: ${context.request.method} ${context.request.url}`);
    }
  })
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
  
  // Assign senior to staff (Admin only)
  .post('/assign', async ({ body, user }) => {
    console.log(`🚀 ASSIGNMENT ENDPOINT HIT!`);
    console.log(`🚀 Body:`, body);
    console.log(`🚀 User:`, user);
    
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can assign seniors to staff');
    }
    
    try {
      // Verify staff member exists and is active
      console.log(`🔍 Checking staff member with ID: ${body.staffId}`);
      const staffMember = await db.select()
        .from(users)
        .where(and(
          eq(users.id, body.staffId),
          eq(users.role, 'staff'),
          eq(users.isActive, true)
        ))
        .limit(1);
      
      console.log(`🔍 Found staff member:`, staffMember);
      
      if (staffMember.length === 0) {
        console.log(`❌ Staff member not found or inactive`);
        return {
          success: false,
          message: 'Staff member not found or inactive'
        };
      }
      
      // Verify senior exists (check users table with role="senior")
      console.log(`🔍 Checking senior with ID: ${body.seniorId}`);
      const senior = await db.select()
        .from(users)
        .where(and(
          eq(users.id, body.seniorId),
          eq(users.role, 'senior'),
          eq(users.isActive, true)
        ))
        .limit(1);
      
      console.log(`🔍 Found senior:`, senior);
      
      if (senior.length === 0) {
        console.log(`❌ Senior not found or inactive`);
        return {
          success: false,
          message: 'Senior not found or inactive'
        };
      }
      
      // Check if assignment already exists
      console.log(`🔍 Checking existing assignment`);
      const existingAssignment = await db.select()
        .from(staffAssignments)
        .where(and(
          eq(staffAssignments.staffId, body.staffId),
          eq(staffAssignments.seniorId, body.seniorId)
        ))
        .limit(1);
      
      console.log(`🔍 Existing assignment:`, existingAssignment);
      
      if (existingAssignment.length > 0) {
        console.log(`❌ Assignment already exists`);
        return {
          success: false,
          message: 'This senior is already assigned to this staff member'
        };
      }
      
      // Create assignment
      console.log(`✅ Creating new assignment`);
      const newAssignment = await db.insert(staffAssignments).values({
        staffId: body.staffId,
        seniorId: body.seniorId,
        assignedBy: user.userId,
        assignedAt: new Date(),
        isActive: true
      }).returning({
        id: staffAssignments.id,
        staffId: staffAssignments.staffId,
        seniorId: staffAssignments.seniorId,
        assignedAt: staffAssignments.assignedAt
      });
      
      console.log(`✅ Assignment created:`, newAssignment);
      
      return {
        success: true,
        message: 'Senior assigned to staff successfully',
        assignment: newAssignment[0]
      };
      
    } catch (error) {
      console.error('❌ Error creating assignment:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        message: 'Failed to assign senior to staff'
      };
    }
  }, {
    body: t.Object({
      staffId: t.Number(),
      seniorId: t.Number()
    })
  })
  
  // Get seniors assigned to a specific staff member
  .get('/staff/:staffId/seniors', async ({ params, user }) => {
    const staffId = parseInt(params.staffId);
    
    // Check if user is admin or the staff member themselves
    if (user.role !== 'admin' && user.id !== staffId) {
      throw new Error('Access denied');
    }
    
    try {
      const assignedSeniors = await db.select({
        seniorId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        address: users.address,
        dateOfBirth: users.dateOfBirth,
        assignmentId: staffAssignments.id,
        assignedAt: staffAssignments.assignedAt
      })
      .from(staffAssignments)
      .innerJoin(users, eq(staffAssignments.seniorId, users.id))
      .where(and(
        eq(staffAssignments.staffId, staffId),
        eq(staffAssignments.isActive, true),
        eq(users.role, 'senior')
      ));
      
      return {
        success: true,
        seniors: assignedSeniors
      };
      
    } catch (error) {
      console.error('Error fetching assigned seniors:', error);
      return {
        success: false,
        message: 'Failed to fetch assigned seniors'
      };
    }
  })
  
  // Get staff assignments for a senior (Admin only)
  .get('/senior/:seniorId/staff', async ({ params, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view senior assignments');
    }
    
    try {
      const seniorId = parseInt(params.seniorId);
      
      const assignedStaff = await db.select({
        staffId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        position: users.position,
        assignmentId: staffAssignments.id,
        assignedAt: staffAssignments.assignedAt
      })
      .from(staffAssignments)
      .innerJoin(users, eq(staffAssignments.staffId, users.id))
      .where(and(
        eq(staffAssignments.seniorId, seniorId),
        eq(staffAssignments.isActive, true)
      ));
      
      return {
        success: true,
        staff: assignedStaff
      };
      
    } catch (error) {
      console.error('Error fetching senior assignments:', error);
      return {
        success: false,
        message: 'Failed to fetch senior assignments'
      };
    }
  })
  
  // Remove assignment (Admin only)
  .delete('/:assignmentId', async ({ params, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can remove assignments');
    }
    
    try {
      console.log(`🚀 UNASSIGN ENDPOINT HIT! Assignment ID: ${params.assignmentId}`);
      
      const assignmentId = parseInt(params.assignmentId);
      
      // First, check if assignment exists
      const existingAssignment = await db.select()
        .from(staffAssignments)
        .where(eq(staffAssignments.id, assignmentId))
        .limit(1);
      
      console.log(`🔍 Found assignment:`, existingAssignment);
      
      if (!existingAssignment.length) {
        console.log(`❌ No assignment found with ID: ${assignmentId}`);
        return {
          success: false,
          message: 'Assignment not found'
        };
      }
      
      // Delete the assignment (hard delete for complete removal)
      const [deletedAssignment] = await db.delete(staffAssignments)
        .where(eq(staffAssignments.id, assignmentId))
        .returning({
          id: staffAssignments.id,
          staffId: staffAssignments.staffId,
          seniorId: staffAssignments.seniorId
        });
      
      console.log(`✅ Unassigned:`, deletedAssignment);
      
      if (!deletedAssignment) {
        console.log(`❌ No assignment was deleted for ID: ${assignmentId}`);
        return {
          success: false,
          message: 'Assignment not found or deletion failed'
        };
      }
      
      return {
        success: true,
        message: 'Assignment removed successfully',
        data: deletedAssignment
      };
      
    } catch (error) {
      console.error(`❌ Unassign error:`, error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      return {
        success: false,
        message: 'Failed to remove assignment'
      };
    }
  })
  
  // Get current user's assignment (Senior only)
  .get('/my-assignment', async ({ user }) => {
    console.log(`🔍 GET MY ASSIGNMENT: User=${user?.userId}, Role=${user?.role}`);
    
    // Check if user is senior
    if (user.role !== 'senior') {
      throw new Error('Only seniors can check their assignment');
    }
    
    try {
      // First, let's check all assignments to see what's in the database
      const allAssignments = await db.select({
        id: staffAssignments.id,
        seniorId: staffAssignments.seniorId,
        staffId: staffAssignments.staffId,
        isActive: staffAssignments.isActive,
        assignedAt: staffAssignments.assignedAt
      })
      .from(staffAssignments)
      .where(eq(staffAssignments.isActive, true));
      
      console.log(`🔍 ALL ACTIVE ASSIGNMENTS:`, allAssignments);
      console.log(`🔍 Looking for assignments where seniorId = ${user.userId}`);
      
      const assignedStaff = await db.select({
        staffId: users.id,
        staffName: users.firstName,
        staffLastName: users.lastName,
        staffEmail: users.email,
        staffPosition: users.position,
        assignmentId: staffAssignments.id,
        assignedAt: staffAssignments.assignedAt,
        isActive: staffAssignments.isActive
      })
      .from(staffAssignments)
      .innerJoin(users, eq(staffAssignments.staffId, users.id))
      .where(and(
        eq(staffAssignments.seniorId, user.userId),
        eq(staffAssignments.isActive, true)
      ))
      .limit(1);
      
      console.log(`🔍 Found assignment for senior ${user.userId}:`, assignedStaff);
      
      return {
        success: true,
        hasAssignment: assignedStaff.length > 0,
        assignment: assignedStaff.length > 0 ? assignedStaff[0] : null
      };
      
    } catch (error) {
      console.error('Error fetching senior assignment:', error);
      return {
        success: false,
        message: 'Failed to fetch assignment'
      };
    }
  })
  
  // Get all assignments (Admin only)
  .get('/all', async ({ user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view all assignments');
    }
    
    try {
      console.log('🔍 Fetching all assignments...');
      
      // Get assignments with staff info
      const assignmentsWithStaff = await db.select({
        assignmentId: staffAssignments.id,
        staffId: staffAssignments.staffId,
        staffName: users.firstName,
        staffLastName: users.lastName,
        staffPosition: users.position,
        seniorId: staffAssignments.seniorId,
        assignedAt: staffAssignments.assignedAt,
        isActive: staffAssignments.isActive
      })
      .from(staffAssignments)
      .innerJoin(users, and(
        eq(staffAssignments.staffId, users.id),
        eq(users.role, 'staff')
      ))
      .where(eq(staffAssignments.isActive, true));
      
      console.log('🔍 Found assignments with staff:', assignmentsWithStaff);
      
      // Get senior info for each assignment
      const enrichedAssignments = await Promise.all(
        assignmentsWithStaff.map(async (assignment) => {
          const senior = await db.select({
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(and(
            eq(users.id, assignment.seniorId),
            eq(users.role, 'senior')
          ))
          .limit(1);
          
          return {
            id: assignment.assignmentId,
            staffId: assignment.staffId,
            staffName: `${assignment.staffName} ${assignment.staffLastName}`.trim(),
            staffPosition: assignment.staffPosition,
            seniorId: assignment.seniorId,
            seniorName: `${senior[0]?.firstName || 'Unknown'} ${senior[0]?.lastName || 'Senior'}`.trim(),
            assignedAt: assignment.assignedAt,
            isActive: assignment.isActive
          };
        })
      );
      
      console.log('✅ Enriched assignments:', enrichedAssignments);
      
      return {
        success: true,
        assignments: enrichedAssignments
      };
      
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      return {
        success: false,
        message: 'Failed to fetch assignments'
      };
    }
  })
  
  // Get all assignments - alias for /all (Frontend compatibility)
  .get('/list', async ({ user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view all assignments');
    }
    
    try {
      console.log('🔍 Fetching all assignments via /list endpoint...');
      
      // Get assignments with staff info
      const assignmentsWithStaff = await db.select({
        assignmentId: staffAssignments.id,
        staffId: staffAssignments.staffId,
        staffName: users.firstName,
        staffLastName: users.lastName,
        staffPosition: users.position,
        seniorId: staffAssignments.seniorId,
        assignedAt: staffAssignments.assignedAt,
        isActive: staffAssignments.isActive
      })
      .from(staffAssignments)
      .innerJoin(users, and(
        eq(staffAssignments.staffId, users.id),
        eq(users.role, 'staff')
      ))
      .where(eq(staffAssignments.isActive, true));
      
      console.log('🔍 Found assignments with staff:', assignmentsWithStaff);
      
      // Get senior info for each assignment
      const enrichedAssignments = await Promise.all(
        assignmentsWithStaff.map(async (assignment) => {
          const senior = await db.select({
            firstName: users.firstName,
            lastName: users.lastName
          })
          .from(users)
          .where(and(
            eq(users.id, assignment.seniorId),
            eq(users.role, 'senior')
          ))
          .limit(1);
          
          return {
            id: assignment.assignmentId,
            staffId: assignment.staffId,
            staffName: `${assignment.staffName} ${assignment.staffLastName}`.trim(),
            staffPosition: assignment.staffPosition,
            seniorId: assignment.seniorId,
            seniorName: `${senior[0]?.firstName || 'Unknown'} ${senior[0]?.lastName || 'Senior'}`.trim(),
            assignedAt: assignment.assignedAt,
            isActive: assignment.isActive
          };
        })
      );
      
      console.log('✅ Enriched assignments via /list:', enrichedAssignments);
      
      return {
        success: true,
        assignments: enrichedAssignments
      };
      
    } catch (error) {
      console.error('Error fetching assignments via /list:', error);
      return {
        success: false,
        message: 'Failed to fetch assignments'
      };
    }
  })
  
  // Get all available staff for assignment dropdown (Admin only)
  .get('/available-staff', async ({ user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view available staff');
    }
    
    try {
      const availableStaff = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        position: users.position
      })
      .from(users)
      .where(and(
        eq(users.role, 'staff'),
        eq(users.isActive, true)
      ));
      
      return {
        success: true,
        staff: availableStaff
      };
      
    } catch (error) {
      console.error('Error fetching available staff:', error);
      return {
        success: false,
        message: 'Failed to fetch available staff'
      };
    }
  });
