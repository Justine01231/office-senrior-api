// src/routes/notifications.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { notifications } from '../db/schema';
import { eq } from 'drizzle-orm';

export const notificationsRoutes = new Elysia({ prefix: '/api/notifications' })
  
  .get('/', async () => {
    const allNotifications = await db.select().from(notifications);
    return {
      success: true,
      data: allNotifications,
      count: allNotifications.length
    };
  })
  
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorNotifications = await db.select()
      .from(notifications)
      .where(eq(notifications.seniorId, parseInt(params.seniorId)));
    
    return {
      success: true,
      data: seniorNotifications,
      count: seniorNotifications.length
    };
  })
  
  .post('/', async ({ body }) => {
    const newNotification = await db.insert(notifications)
      .values({
        seniorId: body.seniorId ? parseInt(body.seniorId) : null,
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
  
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(notifications)
      .where(eq(notifications.id, parseInt(params.id)))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Notification not found');
    }
    
    return {
      success: true,
      message: 'Notification deleted'
    };
  }, {
    params: t.Object({ id: t.String() })
  });