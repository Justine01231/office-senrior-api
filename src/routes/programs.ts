// src/routes/programs.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { programs, programApplications, enrollments } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const programsRoutes = new Elysia({ prefix: '/api/programs' })
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
  
  // Get all programs with application status for seniors
  .get('/', async ({ user }) => {
    console.log('🏛️ Programs route called');
    console.log('👤 User object:', user);
    
    if (!user) {
      console.log('❌ No user object in programs route');
      throw new Error('Authentication required');
    }
    
    const allPrograms = await db.select().from(programs);

    // If user is a senior, include their application status
    if (user.role === 'senior') {
      const seniorUserId = user.userId || user.id; // Use userId from JWT token
      console.log('🔍 Checking programs for senior userId:', seniorUserId);
      
      const programsWithStatus = await Promise.all(
        allPrograms.map(async (program) => {
          // Check if senior has an application for this program
          const application = await db.select()
            .from(programApplications)
            .where(
              and(
                eq(programApplications.seniorId, seniorUserId),
                eq(programApplications.programId, program.id)
              )
            )
            .limit(1);

          // Check if senior is enrolled
          const enrollment = await db.select()
            .from(enrollments)
            .where(
              and(
                eq(enrollments.seniorId, seniorUserId),
                eq(enrollments.programId, program.id)
              )
            )
            .limit(1);

          return {
            ...program,
            applicationStatus: application.length > 0 ? application[0].status : null,
            isEnrolled: enrollment.length > 0,
            canApply: application.length === 0 && enrollment.length === 0
          };
        })
      );

      return {
        success: true,
        data: programsWithStatus,
        count: programsWithStatus.length
      };
    }

    return {
      success: true,
      data: allPrograms,
      count: allPrograms.length
    };
  })

  // Get available programs for seniors (programs they can apply to)
  .get('/available', async ({ user }) => {
    console.log('📋 Available programs route called');
    console.log('👤 User object:', user);
    
    if (!user) {
      console.log('❌ No user object in available programs route');
      throw new Error('Authentication required');
    }
    
    if (user.role !== 'senior') {
      throw new Error('Only seniors can view available programs');
    }

    const seniorUserId = user.userId || user.id; // Use userId from JWT token
    console.log('🔍 Checking available programs for senior userId:', seniorUserId);
    
    const allPrograms = await db.select().from(programs);
    
    const availablePrograms = await Promise.all(
      allPrograms.map(async (program) => {
        // Check if senior has an existing application or enrollment
        const existingApplication = await db.select()
          .from(programApplications)
          .where(
            and(
              eq(programApplications.seniorId, seniorUserId),
              eq(programApplications.programId, program.id)
            )
          )
          .limit(1);

        const existingEnrollment = await db.select()
          .from(enrollments)
          .where(
            and(
              eq(enrollments.seniorId, seniorUserId),
              eq(enrollments.programId, program.id)
            )
          )
          .limit(1);

        // Program is available if no application exists and not enrolled
        const isAvailable = existingApplication.length === 0 && existingEnrollment.length === 0;
        
        return {
          ...program,
          isAvailable,
          applicationStatus: existingApplication.length > 0 ? existingApplication[0].status : null,
          isEnrolled: existingEnrollment.length > 0
        };
      })
    );

    return {
      success: true,
      data: availablePrograms,
      count: availablePrograms.length
    };
  })
  
  .get('/:id', async ({ params }) => {
    const program = await db.select()
      .from(programs)
      .where(eq(programs.id, parseInt(params.id)))
      .limit(1);
    
    if (!program.length) {
      throw new Error('Program not found');
    }
    
    return {
      success: true,
      data: program[0]
    };
  })
  
  .post('/', async ({ body }) => {
    const newProgram = await db.insert(programs)
      .values(body)
      .returning();
    
    return {
      success: true,
      message: 'Program created',
      data: newProgram[0]
    };
  }, {
    body: t.Object({
      name: t.String(),
      description: t.Optional(t.String()),
      category: t.Optional(t.String()),
      scheduleDays: t.Optional(t.String()),
      location: t.Optional(t.String()),
      instructor: t.Optional(t.String()),
      capacity: t.Optional(t.Number()),
      cost: t.Optional(t.String())
    })
  })
  
  .put('/:id', async ({ params, body }) => {
    const updated = await db.update(programs)
      .set(body)
      .where(eq(programs.id, parseInt(params.id)))
      .returning();
    
    if (!updated.length) {
      throw new Error('Program not found');
    }
    
    return {
      success: true,
      message: 'Program updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      category: t.Optional(t.String()),
      scheduleDays: t.Optional(t.String()),
      location: t.Optional(t.String()),
      instructor: t.Optional(t.String()),
      capacity: t.Optional(t.Number()),
      cost: t.Optional(t.String())
    })
  })
  
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(programs)
      .where(eq(programs.id, parseInt(params.id)))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Program not found');
    }
    
    return {
      success: true,
      message: 'Program deleted'
    };
  }, {
    params: t.Object({ id: t.String() })
  });