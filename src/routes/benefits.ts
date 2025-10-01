// src/routes/benefits.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { benefits } from '../db/schema';
import { eq } from 'drizzle-orm';

export const benefitsRoutes = new Elysia({ prefix: '/api/benefits' })
  
  // Get benefits by senior
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorBenefits = await db.select()
      .from(benefits)
      .where(eq(benefits.seniorId, params.seniorId));
    
    return {
      success: true,
      data: seniorBenefits,
      count: seniorBenefits.length
    };
  })
  
  // Create benefit
  .post('/', async ({ body }) => {
    const newBenefit = await db.insert(benefits)
      .values({
        ...body,
        id: crypto.randomUUID()
      })
      .returning();
    
    return {
      success: true,
      message: 'Benefit created',
      data: newBenefit[0]
    };
  }, {
    body: t.Object({
      seniorId: t.String(),
      benefitType: t.String(),
      applicationDate: t.Optional(t.String()),
      renewalDate: t.Optional(t.String()),
      amount: t.Optional(t.String()),
      status: t.Optional(t.String()),
      caseWorker: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  // Update benefit
 // Update benefit
.put('/:id', async ({ params, body }) => {
    const updated = await db.update(benefits)
      .set(body)
      .where(eq(benefits.id, params.id))
      .returning();
    
    if (!updated.length) {
      throw new Error('Benefit not found');
    }
    
    return {
      success: true,
      message: 'Benefit updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      benefitType: t.Optional(t.String()),
      applicationDate: t.Optional(t.String()),
      renewalDate: t.Optional(t.String()),
      amount: t.Optional(t.String()),
      status: t.Optional(t.String()),
      caseWorker: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  // Delete benefit
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(benefits)
      .where(eq(benefits.id, params.id))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Benefit not found');
    }
    
    return {
      success: true,
      message: 'Benefit deleted'
    };
  });