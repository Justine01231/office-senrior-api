// src/routes/program-applications.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { programApplications, programs, users, enrollments } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const programApplicationsRoutes = new Elysia({ prefix: '/api/program-applications' })
  .derive(async ({ headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { user: decoded };
    } catch (error) {
      return { user: null };
    }
  })

  // Senior applies for a program
  .post('/', async ({ body, user }) => {
    if (user.role !== 'senior') {
      throw new Error('Only seniors can apply for programs');
    }

    const seniorUserId = user.userId || user.id; // Use userId from JWT token
    console.log('📝 Senior applying for program - userId:', seniorUserId, 'programId:', body.programId);

    // Check if senior already has pending/approved application for this program
    const existingApplication = await db.select()
      .from(programApplications)
      .where(
        and(
          eq(programApplications.seniorId, seniorUserId),
          eq(programApplications.programId, parseInt(body.programId))
        )
      )
      .limit(1);

    if (existingApplication.length > 0) {
      const status = existingApplication[0].status;
      if (status === 'pending') {
        throw new Error('You already have a pending application for this program');
      } else if (status === 'approved') {
        throw new Error('You are already approved for this program');
      }
    }

    const application = await db.insert(programApplications)
      .values({
        seniorId: seniorUserId,
        programId: parseInt(body.programId),
        motivation: body.motivation || null,
      })
      .returning();

    console.log('✅ Application submitted successfully:', application[0].id);

    return {
      success: true,
      message: 'Application submitted successfully',
      data: application[0]
    };
  }, {
    body: t.Object({
      programId: t.String(),
      motivation: t.Optional(t.String())
    })
  })

  // Get senior's applications
  .get('/my-applications', async ({ user }) => {
    if (user.role !== 'senior') {
      throw new Error('Only seniors can view their applications');
    }

    const seniorUserId = user.userId || user.id; // Use userId from JWT token
    console.log('📋 Getting applications for senior userId:', seniorUserId);

    const applications = await db.select({
      id: programApplications.id,
      status: programApplications.status,
      applicationDate: programApplications.applicationDate,
      statusUpdatedAt: programApplications.statusUpdatedAt,
      statusReason: programApplications.statusReason,
      motivation: programApplications.motivation,
      programName: programs.name,
      programDescription: programs.description,
      programCategory: programs.category,
      programLocation: programs.location,
      programInstructor: programs.instructor,
      programCost: programs.cost,
    })
      .from(programApplications)
      .innerJoin(programs, eq(programApplications.programId, programs.id))
      .where(eq(programApplications.seniorId, seniorUserId))
      .orderBy(desc(programApplications.applicationDate));

    return {
      success: true,
      data: applications,
      count: applications.length
    };
  })

  // Admin: Get all pending applications
  .get('/pending', async ({ user, set }) => {
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return {
        success: false,
        message: 'Only admins can view pending applications',
        data: [],
        count: 0
      };
    }

    const pendingApplications = await db.select({
      id: programApplications.id,
      seniorId: programApplications.seniorId,
      programId: programApplications.programId,
      status: programApplications.status,
      applicationDate: programApplications.applicationDate,
      statusUpdatedAt: programApplications.statusUpdatedAt,
      statusReason: programApplications.statusReason,
      motivation: programApplications.motivation,
      priority: programApplications.priority,
      seniorUsername: users.username,
      seniorFirstName: users.firstName,
      seniorLastName: users.lastName,
      seniorEmail: users.email,
      programName: programs.name,
      programDescription: programs.description,
      programCategory: programs.category,
      programLocation: programs.location,
      programInstructor: programs.instructor,
      programCost: programs.cost,
    })
      .from(programApplications)
      .innerJoin(users, eq(programApplications.seniorId, users.id))
      .innerJoin(programs, eq(programApplications.programId, programs.id))
      .where(eq(programApplications.status, 'pending'))
      .orderBy(desc(programApplications.applicationDate));

    return {
      success: true,
      data: pendingApplications,
      count: pendingApplications.length
    };
  })

  // Admin: Approve/Reject application (PATCH with status in body)
  .patch('/:id/status', async ({ params, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Only admins can update application status');
    }

    const adminUserId = user.userId || user.id; // Use userId from JWT token
    const applicationId = parseInt(params.id);
    const { status, reason } = body;

    console.log('👮 Admin updating application status - adminId:', adminUserId, 'applicationId:', applicationId, 'status:', status);

    // Update application status
    const updated = await db.update(programApplications)
      .set({
        status: status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminUserId,
        statusReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(programApplications.id, applicationId))
      .returning();

    if (!updated.length) {
      throw new Error('Application not found');
    }

    const application = updated[0];

    // If approved, automatically create enrollment
    if (status === 'approved') {
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      await db.insert(enrollments)
        .values({
          seniorId: application.seniorId, // Direct reference to users.id
          programId: application.programId,
          applicationId: applicationId,
          enrollmentDate: today,
          status: 'active'
        });
    }

    return {
      success: true,
      message: `Application ${status} successfully`,
      data: application
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.Union([t.Literal('approved'), t.Literal('rejected')]),
      reason: t.Optional(t.String())
    })
  })

  // Admin: Approve application (POST - Android expects this)
  .post('/:id/approve', async ({ params, user }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Only admins can approve applications');
    }

    const adminUserId = user.userId || user.id;
    const applicationId = parseInt(params.id);

    console.log('✅ Admin approving application - adminId:', adminUserId, 'applicationId:', applicationId);

    // Update application status to approved
    const updated = await db.update(programApplications)
      .set({
        status: 'approved',
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(programApplications.id, applicationId))
      .returning();

    if (!updated.length) {
      throw new Error('Application not found');
    }

    const application = updated[0];

    // Automatically create enrollment
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    await db.insert(enrollments)
      .values({
        seniorId: application.seniorId,
        programId: application.programId,
        applicationId: applicationId,
        enrollmentDate: today,
        status: 'active'
      });

    console.log('✅ Application approved and enrollment created');

    return {
      success: true,
      message: 'Application approved successfully',
      data: application
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // Admin: Reject application (POST - Android expects this)
  .post('/:id/reject', async ({ params, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Only admins can reject applications');
    }

    const adminUserId = user.userId || user.id;
    const applicationId = parseInt(params.id);
    const reason = body?.reason || null;

    console.log('❌ Admin rejecting application - adminId:', adminUserId, 'applicationId:', applicationId);

    // Update application status to rejected
    const updated = await db.update(programApplications)
      .set({
        status: 'rejected',
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminUserId,
        statusReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(programApplications.id, applicationId))
      .returning();

    if (!updated.length) {
      throw new Error('Application not found');
    }

    console.log('❌ Application rejected');

    return {
      success: true,
      message: 'Application rejected',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Optional(t.Object({
      reason: t.Optional(t.String())
    }))
  })

  // Get all applications (admin view)
  // Using root GET for admin (with role check) - matches RESTful convention
  .get('/', async ({ user, set }) => {
    try {
      console.log('📋 GET /api/program-applications called by:', user?.username, 'Role:', user?.role);
      
      // Check if user is authenticated and is an admin
      if (!user || user.role !== 'admin') {
        set.status = 403;
        return {
          success: false,
          message: 'Only admins can view all applications',
          data: [],
          count: 0
        };
      }

      const allApplications = await db.select({
        id: programApplications.id,
        seniorId: programApplications.seniorId,
        programId: programApplications.programId,
        status: programApplications.status,
        applicationDate: programApplications.applicationDate,
        statusUpdatedAt: programApplications.statusUpdatedAt,
        statusReason: programApplications.statusReason,
        motivation: programApplications.motivation,
        priority: programApplications.priority,
        seniorUsername: users.username,
        seniorFirstName: users.firstName,
        seniorLastName: users.lastName,
        seniorEmail: users.email,
        programName: programs.name,
        programDescription: programs.description,
        programCategory: programs.category,
        programLocation: programs.location,
        programInstructor: programs.instructor,
        programCost: programs.cost,
      })
        .from(programApplications)
        .innerJoin(users, eq(programApplications.seniorId, users.id))
        .innerJoin(programs, eq(programApplications.programId, programs.id))
        .orderBy(desc(programApplications.applicationDate));

      console.log('✅ Found', allApplications.length, 'program applications');

      return {
        success: true,
        message: 'Program applications retrieved successfully',
        data: allApplications,
        count: allApplications.length
      };
    } catch (error: any) {
      console.error('❌ Error in GET /api/program-applications:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Failed to retrieve program applications',
        error: error.message,
        data: [],
        count: 0
      };
    }
  });