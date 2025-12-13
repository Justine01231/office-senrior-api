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
    .put('/:id/toggle', async ({ params, headers, set }) => {
        const benefitId = parseInt(params.id);
        const startTime = Date.now();
        console.log(`\n════════════════════════════════════════════════════`);
        console.log(`🔄 [CORE-BENEFITS-TOGGLE] START - Benefit ID: ${benefitId}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.log(`════════════════════════════════════════════════════`);

        try {
            // Manual authentication since middleware isn't working properly
            const authHeader = headers.authorization;
            console.log(`🔐 [CORE-BENEFITS-TOGGLE] Auth header present: ${!!authHeader}`);

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log(`❌ [CORE-BENEFITS-TOGGLE] FAILED: No valid auth header`);
                set.status = 401;
                return {
                    success: false,
                    message: 'Authorization required',
                    error: 'Missing or invalid Bearer token'
                };
            }

            const token = authHeader.substring(7);
            console.log(`🎫 [CORE-BENEFITS-TOGGLE] Token received: ${token.substring(0, 20)}... (length: ${token.length})`);

            // Use the same JWT verification as auth routes
            const jwt = await import('jsonwebtoken');
            const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

            let user;
            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                console.log(`✅ [CORE-BENEFITS-TOGGLE] JWT decoded successfully`);
                console.log(`   - userId: ${decoded.userId}`);
                console.log(`   - role: ${decoded.role}`);
                console.log(`   - email: ${decoded.email}`);
                user = decoded;
            } catch (jwtError: any) {
                console.log(`❌ [CORE-BENEFITS-TOGGLE] JWT verification FAILED: ${jwtError.message}`);
                set.status = 401;
                return {
                    success: false,
                    message: 'Invalid token',
                    error: jwtError.message
                };
            }

            if (!user || user.role !== 'admin') {
                console.log(`❌ [CORE-BENEFITS-TOGGLE] FAILED: Access denied`);
                console.log(`   - Provided role: ${user?.role || 'none'}`);
                console.log(`   - Required role: admin`);
                set.status = 403;
                return {
                    success: false,
                    message: 'Admin access required',
                    providedRole: user?.role
                };
            }

            console.log(`✅ [CORE-BENEFITS-TOGGLE] Admin verified - User ${user.userId}`);

            // Get current benefit
            console.log(`📍 [CORE-BENEFITS-TOGGLE] Querying database for benefit ${benefitId}...`);
            const currentBenefit = await db
                .select()
                .from(coreBenefits)
                .where(eq(coreBenefits.id, benefitId))
                .limit(1);

            if (!currentBenefit.length) {
                console.log(`❌ [CORE-BENEFITS-TOGGLE] FAILED: Benefit ${benefitId} not found in database`);
                set.status = 404;
                return {
                    success: false,
                    message: 'Benefit not found',
                    benefitId: benefitId
                };
            }

            const oldStatus = currentBenefit[0].isActive;
            const newStatus = !oldStatus;
            const benefitName = currentBenefit[0].name;

            console.log(`📊 [CORE-BENEFITS-TOGGLE] Status change`);
            console.log(`   - Benefit: ${benefitName} (ID: ${benefitId})`);
            console.log(`   - From: ${oldStatus}`);
            console.log(`   - To: ${newStatus}`);

            // Update benefit status
            console.log(`📝 [CORE-BENEFITS-TOGGLE] Updating database...`);
            const updated = await db
                .update(coreBenefits)
                .set({
                    isActive: newStatus,
                    updatedAt: new Date()
                })
                .where(eq(coreBenefits.id, benefitId))
                .returning();

            if (!updated.length) {
                console.log(`❌ [CORE-BENEFITS-TOGGLE] FAILED: Database update returned no rows`);
                set.status = 500;
                return {
                    success: false,
                    message: 'Failed to update benefit status',
                    error: 'Database update failed'
                };
            }

            console.log(`✅ [CORE-BENEFITS-TOGGLE] Database updated successfully`);
            console.log(`   - Updated record: ${JSON.stringify(updated[0])}`);

            // Create notifications for all seniors
            console.log(`📢 [CORE-BENEFITS-TOGGLE] Fetching all seniors for notifications...`);
            const allSeniors = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.role, 'senior'));

            console.log(`📢 [CORE-BENEFITS-TOGGLE] Found ${allSeniors.length} seniors`);

            if (allSeniors.length > 0) {
                const notificationData = allSeniors.map(senior => ({
                    userId: senior.id,
                    title: `Benefit ${newStatus ? 'Activated' : 'Deactivated'}`,
                    message: `${benefitName} has been ${newStatus ? 'activated' : 'deactivated'} by administration.`,
                    type: 'benefit_update',
                    relatedId: benefitId,
                    createdBy: user.userId
                }));

                await db.insert(notifications).values(notificationData);
                console.log(`✅ [CORE-BENEFITS-TOGGLE] Created ${notificationData.length} notifications`);
            }

            const duration = Date.now() - startTime;
            console.log(`════════════════════════════════════════════════════`);
            console.log(`✅ [CORE-BENEFITS-TOGGLE] SUCCESS`);
            console.log(`✅ Benefit ${benefitId} toggled: ${oldStatus} → ${newStatus}`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`════════════════════════════════════════════════════\n`);

            return {
                success: true,
                message: `Benefit ${newStatus ? 'activated' : 'deactivated'}`,
                data: updated[0],
                metadata: {
                    benefitId: benefitId,
                    benefitName: benefitName,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    updatedAt: updated[0].updatedAt,
                    notificationsSent: allSeniors.length,
                    durationMs: duration
                }
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.log(`════════════════════════════════════════════════════`);
            console.log(`❌ [CORE-BENEFITS-TOGGLE] UNEXPECTED ERROR`);
            console.log(`📌 Error: ${error.message}`);
            console.log(`📌 Stack: ${error.stack}`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`════════════════════════════════════════════════════\n`);

            set.status = 500;
            return {
                success: false,
                message: 'Internal server error',
                error: error.message
            };
        }
    }, {
        params: t.Object({ id: t.String() })
    })

    // Admin-only: Bulk toggle all benefits
    .put('/toggle-all', async ({ body, headers, set, user: middlewareUser }) => {
        const startTime = Date.now();
        console.log(`\n════════════════════════════════════════════════════`);
        console.log(`🔄 [CORE-BENEFITS-BULK] START - Bulk toggle`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        console.log(`════════════════════════════════════════════════════`);

        try {
            let user = middlewareUser;

            // Fallback to manual auth if middleware user not available
            if (!user) {
                const authHeader = headers.authorization;
                console.log(`🔐 [CORE-BENEFITS-BULK] Auth header present: ${!!authHeader}`);

                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    console.log(`❌ [CORE-BENEFITS-BULK] FAILED: No valid auth header`);
                    set.status = 401;
                    return {
                        success: false,
                        message: 'Authorization required',
                        error: 'Missing or invalid Bearer token'
                    };
                }

                const token = authHeader.substring(7);
                const jwt = await import('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

                try {
                    const decoded = jwt.verify(token, JWT_SECRET) as any;
                    user = decoded;
                } catch (jwtError: any) {
                    console.log(`❌ [CORE-BENEFITS-BULK] JWT verification FAILED: ${jwtError.message}`);
                    set.status = 401;
                    return {
                        success: false,
                        message: 'Invalid token',
                        error: jwtError.message
                    };
                }
            }

            if (!user || user.role !== 'admin') {
                console.log(`❌ [CORE-BENEFITS-BULK] FAILED: Access denied - Role: ${user?.role || 'none'}`);
                set.status = 403;
                return {
                    success: false,
                    message: 'Admin access required',
                    providedRole: user?.role
                };
            }

            const { isActive } = body;
            console.log(`✅ [CORE-BENEFITS-BULK] Admin verified - User ${user.userId}`);
            console.log(`📊 [CORE-BENEFITS-BULK] Bulk ${isActive ? 'activating' : 'deactivating'} all benefits`);

            // Update all benefits
            console.log(`📝 [CORE-BENEFITS-BULK] Updating database...`);
            const updated = await db
                .update(coreBenefits)
                .set({
                    isActive: isActive,
                    updatedAt: new Date()
                })
                .returning();

            if (!updated.length) {
                console.log(`❌ [CORE-BENEFITS-BULK] FAILED: No benefits were updated`);
                set.status = 500;
                return {
                    success: false,
                    message: 'No benefits to update',
                    error: 'Database update failed'
                };
            }

            console.log(`✅ [CORE-BENEFITS-BULK] Database updated - ${updated.length} benefits`);

            // Create notifications for all seniors
            console.log(`📢 [CORE-BENEFITS-BULK] Fetching all seniors...`);
            const allSeniors = await db
                .select({ id: users.id })
                .from(users)
                .where(eq(users.role, 'senior'));

            console.log(`📢 [CORE-BENEFITS-BULK] Found ${allSeniors.length} seniors`);

            if (allSeniors.length > 0) {
                const notificationData = allSeniors.map(senior => ({
                    userId: senior.id,
                    title: `All Benefits ${isActive ? 'Activated' : 'Deactivated'}`,
                    message: `All core benefits have been ${isActive ? 'activated' : 'deactivated'} by administration.`,
                    type: 'benefit_update',
                    relatedId: null,
                    createdBy: user.userId
                }));

                await db.insert(notifications).values(notificationData);
                console.log(`✅ [CORE-BENEFITS-BULK] Created ${notificationData.length} notifications`);
            }

            const duration = Date.now() - startTime;
            console.log(`════════════════════════════════════════════════════`);
            console.log(`✅ [CORE-BENEFITS-BULK] SUCCESS`);
            console.log(`✅ Bulk ${isActive ? 'activated' : 'deactivated'} ${updated.length} benefits`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`════════════════════════════════════════════════════\n`);

            return {
                success: true,
                message: `All benefits ${isActive ? 'activated' : 'deactivated'}`,
                data: updated,
                count: updated.length,
                metadata: {
                    status: isActive ? 'active' : 'inactive',
                    benefitsUpdated: updated.length,
                    notificationsSent: allSeniors.length,
                    durationMs: duration,
                    updatedAt: new Date().toISOString()
                }
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            console.log(`════════════════════════════════════════════════════`);
            console.log(`❌ [CORE-BENEFITS-BULK] UNEXPECTED ERROR`);
            console.log(`📌 Error: ${error.message}`);
            console.log(`📌 Stack: ${error.stack}`);
            console.log(`⏱️  Duration: ${duration}ms`);
            console.log(`════════════════════════════════════════════════════\n`);

            set.status = 500;
            return {
                success: false,
                message: 'Internal server error',
                error: error.message
            };
        }
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