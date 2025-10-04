// src/routes/programs.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { programs } from '../db/schema';
import { eq } from 'drizzle-orm';

export const programsRoutes = new Elysia({ prefix: '/api/programs' })
  
  .get('/', async () => {
    const allPrograms = await db.select().from(programs);
    return {
      success: true,
      data: allPrograms,
      count: allPrograms.length
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