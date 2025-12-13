// src/routes/appointments.ts
import { Elysia, t } from 'elysia';
import { db } from '../db';
import { appointments, users } from '../db/schema';
import { desc, asc, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

console.log('📅 APPOINTMENTS ROUTES LOADED - NEW CODE IS RUNNING!');

export const appointmentsRoutes = new Elysia({ prefix: '/api/appointments' })
  .use(authMiddleware)
  
  // Get all appointments
  .get('/', async () => {
    try {
      console.log('📅 Getting all appointments');
      
      const appointmentsList = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          type: appointments.type,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorPhone: users.phone,
          date: appointments.appointmentDate,
          time: appointments.appointmentTime,
          location: appointments.location,
          notes: appointments.notes,
          status: appointments.status,
          doctorName: appointments.doctorName,
          contactPhone: appointments.contactPhone,
          duration: appointments.duration,
          seniorId: appointments.seniorId,
          staffId: appointments.staffId,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.seniorId, users.id))
        .orderBy(desc(appointments.appointmentDate), asc(appointments.appointmentTime));
      
      console.log('📅 Found appointments:', appointmentsList.length);
      console.log('📅 Sample appointment data:', appointmentsList[0]);
      
      // Format the data for Android app compatibility
      const formattedAppointments = appointmentsList.map(apt => ({
        id: apt.id,
        title: apt.title,
        type: apt.type,
        seniorName: apt.seniorName && apt.seniorLastName ? `${apt.seniorName} ${apt.seniorLastName}` : 'Unknown Senior',
        seniorPhone: apt.seniorPhone || '',
        date: apt.date,
        time: apt.time,
        location: apt.location || '',
        notes: apt.notes || '',
        status: apt.status || 'scheduled',
        doctorName: apt.doctorName || '',
        contactPhone: apt.contactPhone || '',
        duration: apt.duration || 30,
        seniorId: apt.seniorId,
        staffId: apt.staffId,
      }));
      
      console.log('📅 Formatted appointment sample:', formattedAppointments[0]);
      
      return {
        success: true,
        data: formattedAppointments,
        count: formattedAppointments.length
      };
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      return {
        success: false,
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })
  
  // Create new appointment
  .post('/', async ({ body }) => {
    try {
      console.log('📅 Creating appointment:', body);
      
      const newAppointment = await db.insert(appointments).values({
        seniorId: body.seniorId,
        staffId: body.staffId || null,
        title: body.title,
        type: body.type,
        description: body.description || null,
        appointmentDate: body.appointmentDate,
        appointmentTime: body.appointmentTime,
        duration: body.duration || 30,
        location: body.location || null,
        doctorName: body.doctorName || null,
        contactPhone: body.contactPhone || null,
        status: body.status || 'scheduled',
        notes: body.notes || null,
      }).returning();
      
      if (!newAppointment[0]) {
        throw new Error('Failed to create appointment');
      }
      
      console.log('✅ Appointment created:', newAppointment[0]);
      
      // Get the complete appointment data with senior information
      const completeAppointmentResult = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          type: appointments.type,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorPhone: users.phone,
          date: appointments.appointmentDate,
          time: appointments.appointmentTime,
          location: appointments.location,
          notes: appointments.notes,
          status: appointments.status,
          doctorName: appointments.doctorName,
          contactPhone: appointments.contactPhone,
          duration: appointments.duration,
          seniorId: appointments.seniorId,
          staffId: appointments.staffId,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.seniorId, users.id))
        .where(eq(appointments.id, newAppointment[0].id));
      
      const completeAppointment = completeAppointmentResult[0];
      
      if (!completeAppointment) {
        throw new Error('Failed to retrieve created appointment');
      }
      
      // Format for Android app compatibility
      const formattedAppointment = {
        id: completeAppointment.id,
        title: completeAppointment.title,
        type: completeAppointment.type,
        seniorName: completeAppointment.seniorName && completeAppointment.seniorLastName 
          ? `${completeAppointment.seniorName} ${completeAppointment.seniorLastName}` 
          : 'Unknown Senior',
        seniorPhone: completeAppointment.seniorPhone || '',
        date: completeAppointment.date,
        time: completeAppointment.time,
        location: completeAppointment.location || '',
        notes: completeAppointment.notes || '',
        status: completeAppointment.status || 'scheduled',
        doctorName: completeAppointment.doctorName || '',
        contactPhone: completeAppointment.contactPhone || '',
        duration: completeAppointment.duration || 30,
        seniorId: completeAppointment.seniorId,
        staffId: completeAppointment.staffId,
      };
      
      console.log('✅ Complete appointment data:', formattedAppointment);
      
      return {
        success: true,
        data: formattedAppointment,
        message: 'Appointment created successfully'
      };
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      return {
        success: false,
        error: 'Failed to create appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      seniorId: t.Number(),
      staffId: t.Optional(t.Number()),
      title: t.String(),
      type: t.String(),
      description: t.Optional(t.String()),
      appointmentDate: t.String(),
      appointmentTime: t.String(),
      duration: t.Optional(t.Number()),
      location: t.Optional(t.String()),
      doctorName: t.Optional(t.String()),
      contactPhone: t.Optional(t.String()),
      status: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    })
  })
  
  // Update appointment details (full update for staff)
  .put('/:id', async ({ params, body }) => {
    try {
      const appointmentId = parseInt(params.id);
      console.log('📅 Updating appointment:', appointmentId, 'with data:', body);
      
      // Update the appointment
      const [updatedAppointment] = await db
        .update(appointments)
        .set({
          title: body.title,
          type: body.type,
          appointmentDate: body.appointmentDate,
          appointmentTime: body.appointmentTime,
          location: body.location,
          notes: body.notes,
          updatedAt: new Date()
        })
        .where(eq(appointments.id, appointmentId))
        .returning();
      
      if (!updatedAppointment) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }
      
      console.log('✅ Appointment updated:', updatedAppointment);
      
      // Get the complete appointment data with senior information
      const completeAppointmentResult = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          type: appointments.type,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorPhone: users.phone,
          date: appointments.appointmentDate,
          time: appointments.appointmentTime,
          location: appointments.location,
          notes: appointments.notes,
          status: appointments.status,
          doctorName: appointments.doctorName,
          contactPhone: appointments.contactPhone,
          duration: appointments.duration,
          seniorId: appointments.seniorId,
          staffId: appointments.staffId,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.seniorId, users.id))
        .where(eq(appointments.id, appointmentId));
      
      const completeAppointment = completeAppointmentResult[0];
      
      if (!completeAppointment) {
        throw new Error('Failed to retrieve updated appointment');
      }
      
      // Format for Android app compatibility
      const formattedAppointment = {
        id: completeAppointment.id,
        title: completeAppointment.title,
        type: completeAppointment.type,
        seniorName: completeAppointment.seniorName && completeAppointment.seniorLastName 
          ? `${completeAppointment.seniorName} ${completeAppointment.seniorLastName}` 
          : 'Unknown Senior',
        seniorPhone: completeAppointment.seniorPhone || '',
        date: completeAppointment.date,
        time: completeAppointment.time,
        location: completeAppointment.location || '',
        notes: completeAppointment.notes || '',
        status: completeAppointment.status || 'scheduled',
        doctorName: completeAppointment.doctorName || '',
        contactPhone: completeAppointment.contactPhone || '',
        duration: completeAppointment.duration || 30,
        seniorId: completeAppointment.seniorId,
        staffId: completeAppointment.staffId,
      };
      
      console.log('✅ Updated appointment data:', formattedAppointment);
      
      return {
        success: true,
        data: formattedAppointment,
        message: 'Appointment updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      return {
        success: false,
        error: 'Failed to update appointment',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      title: t.String(),
      type: t.String(),
      appointmentDate: t.String(),
      appointmentTime: t.String(),
      location: t.Optional(t.String()),
      notes: t.Optional(t.String()),
    })
  })
  
  // Update appointment status
  .put('/:id/status', async ({ params, body }) => {
    try {
      const appointmentId = parseInt(params.id);
      console.log('📅 Updating appointment status:', appointmentId, 'to:', body.status);
      
      // Update the appointment status
      const [updatedAppointment] = await db
        .update(appointments)
        .set({ status: body.status })
        .where(eq(appointments.id, appointmentId))
        .returning();
      
      if (!updatedAppointment) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }
      
      console.log('✅ Appointment status updated:', updatedAppointment);
      
      // Get the complete appointment data with senior information
      const completeAppointmentResult = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          type: appointments.type,
          seniorName: users.firstName,
          seniorLastName: users.lastName,
          seniorPhone: users.phone,
          date: appointments.appointmentDate,
          time: appointments.appointmentTime,
          location: appointments.location,
          notes: appointments.notes,
          status: appointments.status,
          doctorName: appointments.doctorName,
          contactPhone: appointments.contactPhone,
          duration: appointments.duration,
          seniorId: appointments.seniorId,
          staffId: appointments.staffId,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.seniorId, users.id))
        .where(eq(appointments.id, appointmentId));
      
      const completeAppointment = completeAppointmentResult[0];
      
      if (!completeAppointment) {
        throw new Error('Failed to retrieve updated appointment');
      }
      
      // Format for Android app compatibility
      const formattedAppointment = {
        id: completeAppointment.id,
        title: completeAppointment.title,
        type: completeAppointment.type,
        seniorName: completeAppointment.seniorName && completeAppointment.seniorLastName 
          ? `${completeAppointment.seniorName} ${completeAppointment.seniorLastName}` 
          : 'Unknown Senior',
        seniorPhone: completeAppointment.seniorPhone || '',
        date: completeAppointment.date,
        time: completeAppointment.time,
        location: completeAppointment.location || '',
        notes: completeAppointment.notes || '',
        status: completeAppointment.status || 'scheduled',
        doctorName: completeAppointment.doctorName || '',
        contactPhone: completeAppointment.contactPhone || '',
        duration: completeAppointment.duration || 30,
        seniorId: completeAppointment.seniorId,
        staffId: completeAppointment.staffId,
      };
      
      console.log('✅ Updated appointment data:', formattedAppointment);
      
      return {
        success: true,
        data: formattedAppointment,
        message: 'Appointment status updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating appointment status:', error);
      return {
        success: false,
        error: 'Failed to update appointment status',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      status: t.String(),
    })
  })
  
  // Get appointments with reschedule requests capability
  .post('/:id/request-reschedule', async ({ params, body, user }) => {
    try {
      const appointmentId = parseInt(params.id);
      console.log('🔄 Creating reschedule request for appointment:', appointmentId, 'by user:', user?.id);
      
      // Verify the appointment exists
      const appointment = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      
      if (!appointment[0]) {
        return {
          success: false,
          error: 'Appointment not found'
        };
      }
      
      // For seniors, verify they own the appointment
      if (user?.role === 'senior' && appointment[0].seniorId !== user.id) {
        return {
          success: false,
          error: 'You can only request reschedule for your own appointments'
        };
      }
      
      // Create reschedule request via the reschedule-requests route
      const rescheduleData = {
        appointmentId: appointmentId,
        reason: body.reason,
        requestedDate: body.requestedDate,
        requestedTime: body.requestedTime,
      };
      
      // This would typically forward to the reschedule-requests route
      console.log('✅ Reschedule request data prepared:', rescheduleData);
      
      return {
        success: true,
        message: 'Reschedule request can be submitted',
        data: rescheduleData
      };
    } catch (error) {
      console.error('❌ Error preparing reschedule request:', error);
      return {
        success: false,
        error: 'Failed to prepare reschedule request',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, {
    body: t.Object({
      reason: t.String(),
      requestedDate: t.String(),
      requestedTime: t.String(),
    })
  })

  // Get senior appointments
  .get('/seniors/:seniorId', async ({ params, headers }) => {
    try {
      console.log('📅 Getting appointments for senior:', params.seniorId);
      
      const seniorId = parseInt(params.seniorId);
      
      // For now, skip auth verification to test the basic functionality
      // TODO: Implement proper auth check later
      console.log('📅 Auth headers:', headers.authorization);
      
      const appointmentsList = await db
        .select({
          id: appointments.id,
          title: appointments.title,
          type: appointments.type,
          description: appointments.description,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          duration: appointments.duration,
          location: appointments.location,
          doctorName: appointments.doctorName,
          contactPhone: appointments.contactPhone,
          status: appointments.status,
          notes: appointments.notes,
          seniorId: appointments.seniorId,
          staffId: appointments.staffId,
          createdAt: appointments.createdAt,
          updatedAt: appointments.updatedAt
        })
        .from(appointments)
        .where(eq(appointments.seniorId, seniorId))
        .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
      
      console.log(`📅 Found ${appointmentsList.length} appointments for senior ${seniorId}`);
      
      return {
        success: true,
        data: appointmentsList,
        appointments: appointmentsList,  // Keep both for compatibility
        count: appointmentsList.length
      };
      
    } catch (error) {
      console.error('❌ Error fetching senior appointments:', error);
      return {
        success: false,
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });