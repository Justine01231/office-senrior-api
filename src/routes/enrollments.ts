// src/routes/enrollments.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { enrollments } from '../db/schema';
import { eq } from 'drizzle-orm';

export const enrollmentsRoutes = new Elysia({ prefix: '/api/enrollments' })
  
  // Enroll senior in program
  .post('/', async ({ body }) => {
    const enrollment = await db.insert(enrollments)
      .values({
        ...body,
        id: crypto.randomUUID()
      })
      .returning();
    
    return {
      success: true,
      message: 'Senior enrolled successfully',
      data: enrollment[0]
    };
  }, {
    body: t.Object({
      seniorId: t.String(),
      programId: t.String()
    })
  })
  
  // Get enrollments by senior
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorEnrollments = await db.select()
      .from(enrollments)
      .where(eq(enrollments.seniorId, params.seniorId));
    
    return {
      success: true,
      data: seniorEnrollments,
      count: seniorEnrollments.length
    };
  })
  
  // Get enrollments by program
  .get('/program/:programId', async ({ params }) => {
    const programEnrollments = await db.select()
      .from(enrollments)
      .where(eq(enrollments.programId, params.programId));
    
    return {
      success: true,
      data: programEnrollments,
      count: programEnrollments.length
    };
  })
  
 // Update attendance
.patch('/:id/attendance', async ({ params }) => {
    // Get current attendance
    const current = await db.select()
      .from(enrollments)
      .where(eq(enrollments.id, params.id))
      .limit(1);
    
    if (!current.length || !current[0]) {
      throw new Error('Enrollment not found');
    }
    
    const enrollment = current[0];
    const currentCount = enrollment.attendanceCount ?? 0;
    
    // Increment attendance
    const updated = await db.update(enrollments)
      .set({
        attendanceCount: currentCount + 1
      })
      .where(eq(enrollments.id, params.id))
      .returning();
    
    return {
      success: true,
      message: 'Attendance updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })
  
  // Delete enrollment
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(enrollments)
      .where(eq(enrollments.id, params.id))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Enrollment not found');
    }
    
    return {
      success: true,
      message: 'Enrollment deleted'
    };
  });