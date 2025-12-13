// src/routes/seniors.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { seniors, users, enrollments, benefits, programs, programApplications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
// import { authMiddleware } from '../middleware/auth';

console.log('🔥 SENIORS ROUTES LOADED - NEW CODE IS RUNNING!');

export const seniorsRoutes = new Elysia({ prefix: '/api/seniors' })
  // .use(authMiddleware)
  .onRequest((context) => {
    // Only log requests that actually match this route prefix
    if (context.request.url.includes('/api/seniors')) {
      console.log(`📥 SENIORS ROUTE REQUEST: ${context.request.method} ${context.request.url}`);
    }
  })
  
  // GET all seniors (users with role="senior" AND approved status)
  .get('/', async () => {
    console.log('📋 Getting all APPROVED seniors only');
    const allSeniors = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      email: users.email,
      phone: users.phone,
      address: users.address,
      dateOfBirth: users.dateOfBirth,
      gender: users.gender,
      emergencyContactName: users.emergencyContactName,
      emergencyContactPhone: users.emergencyContactPhone,
      approvalStatus: users.approvalStatus,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(and(eq(users.role, 'senior'), eq(users.approvalStatus, 'approved')));
    
    console.log(`✅ Found ${allSeniors.length} approved seniors`);
    
    return {
      success: true,
      data: allSeniors,
      count: allSeniors.length
    };
  })
  
  // GET senior by ID
  .get('/:id', async ({ params }) => {
    const senior = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
      .from(users)
      .where(eq(users.id, parseInt(params.id)))
      .limit(1);
    
    if (!senior.length) {
      throw new Error('Senior not found');
    }
    
    return { success: true, data: senior[0] };
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  
  // UPDATE senior by ID
  .put('/:id', async ({ params, body }) => {
    const { firstName, lastName, username, email } = body;
    const inputId = parseInt(params.id);
    console.log(`🔄 UPDATING SENIOR: ID=${inputId}, data:`, body);
    
    // First, try to find by Senior ID
    let seniorRecord = await db.select({
      userId: seniors.userId
    })
      .from(seniors)
      .where(eq(seniors.id, inputId))
      .limit(1);
    
    // If not found by Senior ID, try by User ID
    if (!seniorRecord || seniorRecord.length === 0) {
      seniorRecord = await db.select({
        userId: seniors.userId
      })
        .from(seniors)
        .where(eq(seniors.userId, inputId))
        .limit(1);
    }
    
    console.log(`📋 Senior record found:`, seniorRecord);
    
    if (!seniorRecord || seniorRecord.length === 0) {
      throw new Error('Senior not found');
    }
    
    const userId = seniorRecord[0]!.userId;
    if (!userId) {
      throw new Error('Senior user ID not found');
    }
    console.log(`🔄 Updating user ID: ${userId} with data:`, body);
    
    // Update the user record (where the actual data is stored)
    const [updatedUser] = await db.update(users)
      .set({
        firstName,
        lastName,
        username,
        email,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });
    
    if (!updatedUser) {
      throw new Error('Senior not found or update failed');
    }
    
    // Also update the seniors table timestamp
    await db.update(seniors)
      .set({
        updatedAt: new Date()
      })
      .where(eq(seniors.id, parseInt(params.id)));
    
    console.log(`✅ Senior updated successfully:`, updatedUser);
    
    return { 
      success: true, 
      message: 'Senior updated successfully',
      data: {
        id: parseInt(params.id), // Return the senior ID, not user ID
        userId: userId,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      firstName: t.String(),
      lastName: t.String(),
      username: t.String(),
      email: t.Optional(t.String())
    })
  })
  
  // UPDATE senior status (activate/deactivate)
  .patch('/:id/status', async ({ params, body }) => {
    const { isActive } = body;
    const inputId = parseInt(params.id);
    console.log(`🔄 UPDATING SENIOR STATUS: ID=${inputId}, isActive=${isActive}`);
    
    // First, try to find by Senior ID
    let seniorRecord = await db.select({
      userId: seniors.userId
    })
      .from(seniors)
      .where(eq(seniors.id, inputId))
      .limit(1);
    
    // If not found by Senior ID, try by User ID
    if (!seniorRecord || seniorRecord.length === 0) {
      seniorRecord = await db.select({
        userId: seniors.userId
      })
        .from(seniors)
        .where(eq(seniors.userId, inputId))
        .limit(1);
    }
    
    const userId = seniorRecord[0]!.userId;
    if (!userId) {
      throw new Error('Senior user ID not found');
    }
    console.log(`🔄 Updating user ID: ${userId} to isActive: ${isActive}`);
    
    // Update the user's isActive status
    const [updatedSenior] = await db.update(users)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      });
    
    if (!updatedSenior) {
      throw new Error('Senior not found or status update failed');
    }
    
    return { 
      success: true, 
      message: `Senior ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedSenior 
    };
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      isActive: t.Boolean()
    })
  })
  
  // DELETE senior by ID (handles both Senior ID and User ID)
  .delete('/:id', async ({ params }) => {
    const inputId = parseInt(params.id);
    console.log(`🗑️ DELETE SENIOR REQUEST: ID=${inputId}`);
    
    try {
      // First, try to find by Senior ID
      let seniorRecord = await db.select({
        seniorId: seniors.id,
        userId: seniors.userId,
        firstName: users.firstName,
        lastName: users.lastName
      })
        .from(seniors)
        .innerJoin(users, eq(seniors.userId, users.id))
        .where(eq(seniors.id, inputId))
        .limit(1);
      
      // If not found by Senior ID, try by User ID
      if (!seniorRecord || seniorRecord.length === 0) {
        console.log(`🔍 Not found by Senior ID, trying User ID=${inputId}`);
        seniorRecord = await db.select({
          seniorId: seniors.id,
          userId: seniors.userId,
          firstName: users.firstName,
          lastName: users.lastName
        })
          .from(seniors)
          .innerJoin(users, eq(seniors.userId, users.id))
          .where(eq(users.id, inputId))
          .limit(1);
      }
      
      console.log(`📋 Senior record found:`, seniorRecord);
      
      if (!seniorRecord || seniorRecord.length === 0) {
        throw new Error('senior not found');
      }
      
      const seniorData = seniorRecord[0]!;
      const actualUserId = seniorData.userId;
      const seniorId = seniorData.seniorId;
      
      if (!actualUserId) {
        throw new Error('Senior user ID not found');
      }
      
      console.log(`🔄 Deleting User ID: ${actualUserId}, Senior ID: ${seniorId} for senior: ${seniorData.firstName} ${seniorData.lastName}`);
      
      // Delete the senior record first
      await db.delete(seniors).where(eq(seniors.id, seniorId));
      
      // Then delete the user record
      const [deletedUser] = await db.delete(users)
        .where(eq(users.id, actualUserId))
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username
        });
      
      console.log(`✅ Deleted senior:`, deletedUser);
      
      if (!deletedUser) {
        console.log(`❌ No user was deleted for ID: ${actualUserId}`);
        throw new Error('Senior not found or deletion failed');
      }
      
      return { 
        success: true, 
        message: 'Senior deleted successfully',
        data: deletedUser 
      };
    } catch (error) {
      console.error(`❌ Delete error:`, error);
      throw error;
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  
  // POST - Create new senior record (only creates seniors table entry)
  .post('/', async ({ body }) => {
    const { userId, notes } = body;
    
    const newSenior = await db.insert(seniors)
      .values({
        userId,
        notes: notes || null
      })
      .returning();
    
    return {
      success: true,
      message: 'Senior record created successfully',
      data: newSenior[0]
    };
  }, {
    body: t.Object({
      userId: t.Number(),
      notes: t.Optional(t.String())
    })
  })

  // GET /api/seniors/counts - Get realtime program and benefit counts for all seniors
  .get('/counts', async () => {
    console.log('📊 Getting realtime counts for all seniors');
    
    try {
      // Get all approved seniors
      const approvedSeniors = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        dateOfBirth: users.dateOfBirth,
        approvalStatus: users.approvalStatus,
      }).from(users)
      .where(and(
        eq(users.role, 'senior'),
        eq(users.approvalStatus, 'approved')
      ));

      const seniorsWithCounts = await Promise.all(
        approvedSeniors.map(async (senior) => {
          // Count APPROVED enrollments (programs)
          const approvedProgramApplications = await db.select({
            id: programApplications.id,
          }).from(programApplications)
          .where(and(
            eq(programApplications.seniorId, senior.id),
            eq(programApplications.status, 'approved')
          ));

          // Count active benefits
          const activeBenefits = await db.select({
            id: benefits.id,
          }).from(benefits)
          .innerJoin(seniors, eq(benefits.seniorId, seniors.id))
          .where(and(
            eq(seniors.userId, senior.id),
            eq(benefits.status, 'active')
          ));

          // Calculate age
          const birthDate = new Date(senior.dateOfBirth || '1950-01-01');
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear() - 
                     (today.getMonth() < birthDate.getMonth() || 
                      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);

          return {
            id: senior.id,
            name: `${senior.firstName || ''} ${senior.lastName || ''}`.trim(),
            age: age,
            programsCount: approvedProgramApplications.length,
            benefitsCount: activeBenefits.length,
            status: 'active' // Since we're only getting approved seniors
          };
        })
      );

      return {
        success: true,
        data: seniorsWithCounts
      };
      
    } catch (error) {
      console.error('❌ Error getting senior counts:', error);
      return {
        success: false,
        message: 'Failed to get senior counts',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })