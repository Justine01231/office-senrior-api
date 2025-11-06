// src/utils/validation.ts
import { t } from 'elysia';

export class ValidationUtils {
  // Sanitize string input
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  // Sanitize email
  static sanitizeEmail(email: string): string {
    if (typeof email !== 'string') return '';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.toLowerCase().trim();
    
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  // Sanitize phone number
  static sanitizePhone(phone: string): string {
    if (typeof phone !== 'string') return '';
    
    return phone.replace(/[^\d+\-\s()]/g, '').substring(0, 20);
  }

  // Validate and sanitize health record data
  static sanitizeHealthRecord(data: any): any {
    return {
      type: this.sanitizeString(data.type),
      title: this.sanitizeString(data.title),
      description: this.sanitizeString(data.description || ''),
      notes: this.sanitizeString(data.notes || ''),
      
      // Medication fields
      medicineName: data.medicineName ? this.sanitizeString(data.medicineName) : undefined,
      dosage: data.dosage ? this.sanitizeString(data.dosage) : undefined,
      frequency: data.frequency ? this.sanitizeString(data.frequency) : undefined,
      
      // Contact fields
      contactName: data.contactName ? this.sanitizeString(data.contactName) : undefined,
      contactPhone: data.contactPhone ? this.sanitizePhone(data.contactPhone) : undefined,
      relationship: data.relationship ? this.sanitizeString(data.relationship) : undefined,
      
      // Preserve other fields as-is (dates, booleans, etc.)
      dateTime: data.dateTime,
      reminderTime: data.reminderTime,
      seniorId: data.seniorId,
      isRecurring: data.isRecurring,
    };
  }
}

// Elysia validation schemas
export const ValidationSchemas = {
  // Health Record validation
  healthRecord: t.Object({
    type: t.String({ minLength: 1, maxLength: 50 }),
    title: t.String({ minLength: 1, maxLength: 200 }),
    description: t.Optional(t.String({ maxLength: 1000 })),
    dateTime: t.Optional(t.String()),
    reminderTime: t.Optional(t.String({ maxLength: 10 })),
    notes: t.Optional(t.String({ maxLength: 2000 })),
    seniorId: t.Optional(t.Number({ minimum: 1 })),
    
    // Medication fields
    medicineName: t.Optional(t.String({ maxLength: 200 })),
    dosage: t.Optional(t.String({ maxLength: 100 })),
    frequency: t.Optional(t.String({ maxLength: 100 })),
    refillDate: t.Optional(t.String()),
    
    // Appointment fields
    doctorName: t.Optional(t.String({ maxLength: 200 })),
    location: t.Optional(t.String({ maxLength: 300 })),
    appointmentDate: t.Optional(t.String()),
    
    // Condition fields
    severity: t.Optional(t.String({ maxLength: 50 })),
    diagnosedDate: t.Optional(t.String()),
    treatment: t.Optional(t.String({ maxLength: 2000 })),
    
    // Test fields
    testType: t.Optional(t.String({ maxLength: 200 })),
    testResults: t.Optional(t.String({ maxLength: 2000 })),
    labFacility: t.Optional(t.String({ maxLength: 200 })),
    testDate: t.Optional(t.String()),
    
    // Vaccination fields
    vaccineName: t.Optional(t.String({ maxLength: 200 })),
    vaccinationDate: t.Optional(t.String()),
    nextDueDate: t.Optional(t.String()),
    vaccineProvider: t.Optional(t.String({ maxLength: 200 })),
    
    // Emergency contact fields
    contactName: t.Optional(t.String({ maxLength: 200 })),
    contactPhone: t.Optional(t.String({ maxLength: 20 })),
    relationship: t.Optional(t.String({ maxLength: 100 })),
    
    // Allergy fields
    allergen: t.Optional(t.String({ maxLength: 200 })),
    reaction: t.Optional(t.String({ maxLength: 500 })),
    allergySeverity: t.Optional(t.String({ maxLength: 50 })),
    
    // Exercise/therapy fields
    activityType: t.Optional(t.String({ maxLength: 200 })),
    duration: t.Optional(t.String({ maxLength: 100 })),
    exerciseFrequency: t.Optional(t.String({ maxLength: 100 })),
    therapist: t.Optional(t.String({ maxLength: 200 })),
    sessionDate: t.Optional(t.String()),
    
    // Recurrence fields
    isRecurring: t.Optional(t.Boolean()),
    recurrencePattern: t.Optional(t.String({ maxLength: 50 })),
    recurrenceTime: t.Optional(t.String({ maxLength: 10 })),
    startDate: t.Optional(t.String()),
    endDate: t.Optional(t.String()),
    recurrenceDays: t.Optional(t.String({ maxLength: 50 })),
  }),

  // User registration validation
  userRegistration: t.Object({
    username: t.String({ minLength: 3, maxLength: 50 }),
    email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
    password: t.String({ minLength: 8, maxLength: 128 }),
    firstName: t.Optional(t.String({ maxLength: 100 })),
    lastName: t.Optional(t.String({ maxLength: 100 })),
    role: t.Optional(t.Union([
      t.Literal('admin'),
      t.Literal('staff'), 
      t.Literal('senior')
    ])),
  }),

  // Login validation
  userLogin: t.Object({
    username: t.String({ minLength: 1, maxLength: 50 }),
    password: t.String({ minLength: 1, maxLength: 128 }),
  }),

  // Profile update validation
  profileUpdate: t.Object({
    firstName: t.Optional(t.String({ maxLength: 100 })),
    lastName: t.Optional(t.String({ maxLength: 100 })),
    phone: t.Optional(t.String({ maxLength: 20 })),
    address: t.Optional(t.String({ maxLength: 500 })),
    dateOfBirth: t.Optional(t.String()),
    gender: t.Optional(t.String({ maxLength: 20 })),
    emergencyContactName: t.Optional(t.String({ maxLength: 100 })),
    emergencyContactPhone: t.Optional(t.String({ maxLength: 20 })),
  }),

  // Assignment validation
  assignment: t.Object({
    staffId: t.Number({ minimum: 1 }),
    seniorId: t.Number({ minimum: 1 }),
  }),

  // Pagination validation
  pagination: t.Object({
    page: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
    limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
  }),
};
