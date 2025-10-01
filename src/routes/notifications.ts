// src/routes/notifications.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq } from 'drizzle-orm';

export const notificationsRoutes = new Elysia({ prefix: '/api/notifications' })
  
  // Get all notifications
  .get('/', async () => {
    const allNotifications = await db.select().from(notifications);
    return {
      success: true,
      data: allNotifications,
      count: allNotifications.length
    };
  })
  
  // Get notifications by senior
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.seniorId, params.seniorId));
    
    return {
      success: true,
      data: seniorNotifications,
      count: seniorNotifications.length
    };
  })
  
  // Create notification
.post('/', async ({ body }) => {
    const newNotification = await db.insert(notifications)
      .values({
        id: crypto.randomUUID(),
        seniorId: body.seniorId || null,
        title: body.title,
        type: body.type,
        priority: body.priority || 'normal',
        scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : null
      })
      .returning();
    
    return {
      success: true,
      message: 'Notification created',
      data: newNotification[0]
    };
  }, {
    body: t.Object({
      seniorId: t.Optional(t.String()),
      title: t.String(),
      type: t.String(),
      priority: t.Optional(t.String()),
      scheduledTime: t.Optional(t.String())
    })
  })
  
  // Delete notification
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(notifications)
      .where(eq(notifications.id, params.id))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Notification not found');
    }
    
    return {
      success: true,
      message: 'Notification deleted'
    };
  });