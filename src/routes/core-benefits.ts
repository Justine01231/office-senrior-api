// src/routes/core-benefits.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { coreBenefits, notifications, users } from '../db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireModuleAccess } from '../middleware/module-access';

export const coreBenefitsRoutes = new Elysia({ prefix: '/api/core-benefits' })
  .use(authMiddleware)

  // Get all core benefits (for senior view - shows status)
  .get('/', async ({ user }) => {
    console.log(`🔍 [CORE-BENEFITS] GET /api/core-benefits - User: ${user?.userId || 'Unknown'}`);
    
    const benefits = await db
      .select({
        id: coreBenefits.id,
        name: coreBenefits.name,
        description: coreBenefits.description,
        icon: coreBenefits.icon,
        category: coreBenefits.category,
        isActive: coreBenefits.isActive,
        displayOrder: coreBenefits.displayOrder,
      })
      .from(coreBenefits)
      .orderBy(coreBenefits.displayOrder);
    
    console.log(`✅ [CORE-BENEFITS] Found ${benefits.length} core benefits`);
    return {
      success: true,
      data: benefits,
      count: benefits.length
    };
  })

  // Admin-only: Toggle benefit status  
  .put('/:id/toggle', async ({ params, headers }) => {
    // Manual authentication since middleware isn't working properly
    const authHeader = headers.authorization;
    console.log(`🔐 [CORE-BENEFITS] Auth header:`, authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`❌ [CORE-BENEFITS] No valid auth header`);
      throw new Error('Authorization required');
    }
    
    const token = authHeader.substring(7);
    console.log(`🎫 [CORE-BENEFITS] Token:`, token.substring(0, 20) + '...');
    
    // Use the same JWT verification as auth routes
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
    
    let user;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log(`✅ [CORE-BENEFITS] JWT decoded:`, decoded);
      user = decoded;
    } catch (jwtError: any) {
      console.log(`❌ [CORE-BENEFITS] JWT verification failed:`, jwtError.message);
      throw new Error('Invalid token');
    }
    console.log(`🔐 [CORE-BENEFITS] Toggle request - User:`, user);
    
    if (!user || user.role !== 'admin') {
      console.log(`❌ [CORE-BENEFITS] Access denied - User: ${user?.userId || 'none'}, Role: ${user?.role || 'none'}`);
      throw new Error('Admin access required');
    }
    
    console.log(`✅ [CORE-BENEFITS] Admin access granted - User: ${user.userId}, Role: ${user.role}`);
    
    const benefitId = parseInt(params.id);
    console.log(`🔄 [CORE-BENEFITS] Toggling benefit ${benefitId} by admin ${user.userId}`);
    
    // Get current benefit
    const currentBenefit = await db
      .select()
      .from(coreBenefits)
      .where(eq(coreBenefits.id, benefitId))
      .limit(1);
    
    if (!currentBenefit.length) {
      throw new Error('Benefit not found');
    }
    
    const newStatus = !currentBenefit[0].isActive;
    
    // Update benefit status
    const updated = await db
      .update(coreBenefits)
      .set({
        isActive: newStatus,
        updatedAt: new Date()
      })
      .where(eq(coreBenefits.id, benefitId))
      .returning();
    
    // Create notifications for all seniors
    const allSeniors = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'senior'));
    
    const notificationData = allSeniors.map(senior => ({
      userId: senior.id,
      title: `Benefit ${newStatus ? 'Activated' : 'Deactivated'}`,
      message: `${currentBenefit[0].name} has been ${newStatus ? 'activated' : 'deactivated'} by administration.`,
      type: 'benefit_update',
      relatedId: benefitId,
      createdBy: user.userId
    }));
    
    if (notificationData.length > 0) {
      await db.insert(notifications).values(notificationData);
      console.log(`📢 [CORE-BENEFITS] Created ${notificationData.length} notifications for benefit toggle`);
    }
    
    console.log(`✅ [CORE-BENEFITS] Benefit ${benefitId} ${newStatus ? 'activated' : 'deactivated'}`);
    
    return {
      success: true,
      message: `Benefit ${newStatus ? 'activated' : 'deactivated'}`,
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // Admin-only: Bulk toggle all benefits
  .put('/toggle-all', async ({ body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const { isActive } = body;
    console.log(`🔄 [CORE-BENEFITS] Bulk ${isActive ? 'activating' : 'deactivating'} all benefits by admin ${user.userId}`);
    
    // Update all benefits
    const updated = await db
      .update(coreBenefits)
      .set({
        isActive: isActive,
        updatedAt: new Date()
      })
      .returning();
    
    // Create notifications for all seniors
    const allSeniors = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'senior'));
    
    const notificationData = allSeniors.map(senior => ({
      userId: senior.id,
      title: `All Benefits ${isActive ? 'Activated' : 'Deactivated'}`,
      message: `All core benefits have been ${isActive ? 'activated' : 'deactivated'} by administration.`,
      type: 'benefit_update',
      relatedId: null,
      createdBy: user.userId
    }));
    
    if (notificationData.length > 0) {
      await db.insert(notifications).values(notificationData);
      console.log(`📢 [CORE-BENEFITS] Created ${notificationData.length} bulk notifications`);
    }
    
    console.log(`✅ [CORE-BENEFITS] Bulk ${isActive ? 'activated' : 'deactivated'} ${updated.length} benefits`);
    
    return {
      success: true,
      message: `All benefits ${isActive ? 'activated' : 'deactivated'}`,
      data: updated,
      count: updated.length
    };
  }, {
    body: t.Object({
      isActive: t.Boolean()
    })
  })

  // Admin-only: Update benefit details
  .put('/:id', async ({ params, body, user }) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const benefitId = parseInt(params.id);
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
    
    const updated = await db
      .update(coreBenefits)
      .set(updateData)
      .where(eq(coreBenefits.id, benefitId))
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
      name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      icon: t.Optional(t.String()),
      category: t.Optional(t.String()),
      displayOrder: t.Optional(t.Number())
    })
  });