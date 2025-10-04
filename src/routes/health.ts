// src/routes/health.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { healthRecords } from '../db/schema';
import { eq } from 'drizzle-orm';

export const healthRoutes = new Elysia({ prefix: '/api/health' })

  .get('/', async () => {
  const allRecords = await db.select().from(healthRecords);
  return {
    success: true,
    data: allRecords,
    count: allRecords.length
  };
})
  
  .get('/senior/:seniorId', async ({ params }) => {
    const records = await db.select()
      .from(healthRecords)
      .where(eq(healthRecords.seniorId, parseInt(params.seniorId)));
    
    return {
      success: true,
      data: records,
      count: records.length
    };
  }, {
    params: t.Object({
      seniorId: t.String()
    })
  })
  
  .post('/', async ({ body }) => {
    const newRecord = await db.insert(healthRecords)
      .values({
        seniorId: parseInt(body.seniorId),
        type: body.type,
        title: body.title,
        description: body.description,
        dateTime: body.dateTime ? new Date(body.dateTime) : null,
        reminderTime: body.reminderTime,
        dosage: body.dosage,
        notes: body.notes
      })
      .returning();
    
    return {
      success: true,
      message: 'Health record created',
      data: newRecord[0]
    };
  }, {
    body: t.Object({
      seniorId: t.String(),
      type: t.String(),
      title: t.String(),
      description: t.Optional(t.String()),
      dateTime: t.Optional(t.String()),
      reminderTime: t.Optional(t.String()),
      dosage: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  .put('/:id', async ({ params, body }) => {
    const updateData: any = {};
    
    if (body.type) updateData.type = body.type;
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dateTime) updateData.dateTime = new Date(body.dateTime);
    if (body.reminderTime) updateData.reminderTime = body.reminderTime;
    if (body.dosage) updateData.dosage = body.dosage;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;
    
    const updated = await db.update(healthRecords)
      .set(updateData)
      .where(eq(healthRecords.id, parseInt(params.id)))
      .returning();
    
    if (!updated.length) {
      throw new Error('Health record not found');
    }
    
    return {
      success: true,
      message: 'Health record updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      type: t.Optional(t.String()),
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      dateTime: t.Optional(t.String()),
      reminderTime: t.Optional(t.String()),
      dosage: t.Optional(t.String()),
      notes: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(healthRecords)
      .where(eq(healthRecords.id, parseInt(params.id)))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Health record not found');
    }
    
    return {
      success: true,
      message: 'Health record deleted'
    };
  }, {
    params: t.Object({ id: t.String() })
  });