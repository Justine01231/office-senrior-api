import { Elysia, t } from 'elysia';
import { db } from '../db';
import { users, staffAssignments } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const staffRoutes = new Elysia({ prefix: '/staff' })
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
  // Create new staff member (Admin only)
  .post('/create', async ({ body, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can create staff accounts');
    }
    
    try {
      // Check if username already exists
      const existingUser = await db.select({
        id: users.id,
        username: users.username
      })
        .from(users)
        .where(eq(users.username, body.username))
        .limit(1);
      
      if (existingUser.length > 0) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(body.password, 10);
      
      // Create staff user
      const newStaff = await db.insert(users).values({
        username: body.username,
        email: body.email || null,
        passwordHash: hashedPassword,
        role: 'staff',
        firstName: body.firstName,
        lastName: body.lastName,
        position: body.position,
        assignedBy: user.id,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        position: users.position,
        createdAt: users.createdAt
      });
      
      return {
        success: true,
        message: 'Staff member created successfully',
        staff: newStaff[0]
      };
      
    } catch (error) {
      console.error('Error creating staff:', error);
      return {
        success: false,
        message: 'Failed to create staff member'
      };
    }
  }, {
    body: t.Object({
      username: t.String({ minLength: 3, maxLength: 50 }),
      email: t.Optional(t.String({ format: 'email' })),
      password: t.String({ minLength: 6 }),
      firstName: t.String({ minLength: 1, maxLength: 100 }),
      lastName: t.String({ minLength: 1, maxLength: 100 }),
      position: t.String({ minLength: 1, maxLength: 100 })
    })
  })
  
  // Get all staff members (Admin only)
  .get('/list', async ({ user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view staff list');
    }
    
    try {
      const staffList = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        position: users.position,
        isActive: users.isActive,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.role, 'staff'));
      
      return {
        success: true,
        staff: staffList
      };
      
    } catch (error) {
      console.error('Error fetching staff list:', error);
      return {
        success: false,
        message: 'Failed to fetch staff list'
      };
    }
  })
  
  // Get staff member details (Admin only)
  .get('/:id', async ({ params, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can view staff details');
    }
    
    try {
      const staffMember = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
        createdAt: users.createdAt,
        assignedBy: users.assignedBy
      })
      .from(users)
      .where(and(
        eq(users.id, parseInt(params.id)),
        eq(users.role, 'staff')
      ))
      .limit(1);
      
      if (staffMember.length === 0) {
        return {
          success: false,
          message: 'Staff member not found'
        };
      }
      
      return {
        success: true,
        staff: staffMember[0]
      };
      
    } catch (error) {
      console.error('Error fetching staff details:', error);
      return {
        success: false,
        message: 'Failed to fetch staff details'
      };
    }
  })
  
  // Update staff member status (Admin only)
  .patch('/:id/status', async ({ params, body, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can update staff status');
    }
    
    try {
      const updatedStaff = await db.update(users)
        .set({
          isActive: body.isActive,
          updatedAt: new Date()
        })
        .where(and(
          eq(users.id, parseInt(params.id)),
          eq(users.role, 'staff')
        ))
        .returning({
          id: users.id,
          username: users.username,
          isActive: users.isActive
        });
      
      if (updatedStaff.length === 0) {
        return {
          success: false,
          message: 'Staff member not found'
        };
      }
      
      return {
        success: true,
        message: 'Staff status updated successfully',
        staff: updatedStaff[0]
      };
      
    } catch (error) {
      console.error('Error updating staff status:', error);
      return {
        success: false,
        message: 'Failed to update staff status'
      };
    }
  }, {
    body: t.Object({
      isActive: t.Boolean()
    })
  })
  
  // DELETE staff member by ID (Admin only)
  .delete('/:id', async ({ params, user }) => {
    // Check if user is admin
    if (user.role !== 'admin') {
      throw new Error('Only admins can delete staff accounts');
    }
    
    try {
      console.log(`🚀 DELETE STAFF ENDPOINT HIT! ID: ${params.id}`);
      
      const staffId = parseInt(params.id);
      
      // First, check if staff exists with role="staff" - only select staff-relevant fields
      const existingStaff = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        position: users.position,
        isActive: users.isActive,
        createdAt: users.createdAt
      }).from(users).where(and(
        eq(users.id, staffId),
        eq(users.role, 'staff')
      ));
      
      console.log(`🚀 Found staff:`, existingStaff);
      
      if (!existingStaff.length) {
        console.log(`❌ No staff found with ID: ${staffId}`);
        throw new Error('Staff member not found');
      }
      
      // Delete any staff assignments first
      await db.delete(staffAssignments)
        .where(eq(staffAssignments.staffId, staffId));
      
      // Delete the staff user
      const [deletedStaff] = await db.delete(users)
        .where(eq(users.id, staffId))
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username
        });
      
      console.log(`✅ Deleted staff:`, deletedStaff);
      
      if (!deletedStaff) {
        console.log(`❌ No staff was deleted for ID: ${staffId}`);
        throw new Error('Staff member not found or deletion failed');
      }
      
      return { 
        success: true, 
        message: 'Staff member deleted successfully',
        data: deletedStaff 
      };
    } catch (error) {
      console.error(`❌ Delete staff error:`, error);
      throw error;
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  });
