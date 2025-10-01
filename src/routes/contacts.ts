// src/routes/contacts.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { contacts } from '../db/schema';
import { eq } from 'drizzle-orm';

export const contactsRoutes = new Elysia({ prefix: '/api/contacts' })
  
  // Get contacts by senior
  .get('/senior/:seniorId', async ({ params }) => {
    const seniorContacts = await db.select()
      .from(contacts)
      .where(eq(contacts.seniorId, params.seniorId));
    
    return {
      success: true,
      data: seniorContacts,
      count: seniorContacts.length
    };
  })
  
  // Create contact
  .post('/', async ({ body }) => {
    const newContact = await db.insert(contacts)
      .values({
        ...body,
        id: crypto.randomUUID()
      })
      .returning();
    
    return {
      success: true,
      message: 'Contact created',
      data: newContact[0]
    };
  }, {
    body: t.Object({
      seniorId: t.String(),
      name: t.String(),
      phone: t.Optional(t.String()),
      email: t.Optional(t.String()),
      relationship: t.Optional(t.String()),
      role: t.Optional(t.String()),
      isEmergency: t.Optional(t.Boolean())
    })
  })
  
  // Update contact
.put('/:id', async ({ params, body }) => {
    const updated = await db.update(contacts)
      .set(body)
      .where(eq(contacts.id, params.id))
      .returning();
    
    if (!updated.length) {
      throw new Error('Contact not found');
    }
    
    return {
      success: true,
      message: 'Contact updated',
      data: updated[0]
    };
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      email: t.Optional(t.String()),
      relationship: t.Optional(t.String()),
      role: t.Optional(t.String()),
      isEmergency: t.Optional(t.Boolean())
    })
  })
  
  // Delete contact
  .delete('/:id', async ({ params }) => {
    const deleted = await db.delete(contacts)
      .where(eq(contacts.id, params.id))
      .returning();
    
    if (!deleted.length) {
      throw new Error('Contact not found');
    }
    
    return {
      success: true,
      message: 'Contact deleted'
    };
  });