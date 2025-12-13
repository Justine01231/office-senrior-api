// src/routes/notifications.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { notifications, users } from '../db/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'office-seniors-super-secret-jwt-key-2024-change-this-in-production';

export const notificationsRoutes = new Elysia({ prefix: '/api/notifications' })
  .derive(async ({ headers }) => {
    const authorization = headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Unauthorized');
    }
    
    const token = authorization.substring(7);
    try {
      const user = jwt.verify(token, JWT_SECRET) as any;
      return { user };
    } catch {
      throw new Error('Invalid token');
    }
  })
  
  // Get notifications for authenticated user (senior)
  .get('/', async ({ user }) => {
    console.log(`🔍 [NOTIFICATIONS] GET /api/notifications - User: ${user.userId}`);
    
    const userNotifications = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        type: notifications.type,
        relatedId: notifications.relatedId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
        createdByName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.createdBy, users.id))
      .where(eq(notifications.userId, user.userId))
      .orderBy(desc(notifications.createdAt));
    
    console.log(`✅ [NOTIFICATIONS] Found ${userNotifications.length} notifications for user ${user.userId}`);
    
    return {
      success: true,
      data: userNotifications,
      count: userNotifications.length
    };
  })
  
  // Get notification count for authenticated user (for badge display)
  .get('/count', async ({ user }) => {
    console.log(`📊 [NOTIFICATIONS] GET /api/notifications/count - User: ${user.userId}`);
    
    const totalCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, user.userId));
    
    const unreadCount = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, user.userId),
        eq(notifications.isRead, false)
      ));
    
    const counts = {
      total: totalCount[0]?.count || 0,
      unread: unreadCount[0]?.count || 0
    };
    
    console.log(`✅ [NOTIFICATIONS] Count for user ${user.userId}: total=${counts.total}, unread=${counts.unread}`);
    
    return {
      success: true,
      data: counts
    };
  })
  
  // Mark notification as read
  .put('/:id/read', async ({ params, user }) => {
    const notificationId = parseInt(params.id);
    console.log(`📖 [NOTIFICATIONS] Marking notification ${notificationId} as read for user ${user.userId}`);
    
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.userId)
      ))
      .returning();
    
    if (!updated.length) {
      throw new Error('Notification not found or access denied');
    }
    
    console.log(`✅ [NOTIFICATIONS] Notification ${notificationId} marked as read`);
    
    return {
      success: true,
      message: 'Notification marked as read',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() })
  })
  
  // Mark all notifications as read for user
  .put('/mark-all-read', async ({ user }) => {
    console.log(`📖 [NOTIFICATIONS] Marking all notifications as read for user ${user.userId}`);
    
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date()
      })
      .where(and(
        eq(notifications.userId, user.userId),
        eq(notifications.isRead, false)
      ))
      .returning();
    
    console.log(`✅ [NOTIFICATIONS] Marked ${updated.length} notifications as read for user ${user.userId}`);
    
    return {
      success: true,
      message: `${updated.length} notifications marked as read`,
      count: updated.length
    };
  })
  
  // Delete notification (user can delete their own notifications)
  .delete('/:id', async ({ params, user }) => {
    const notificationId = parseInt(params.id);
    console.log(`🗑️ [NOTIFICATIONS] Deleting notification ${notificationId} for user ${user.userId}`);
    
    const deleted = await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.userId)
      ))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Notification not found or access denied');
    }
    
    console.log(`✅ [NOTIFICATIONS] Notification ${notificationId} deleted for user ${user.userId}`);
    
    return {
      success: true,
      message: 'Notification deleted'
    };
  }, {
    params: t.Object({ id: t.String() })
  })
  
  // Admin-only: Create notification for specific user or all users
  .post('/', async ({ body, user }) => {
    console.log(`📝 [NOTIFICATIONS] Creating notification by user ${user.userId}`);
    
    let targetUsers: number[] = [];
    
    if (body.userId) {
      // Single user notification
      targetUsers = [parseInt(body.userId)];
    } else if (body.sendToAllSeniors) {
      // Send to all seniors
      const allSeniors = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'senior'));
      targetUsers = allSeniors.map(senior => senior.id);
    } else {
      throw new Error('Must specify userId or sendToAllSeniors');
    }
    
    const notificationData = targetUsers.map(userId => ({
      userId: userId,
      title: body.title,
      message: body.message,
      type: body.type,
      relatedId: body.relatedId ? parseInt(body.relatedId) : null,
      createdBy: user.userId
    }));
    
    const created = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    
    console.log(`✅ [NOTIFICATIONS] Created ${created.length} notifications`);
    
    return {
      success: true,
      message: `${created.length} notification(s) created`,
      data: created,
      count: created.length
    };
  }, {
    body: t.Object({
      userId: t.Optional(t.String()),
      sendToAllSeniors: t.Optional(t.Boolean()),
      title: t.String(),
      message: t.String(),
      type: t.String(),
      relatedId: t.Optional(t.String())
    })
  });