// src/routes/seniors.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { seniors } from '../db/schema';
import { eq } from 'drizzle-orm';

export const seniorsRoutes = new Elysia({ prefix: '/api/seniors' })
  
  // GET all seniors
  .get('/', async () => {
    const allSeniors = await db.select().from(seniors);
    return {
      success: true,
      data: allSeniors,
      count: allSeniors.length
    };
  })
  
  // GET senior by ID
  .get('/:id', async ({ params }) => {
    const senior = await db.select()
      .from(seniors)
      .where(eq(seniors.id, parseInt(params.id)))
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
  
  // POST - Create new senior
  .post('/', async ({ body }) => {
    const newSenior = await db.insert(seniors)
      .values(body)
      .returning();
    
    return {
      success: true,
      message: 'Senior created successfully',
      data: newSenior[0]
    };
  }, {
    body: t.Object({
      firstName: t.String({ minLength: 1 }),
      lastName: t.String({ minLength: 1 }),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      dateOfBirth: t.String(),
      socialSecurity: t.Optional(t.String()),
      emergencyContactName: t.Optional(t.String()),
      emergencyContactPhone: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  // PUT - Update senior
  .put('/:id', async ({ params, body }) => {
    const updated = await db.update(seniors)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(seniors.id, parseInt(params.id)))
      .returning();
    
    if (!updated.length) {
      throw new Error('Senior not found');
    }
    
    return {
      success: true,
      message: 'Senior updated successfully',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      status: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  // DELETE senior
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(seniors)
      .where(eq(seniors.id, parseInt(params.id)))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Senior not found');
    }
    
    return {
      success: true,
      message: 'Senior deleted successfully'
    };
  }, {
    params: t.Object({ id: t.String() })
  });