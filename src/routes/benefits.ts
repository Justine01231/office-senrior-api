// src/routes/benefits.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { benefits, benefitApplications, applicationStatusHistory, users, seniors, staffAssignments } from '../db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { requireModuleAccess } from '../middleware/module-access';
import * as jwt from 'jsonwebtoken';
import { Environment } from '../config/environment';

// Helper: verify JWT directly from Authorization header as a fallback in case
// user is not populated by authMiddleware for some reason. This keeps the
// benefits module working even if middleware composition changes.
function getUserFromHeaders(headers: any): { userId: number; role: string; seniorId?: number } | null {
  const authHeader = headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [BENEFITS] No Authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded: any = jwt.verify(token, Environment.JWT_SECRET);
    console.log('✅ [BENEFITS] JWT verified via local helper for user', decoded.userId, 'role', decoded.role);
    return {
      userId: decoded.userId,
      role: decoded.role,
      seniorId: decoded.seniorId,
    };
  } catch (error: any) {
    console.log('❌ [BENEFITS] JWT verification failed in local helper:', error?.message);
    return null;
  }
}

// Normalize benefit status values to a consistent, lowercase set
// Allowed canonical values: pending, active, approved, rejected, expired, under_review, suspended
const normalizeBenefitStatus = (status?: string | null): string | null => {
  if (!status) return null;
  const s = status.toLowerCase().trim();

  switch (s) {
    case 'pending':
      return 'pending';
    case 'active':
      return 'active';
    case 'approved':
      return 'approved';
    case 'rejected':
    case 'denied':
      return 'rejected';
    case 'expired':
      return 'expired';
    case 'under review':
    case 'under_review':
      return 'under_review';
    case 'suspended':
      return 'suspended';
    default:
      // Fallback: keep original (lowercased) string
      return s;
  }
};

// Map application status to a completion percentage when we are NOT using
// document-based completion. This keeps the rules explicit and easy to tweak.
const getCompletionFromStatus = (status?: string | null): number => {
  const s = (status || '').toLowerCase().trim();
  switch (s) {
    case 'under review':
    case 'under_review':
      return 50;
    case 'incomplete':
      return 70;
    case 'approved':
      return 100;
    case 'rejected':
      return 0;
    case 'pending':
      return 25; // default when user doesn't select explicit status
    default:
      return 25; // treat unknown like pending for now
  }
};

export const benefitsRoutes = new Elysia({ prefix: '/api/benefits' })
  .use(authMiddleware)
  .use(requireModuleAccess)

  .get('/', async ({ headers, query }) => {
    const userId = headers.authorization ? 'Authenticated User' : 'Anonymous';
    const { benefitType, status } = query;
    
    console.log(`🔍 [BENEFITS] GET /api/benefits - User: ${userId} - Fetching benefits (type: ${benefitType || 'all'}, status: ${status || 'all'})`);
    
    // Build conditions for filtering
    const conditions: any[] = [];
    if (benefitType && benefitType !== 'all') {
      conditions.push(eq(benefits.benefitType, benefitType));
    }
    if (status && status !== 'all') {
      conditions.push(eq(benefits.status, status));
    }

    let whereCondition: any = undefined;
    if (conditions.length === 1) {
      whereCondition = conditions[0];
    } else if (conditions.length > 1) {
      whereCondition = and(...conditions);
    }
    
    const allBenefits = await db
      .select({
        id: benefits.id,
        // Expose the senior's USER ID to the Android app for consistency
        seniorId: users.id,
        seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        benefitType: benefits.benefitType,
        applicationDate: benefits.applicationDate,
        renewalDate: benefits.renewalDate,
        amount: benefits.amount,
        status: benefits.status,
        caseWorker: benefits.caseWorker,
        notes: benefits.notes,
        createdAt: benefits.createdAt,
      })
      .from(benefits)
      .leftJoin(seniors, eq(benefits.seniorId, seniors.id))
      .leftJoin(users, eq(seniors.userId, users.id))
      .where(whereCondition);
    
    console.log(`✅ [BENEFITS] GET /api/benefits - Found ${allBenefits.length} benefits - User: ${userId}`);
    return {
      success: true,
      data: allBenefits,
      count: allBenefits.length
    };
  }, {
    query: t.Object({
      benefitType: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorUserId = parseInt(params.seniorId);

    const seniorBenefits = await db
      .select({
        id: benefits.id,
        seniorId: users.id,
        seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        benefitType: benefits.benefitType,
        applicationDate: benefits.applicationDate,
        renewalDate: benefits.renewalDate,
        amount: benefits.amount,
        status: benefits.status,
        caseWorker: benefits.caseWorker,
        notes: benefits.notes,
        createdAt: benefits.createdAt,
      })
      .from(benefits)
      .leftJoin(seniors, eq(benefits.seniorId, seniors.id))
      .leftJoin(users, eq(seniors.userId, users.id))
      .where(eq(users.id, seniorUserId));
    
    return {
      success: true,
      data: seniorBenefits,
      count: seniorBenefits.length
    };
  })
  
  // Get a single benefit by ID (used by Android Edit Benefit screen)
  .get('/:id', async ({ params }) => {
    const benefitId = parseInt(params.id);
    console.log(`🔍 [BENEFITS] GET /api/benefits/${benefitId}`);

    const result = await db
      .select({
        id: benefits.id,
        seniorId: users.id,
        seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        benefitType: benefits.benefitType,
        applicationDate: benefits.applicationDate,
        renewalDate: benefits.renewalDate,
        amount: benefits.amount,
        status: benefits.status,
        caseWorker: benefits.caseWorker,
        notes: benefits.notes,
        createdAt: benefits.createdAt,
      })
      .from(benefits)
      .leftJoin(seniors, eq(benefits.seniorId, seniors.id))
      .leftJoin(users, eq(seniors.userId, users.id))
      .where(eq(benefits.id, benefitId))
      .limit(1);

    if (!result.length) {
      console.log(`❌ [BENEFITS] Benefit not found: ID=${benefitId}`);
      return {
        success: false,
        message: 'Benefit not found'
      };
    }

    console.log(`✅ [BENEFITS] Found benefit: ID=${benefitId}, Type=${result[0]!.benefitType}, Status=${result[0]!.status}`);
    return {
      success: true,
      data: result[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })
  
  .post('/', async ({ body, headers }) => {
    const userId = headers.authorization ? 'Authenticated User' : 'Anonymous';
    console.log(`📝 [BENEFITS] POST /api/benefits - User: ${userId} - Creating benefit for senior ID: ${body.seniorId}`);
    console.log(`📋 [BENEFITS] Benefit Details: Type=${body.benefitType}, Amount=${body.amount}, Status=${body.status}`);
    
    try {
      // First, find the senior record by userId
      console.log(`🔍 [BENEFITS] Looking up senior record for user ID: ${body.seniorId}`);
      const seniorRecord = await db.select()
        .from(seniors)
        .where(eq(seniors.userId, parseInt(body.seniorId)))
        .limit(1);
      
      if (seniorRecord.length === 0) {
        console.log(`❌ [BENEFITS] Senior record not found for user ID: ${body.seniorId}`);
        return {
          success: false,
          message: `No senior record found for user ID ${body.seniorId}`,
          error: 'SENIOR_NOT_FOUND'
        };
      }
      
      console.log(`✅ [BENEFITS] Found senior record: ID=${seniorRecord[0]!.id} for user ID=${body.seniorId}`);
      
      const normalizedStatus = normalizeBenefitStatus(body.status);

      const newBenefit = await db.insert(benefits)
        .values({
          seniorId: seniorRecord[0]!.id, // Use the actual seniors.id
          benefitType: body.benefitType,
          applicationDate: body.applicationDate,
          renewalDate: body.renewalDate,
          amount: body.amount,
          status: normalizedStatus,
          caseWorker: body.caseWorker,
          notes: body.notes
        })
        .returning();
      
      console.log(`🎉 [BENEFITS] Benefit created successfully! ID=${newBenefit[0]?.id}, Type=${body.benefitType}, Amount=${body.amount}`);
      
      return {
        success: true,
        message: 'Benefit created',
        data: newBenefit[0]
      };
    } catch (error) {
      console.error(`💥 [BENEFITS] Error creating benefit for user ${body.seniorId}:`, error);
      return {
        success: false,
        message: 'Failed to create benefit',
        error: error.message
      };
    }
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
  
  .put('/:id', async ({ params, body }) => {
    const updateData: any = {};

    if (typeof body.benefitType !== 'undefined') updateData.benefitType = body.benefitType;
    if (typeof body.applicationDate !== 'undefined') updateData.applicationDate = body.applicationDate;
    if (typeof body.renewalDate !== 'undefined') updateData.renewalDate = body.renewalDate;
    if (typeof body.amount !== 'undefined') updateData.amount = body.amount;
    if (typeof body.status !== 'undefined') updateData.status = normalizeBenefitStatus(body.status);
    if (typeof body.caseWorker !== 'undefined') updateData.caseWorker = body.caseWorker;
    if (typeof body.notes !== 'undefined') updateData.notes = body.notes;

    const updated = await db.update(benefits)
      .set(updateData)
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
  })

  // ========================================
  // BENEFIT APPLICATIONS ENDPOINTS
  // ========================================

  // Get all benefit applications with senior details. Completion is derived
  // from status (not documents).
  .get('/applications', async ({ query }) => {
    const { status, applicationType, priority, limit = '50', offset = '0' } = query;

    const conditions: any[] = [];
    if (status && status !== 'all') {
      conditions.push(eq(benefitApplications.status, status));
    }
    if (applicationType && applicationType !== 'all') {
      conditions.push(eq(benefitApplications.applicationType, applicationType));
    }
    if (priority && priority !== 'all') {
      conditions.push(eq(benefitApplications.priority, priority));
    }

    let whereCondition: any = undefined;
    if (conditions.length === 1) {
      whereCondition = conditions[0];
    } else if (conditions.length > 1) {
      whereCondition = and(...conditions);
    }

    const applications = await db.select({
      id: benefitApplications.id,
      seniorId: benefitApplications.seniorId,
      seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      applicationType: benefitApplications.applicationType,
      applicationDate: benefitApplications.applicationDate,
      status: benefitApplications.status,
      statusUpdatedAt: benefitApplications.statusUpdatedAt,
      priority: benefitApplications.priority,
      estimatedAmount: benefitApplications.estimatedAmount,
      notes: benefitApplications.notes,
      assignedTo: benefitApplications.assignedTo,
      createdAt: benefitApplications.createdAt,
    })
      .from(benefitApplications)
      .leftJoin(users, eq(benefitApplications.seniorId, users.id))
      .where(whereCondition)
      .orderBy(desc(benefitApplications.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const applicationsWithCompletion = applications.map(app => ({
      ...app,
      completionPercentage: getCompletionFromStatus(app.status),
    }));

    return {
      success: true,
      data: applicationsWithCompletion,
      count: applicationsWithCompletion.length
    };
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      applicationType: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String())
    })
  })

  // Get single benefit application by ID with full details. Completion is
  // derived from status (not documents).
  .get('/applications/:id', async ({ params }) => {
    const applicationId = parseInt(params.id);
    
    const application = await db.select({
      id: benefitApplications.id,
      seniorId: benefitApplications.seniorId,
      seniorName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      seniorEmail: users.email,
      seniorPhone: users.phone,
      applicationType: benefitApplications.applicationType,
      applicationDate: benefitApplications.applicationDate,
      status: benefitApplications.status,
      statusUpdatedAt: benefitApplications.statusUpdatedAt,
      statusReason: benefitApplications.statusReason,
      priority: benefitApplications.priority,
      estimatedAmount: benefitApplications.estimatedAmount,
      notes: benefitApplications.notes,
      assignedTo: benefitApplications.assignedTo,
      createdAt: benefitApplications.createdAt,
      updatedAt: benefitApplications.updatedAt,
    })
      .from(benefitApplications)
      .leftJoin(users, eq(benefitApplications.seniorId, users.id))
      .where(eq(benefitApplications.id, applicationId))
      .limit(1);

    if (!application.length) {
      throw new Error('Application not found');
    }

    const appData = application[0];
    const completionPercentage = getCompletionFromStatus(appData.status);

    return {
      success: true,
      data: {
        ...appData,
        completionPercentage
      }
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // Get application statistics for dashboard
  .get('/applications/stats', async () => {
    const stats = await db.select({
      status: benefitApplications.status,
      count: count()
    })
    .from(benefitApplications)
    .groupBy(benefitApplications.status);

    const totalApplications = await db.select({ count: count() }).from(benefitApplications);
    
    return {
      success: true,
      data: {
        total: totalApplications[0]?.count || 0,
        byStatus: stats
      }
    };
  })

  // Create new benefit application
  .post('/applications', async ({ body }) => {
    const newApplication = await db.insert(benefitApplications)
      .values({
        seniorId: parseInt(body.seniorId),
        applicationType: body.applicationType,
        applicationDate: body.applicationDate,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        estimatedAmount: body.estimatedAmount,
        notes: body.notes,
        assignedTo: body.assignedTo ? parseInt(body.assignedTo) : null
      })
      .returning();

    return {
      success: true,
      message: 'Benefit application created',
      data: newApplication[0]
    };
  }, {
    body: t.Object({
      seniorId: t.String(),
      applicationType: t.String(),
      applicationDate: t.String(),
      status: t.Optional(t.String()),
      priority: t.Optional(t.String()),
      estimatedAmount: t.Optional(t.String()),
      notes: t.Optional(t.String()),
      assignedTo: t.Optional(t.String())
    })
  })

  // Update application status with history tracking
  .put('/applications/:id/status', async ({ params, body, user }) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    const applicationId = parseInt(params.id);
    
    // Get current application
    const currentApp = await db.select()
      .from(benefitApplications)
      .where(eq(benefitApplications.id, applicationId))
      .limit(1);

    if (!currentApp.length) {
      throw new Error('Application not found');
    }

    const previousStatus = currentApp[0].status;
    
    // Update application status
    const updated = await db.update(benefitApplications)
      .set({
        status: body.newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: user.userId,
        statusReason: body.reason
      })
      .where(eq(benefitApplications.id, applicationId))
      .returning();

    // Record status change in history
    await db.insert(applicationStatusHistory)
      .values({
        applicationId: applicationId,
        previousStatus: previousStatus,
        newStatus: body.newStatus,
        reason: body.reason,
        updatedBy: user.userId
      });

    return {
      success: true,
      message: 'Application status updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      newStatus: t.String(),
      reason: t.Optional(t.String())
    })
  })

  // Get application status history
  .get('/applications/:id/history', async ({ params }) => {
    const history = await db.select({
      id: applicationStatusHistory.id,
      previousStatus: applicationStatusHistory.previousStatus,
      newStatus: applicationStatusHistory.newStatus,
      reason: applicationStatusHistory.reason,
      updatedBy: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      updatedAt: applicationStatusHistory.updatedAt
    })
    .from(applicationStatusHistory)
    .leftJoin(users, eq(applicationStatusHistory.updatedBy, users.id))
    .where(eq(applicationStatusHistory.applicationId, parseInt(params.id)))
    .orderBy(desc(applicationStatusHistory.updatedAt));

    return {
      success: true,
      data: history
    };
  }, {
    params: t.Object({ id: t.String() })
  })

// Delete benefit application
  .delete('/applications/:id', async ({ params, user, headers, set }) => {
    const effectiveUser = user || getUserFromHeaders(headers);
    if (!effectiveUser) {
      console.log('🚫 [DELETE-APPLICATION] Authentication required');
      set.status = 401;
      return {
        success: false,
        error: 'Authentication required',
        message: 'Invalid or missing authentication token',
      };
    }
    
    const applicationId = parseInt(params.id);
    
    // Check if application exists
    const existing = await db.select()
      .from(benefitApplications)
      .where(eq(benefitApplications.id, applicationId))
      .limit(1);

    if (!existing.length) {
      throw new Error('Application not found');
    }

    // Delete application (CASCADE will handle related records)
    const deleted = await db.delete(benefitApplications)
      .where(eq(benefitApplications.id, applicationId))
      .returning();

    console.log(`🗑️ Application deleted: ID=${applicationId} by user ${effectiveUser.userId}`);

    return {
      success: true,
      message: 'Benefit application deleted',
      data: deleted[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // ========================================
  // REPORTS & ANALYTICS ENDPOINTS
  // ========================================

  // Get benefits reports/analytics
  .get('/reports', async ({ query }) => {
    const applicationDocs = await db.select()
      .from(documents)
      .where(eq(documents.applicationId, parseInt(params.id)))
      .orderBy(desc(documents.createdAt));

    return {
      success: true,
      data: applicationDocs,
      count: applicationDocs.length
    };
  }, {
    params: t.Object({ id: t.String() })
  })

  // Create/Upload document
  .post('/applications/:id/documents', async ({ params, body, user }) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    const newDocument = await db.insert(documents)
      .values({
        applicationId: parseInt(params.id),
        seniorId: parseInt(body.seniorId),
        name: body.name,
        description: body.description,
        documentType: body.documentType,
        status: body.status || 'submitted',
        fileName: body.fileName,
        filePath: body.filePath,
        fileSize: body.fileSize ? parseInt(body.fileSize) : null,
        mimeType: body.mimeType,
        uploadedBy: user.userId,
        uploadedAt: new Date()
      })
      .returning();

    return {
      success: true,
      message: 'Document uploaded',
      data: newDocument[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      seniorId: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      documentType: t.String(),
      status: t.Optional(t.String()),
      fileName: t.Optional(t.String()),
      filePath: t.Optional(t.String()),
      fileSize: t.Optional(t.String()),
      mimeType: t.Optional(t.String())
    })
  })

  // Update document status
  .put('/documents/:id/status', async ({ params, body, user }) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    const updated = await db.update(documents)
      .set({
        status: body.status,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
        reviewNotes: body.reviewNotes
      })
      .where(eq(documents.id, parseInt(params.id)))
      .returning();

    if (!updated.length) {
      throw new Error('Document not found');
    }

    return {
      success: true,
      message: 'Document status updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      status: t.String(),
      reviewNotes: t.Optional(t.String())
    })
  })

  // ========================================
  // REPORTS & ANALYTICS ENDPOINTS
  // ========================================

  // Get benefits reports/analytics
  .get('/reports', async ({ query }) => {
    const { period = 'this_month', startDate, endDate } = query;
    
    let dateCondition;
    const now = new Date();
    
    if (period === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      dateCondition = and(
        sql`${benefitApplications.applicationDate} >= ${startOfMonth.toISOString().split('T')[0]}`,
        sql`${benefitApplications.applicationDate} <= ${endOfMonth.toISOString().split('T')[0]}`
      );
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateCondition = and(
        sql`${benefitApplications.applicationDate} >= ${startOfLastMonth.toISOString().split('T')[0]}`,
        sql`${benefitApplications.applicationDate} <= ${endOfLastMonth.toISOString().split('T')[0]}`
      );
    } else if (period === 'custom' && startDate && endDate) {
      dateCondition = and(
        sql`${benefitApplications.applicationDate} >= ${startDate}`,
        sql`${benefitApplications.applicationDate} <= ${endDate}`
      );
    }

    // Get overview statistics
    const totalApps = await db.select({ count: count() })
      .from(benefitApplications)
      .where(dateCondition);

    const statusStats = await db.select({
      status: benefitApplications.status,
      count: count()
    })
    .from(benefitApplications)
    .where(dateCondition)
    .groupBy(benefitApplications.status);

    // Get benefits breakdown by type
    const typeBreakdown = await db.select({
      applicationType: benefitApplications.applicationType,
      count: count()
    })
    .from(benefitApplications)
    .where(dateCondition)
    .groupBy(benefitApplications.applicationType);

    // Calculate approval rate
    const approvedCount = statusStats.find(s => s.status === 'approved')?.count || 0;
    const totalCount = totalApps[0]?.count || 0;
    const approvalRate = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

    // Calculate actual average processing time (days from application to status update for approved/rejected)
    const processingTimeResult = await db
      .select({
        avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${benefitApplications.statusUpdatedAt} - ${benefitApplications.createdAt})) / 86400)`
      })
      .from(benefitApplications)
      .where(
        and(
          dateCondition,
          sql`${benefitApplications.status} IN ('approved', 'rejected')`,
          sql`${benefitApplications.statusUpdatedAt} IS NOT NULL`
        )
      );

    const avgProcessingDays = processingTimeResult[0]?.avgDays 
      ? Math.round(processingTimeResult[0].avgDays) 
      : 0;

    return {
      success: true,
      data: {
        period,
        overview: {
          totalApplications: totalCount,
          byStatus: statusStats,
          approvalRate: Math.round(approvalRate * 10) / 10
        },
        breakdown: {
          byType: typeBreakdown
        },
        performance: {
          approvalRate: Math.round(approvalRate * 10) / 10,
          avgProcessingDays: avgProcessingDays
        }
      }
    };
  }, {
    query: t.Object({
      period: t.Optional(t.String()),
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String())
    })
  });
