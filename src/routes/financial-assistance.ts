// src/routes/financial-assistance.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { financialDistributions, users, seniors, notifications } from '../db/schema';
import { eq, desc, and, sql, count, or } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { Environment } from '../config/environment';

// Helper: verify JWT directly from Authorization header
function getUserFromHeaders(headers: any): { userId: number; role: string; seniorId?: number } | null {
  const authHeader = headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [FINANCIAL-ASSISTANCE] No Authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded: any = jwt.verify(token, Environment.JWT_SECRET);
    console.log('✅ [FINANCIAL-ASSISTANCE] JWT verified for user', decoded.userId, 'role', decoded.role);
    return {
      userId: decoded.userId,
      role: decoded.role,
      seniorId: decoded.seniorId,
    };
  } catch (error: any) {
    console.log('❌ [FINANCIAL-ASSISTANCE] JWT verification failed:', error?.message);
    return null;
  }
}

export const financialAssistanceRoutes = new Elysia({ prefix: '/api/financial-assistance' })
  
  // Admin: Get all financial distributions with filters
  .get('/', async ({ headers, query, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      console.log('❌ [FINANCIAL-ASSISTANCE] Access denied - Admin/Staff only');
      set.status = 403;
      return {
        success: false,
        message: 'Admin or staff access required'
      };
    }

    const { status, seniorId } = query;
    console.log(`🔍 [FINANCIAL-ASSISTANCE] GET / - Admin: ${user.userId}, Filters:`, { status, seniorId });

    // Build where conditions
    const conditions: any[] = [];
    if (status && status !== 'all') {
      conditions.push(eq(financialDistributions.status, status));
    }
    if (seniorId) {
      conditions.push(eq(financialDistributions.seniorId, parseInt(seniorId)));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Get distributions with senior details
    const distributions = await db
      .select({
        id: financialDistributions.id,
        seniorId: financialDistributions.seniorId,
        seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        seniorInitials: sql<string>`UPPER(LEFT(${users.firstName}, 1) || LEFT(${users.lastName}, 1))`,
        amount: financialDistributions.amount,
        distributionDate: financialDistributions.distributionDate,
        status: financialDistributions.status,
        claimedDate: financialDistributions.claimedDate,
        category: financialDistributions.category,
        description: financialDistributions.description,
        createdBy: financialDistributions.createdBy,
        createdAt: financialDistributions.createdAt,
      })
      .from(financialDistributions)
      .leftJoin(users, eq(financialDistributions.seniorId, users.id))
      .where(whereCondition)
      .orderBy(desc(financialDistributions.distributionDate));

    console.log(`✅ [FINANCIAL-ASSISTANCE] Found ${distributions.length} distributions`);
    
    return {
      success: true,
      data: distributions,
      count: distributions.length
    };
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      seniorId: t.Optional(t.String())
    })
  })

  // Admin: Get statistics
  .get('/stats', async ({ headers, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
      set.status = 403;
      return {
        success: false,
        message: 'Admin or staff access required'
      };
    }

    console.log(`📊 [FINANCIAL-ASSISTANCE] GET /stats - Admin: ${user.userId}`);

    // Get all distributions
    const allDistributions = await db
      .select({
        amount: financialDistributions.amount,
        status: financialDistributions.status,
      })
      .from(financialDistributions);

    // Calculate statistics
    let totalDistributed = 0;
    let totalClaimed = 0;
    let totalUnclaimed = 0;
    let unclaimedCount = 0;

    allDistributions.forEach(dist => {
      const amount = parseFloat(dist.amount);
      totalDistributed += amount;
      
      if (dist.status === 'claimed') {
        totalClaimed += amount;
      } else {
        totalUnclaimed += amount;
        unclaimedCount++;
      }
    });

    const stats = {
      totalDistributed: totalDistributed.toFixed(2),
      totalClaimed: totalClaimed.toFixed(2),
      totalUnclaimed: totalUnclaimed.toFixed(2),
      unclaimedCount,
      totalCount: allDistributions.length
    };

    console.log(`✅ [FINANCIAL-ASSISTANCE] Stats:`, stats);
    
    return {
      success: true,
      data: stats
    };
  })

  // Senior: Get my financial assistance
  .get('/my-assistance', async ({ headers, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || user.role !== 'senior') {
      console.log('❌ [FINANCIAL-ASSISTANCE] Access denied - Seniors only');
      set.status = 403;
      return {
        success: false,
        message: 'Senior access required'
      };
    }

    console.log(`🔍 [FINANCIAL-ASSISTANCE] GET /my-assistance - Senior: ${user.userId}`);

    // Get all distributions for this senior
    const distributions = await db
      .select()
      .from(financialDistributions)
      .where(eq(financialDistributions.seniorId, user.userId))
      .orderBy(desc(financialDistributions.distributionDate));

    // Separate unclaimed and claimed
    const unclaimed = distributions.filter(d => d.status === 'unclaimed');
    const claimed = distributions.filter(d => d.status === 'claimed');

    // Calculate totals
    const totalUnclaimed = unclaimed.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const totalReceived = claimed.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    console.log(`✅ [FINANCIAL-ASSISTANCE] Senior ${user.userId}: ${unclaimed.length} unclaimed, ${claimed.length} claimed`);

    return {
      success: true,
      data: {
        unclaimed,
        claimed,
        totalUnclaimed: totalUnclaimed.toFixed(2),
        totalReceived: totalReceived.toFixed(2),
        unclaimedCount: unclaimed.length
      }
    };
  })

  // Admin: Create new distribution
  .post('/', async ({ headers, body, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || user.role !== 'admin') {
      console.log('❌ [FINANCIAL-ASSISTANCE] Access denied - Admin only');
      set.status = 403;
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    const { seniorId, amount, category, distributionDate, description } = body;
    console.log(`➕ [FINANCIAL-ASSISTANCE] POST / - Creating distribution for senior ${seniorId} by admin ${user.userId}`);

    // Validate senior exists
    const senior = await db
      .select()
      .from(users)
      .where(eq(users.id, seniorId))
      .limit(1);

    console.log(`🔍 [FINANCIAL-ASSISTANCE] Senior lookup for ID ${seniorId}:`, senior);

    if (!senior.length) {
      console.log(`❌ [FINANCIAL-ASSISTANCE] Senior with ID ${seniorId} not found in database`);
      set.status = 404;
      return {
        success: false,
        message: `Senior with ID ${seniorId} not found`
      };
    }

    // Check if user has senior role
    if (senior[0].role !== 'senior') {
      console.log(`❌ [FINANCIAL-ASSISTANCE] User ID ${seniorId} exists but is not a senior (role: ${senior[0].role})`);
      set.status = 400;
      return {
        success: false,
        message: `User ID ${seniorId} is not a senior (role: ${senior[0].role})`
      };
    }

    try {
      // Create distribution
      const [newDistribution] = await db
        .insert(financialDistributions)
        .values({
          seniorId,
          amount: parseFloat(amount).toFixed(2), // Ensure 2 decimal places
          category,
          distributionDate,
          description: description || null,
          createdBy: user.userId,
          status: 'unclaimed'
        })
        .returning();

      // Create notification for senior
      await db.insert(notifications).values({
        userId: seniorId,
        title: 'New Financial Assistance Available',
        message: `$${newDistribution.amount} ${category} is ready to claim`,
        type: 'financial_assistance',
        relatedId: newDistribution.id,
        createdBy: user.userId
      });

      console.log(`✅ [FINANCIAL-ASSISTANCE] Created distribution ID ${newDistribution.id} - $${newDistribution.amount}`);
      console.log(`📢 [FINANCIAL-ASSISTANCE] Notification sent to senior ${seniorId}`);

      return {
        success: true,
        message: 'Financial assistance created successfully',
        data: newDistribution
      };
    } catch (error: any) {
      console.error(`❌ [FINANCIAL-ASSISTANCE] Database error creating distribution:`, error?.message);
      set.status = 500;
      return {
        success: false,
        message: 'Failed to create financial distribution'
      };
    }
  }, {
    body: t.Object({
      seniorId: t.Number(),
      amount: t.String(),
      category: t.String(),
      distributionDate: t.String(),
      description: t.Optional(t.String())
    })
  })

  // Senior: Claim assistance
  .put('/:id/claim', async ({ headers, params, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || user.role !== 'senior') {
      set.status = 403;
      return {
        success: false,
        message: 'Senior access required'
      };
    }

    const distributionId = parseInt(params.id);
    console.log(`✅ [FINANCIAL-ASSISTANCE] PUT /:id/claim - Senior ${user.userId} claiming distribution ${distributionId}`);

    // Get distribution
    const [distribution] = await db
      .select()
      .from(financialDistributions)
      .where(eq(financialDistributions.id, distributionId))
      .limit(1);

    if (!distribution) {
      set.status = 404;
      return {
        success: false,
        message: 'Distribution not found'
      };
    }

    // Verify it belongs to this senior
    if (distribution.seniorId !== user.userId) {
      set.status = 403;
      return {
        success: false,
        message: 'Unauthorized - this distribution does not belong to you'
      };
    }

    // Verify it's unclaimed
    if (distribution.status === 'claimed') {
      set.status = 400;
      return {
        success: false,
        message: 'This distribution has already been claimed'
      };
    }

    // Update to claimed
    const [updated] = await db
      .update(financialDistributions)
      .set({
        status: 'claimed',
        claimedDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(financialDistributions.id, distributionId))
      .returning();

    console.log(`✅ [FINANCIAL-ASSISTANCE] Distribution ${distributionId} claimed by senior ${user.userId}`);

    return {
      success: true,
      message: 'Financial assistance claimed successfully',
      data: updated
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // Admin: Update distribution status (mark as claimed manually)
  .put('/:id/status', async ({ headers, params, body, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    const distributionId = parseInt(params.id);
    const { status } = body;
    console.log(`🔄 [FINANCIAL-ASSISTANCE] PUT /:id/status - Admin ${user.userId} updating distribution ${distributionId} to ${status}`);

    // Update distribution
    const [updated] = await db
      .update(financialDistributions)
      .set({
        status,
        claimedDate: status === 'claimed' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(financialDistributions.id, distributionId))
      .returning();

    if (!updated) {
      set.status = 404;
      return {
        success: false,
        message: 'Distribution not found'
      };
    }

    console.log(`✅ [FINANCIAL-ASSISTANCE] Distribution ${distributionId} status updated to ${status}`);

    return {
      success: true,
      message: `Distribution marked as ${status}`,
      data: updated
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.String()
    })
  })

  // Admin: Delete distribution
  .delete('/:id', async ({ headers, params, set }) => {
    const user = getUserFromHeaders(headers);
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return {
        success: false,
        message: 'Admin access required'
      };
    }

    const distributionId = parseInt(params.id);
    console.log(`🗑️ [FINANCIAL-ASSISTANCE] DELETE /:id - Admin ${user.userId} deleting distribution ${distributionId}`);

    const deleted = await db
      .delete(financialDistributions)
      .where(eq(financialDistributions.id, distributionId))
      .returning();

    if (!deleted.length) {
      set.status = 404;
      return {
        success: false,
        message: 'Distribution not found'
      };
    }

    console.log(`✅ [FINANCIAL-ASSISTANCE] Distribution ${distributionId} deleted`);

    return {
      success: true,
      message: 'Distribution deleted successfully'
    };
  }, {
    params: t.Object({ id: t.String() })
  });
