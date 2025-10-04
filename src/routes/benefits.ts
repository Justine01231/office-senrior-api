import { Elysia, t } from 'elysia';
import { db } from '../db';
import { benefits } from '../db/schema';
import { eq } from 'drizzle-orm';

export const benefitsRoutes = new Elysia({ prefix: '/api/benefits' })
  
  .get('/', async () => {
    const allBenefits = await db.select()
      .from(benefits);
    
    return {
      success: true,
      data: allBenefits,
      count: allBenefits.length
    };
  })
  
  .get('/:id', async ({ params }) => {
    const benefit = await db.select()
      .from(benefits)
      .where(eq(benefits.id, parseInt(params.id)));
    
    if (!benefit.length) {
      throw new Error('Benefit not found');
    }
    
    return {
      success: true,
      data: benefit[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })
  
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorBenefits = await db.select()
      .from(benefits)
      .where(eq(benefits.seniorId, parseInt(params.seniorId)));
    
    return {
      success: true,
      data: seniorBenefits,
      count: seniorBenefits.length
    };
  })
  
  .post('/', async ({ body }) => {
    const newBenefit = await db.insert(benefits)
      .values({
        seniorId: body.seniorId,
        benefitType: body.benefitType,
        applicationDate: body.applicationDate || null,
        renewalDate: body.renewalDate || null,
        amount: body.amount || null,
        status: body.status || 'pending',
        caseWorker: body.caseWorker || null,
        notes: body.notes || null
      })
      .returning();
    
    return {
      success: true,
      message: 'Benefit created',
      data: newBenefit[0]
    };
  }, {
    body: t.Object({
      seniorId: t.Number(),
      benefitType: t.String(),
      applicationDate: t.Optional(t.String()),
      renewalDate: t.Optional(t.String()),
      amount: t.Optional(t.String()),
      status: t.String(),
      caseWorker: t.Optional(t.String()),
      notes: t.Optional(t.String())
    })
  })
  
  .put('/:id', async ({ params, body }) => {
    const updated = await db.update(benefits)
      .set(body)
      .where(eq(benefits.id, parseInt(params.id)))
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
  
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(benefits)
      .where(eq(benefits.id, parseInt(params.id)))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Benefit not found');
    }
    
    return {
      success: true,
      message: 'Benefit deleted'
    };
  }, {
    params: t.Object({ id: t.String() })
  });