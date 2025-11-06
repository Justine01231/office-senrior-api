// src/db/schema.ts
import { pgTable, serial, varchar, text, date, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// USERS TABLE - Authentication & Profile (Single source of truth)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('senior'), // admin, staff, senior
  department: varchar('department', { length: 50 }), // health_records, benefits, programs, general (for staff only)
  
  // Basic Info (for all users)
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  
  // Senior-specific fields (nullable for staff/admin)
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }), // Male, Female, Other, Prefer not to say
  socialSecurity: varchar('social_security', { length: 50 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 100 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  photoPath: varchar('photo_path', { length: 255 }),
  
  // Staff-specific fields
  position: varchar('position', { length: 100 }), // Staff position: Case Worker, Program Coordinator, etc.
  assignedBy: integer('assigned_by'), // For staff created by admin - references users.id
  
  // Status & Completion tracking
  isActive: boolean('is_active').default(true),
  profileCompleted: boolean('profile_completed').default(false), // NEW: Track profile completion
  emailVerified: boolean('email_verified').default(false),
  
  // Approval workflow (for seniors)
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'), // pending, approved, rejected
  approvedBy: integer('approved_by'), // references users.id (admin who approved)
  approvedAt: timestamp('approved_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SENIORS TABLE - Simplified (relationships & admin notes only)
export const seniors = pgTable('seniors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), // references users.id - CLEAN REFERENCE
  notes: text('notes'), // Admin notes about the senior
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// HEALTH_RECORDS TABLE
export const healthRecords = pgTable('health_records', {
  id: serial('id').primaryKey(),
  seniorId: integer('senior_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  dateTime: timestamp('date_time'),
  reminderTime: varchar('reminder_time', { length: 10 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'),
  
  // Medication specific fields
  medicineName: varchar('medicine_name', { length: 200 }),
  dosage: varchar('dosage', { length: 100 }),
  frequency: varchar('frequency', { length: 100 }),
  refillDate: date('refill_date'),
  
  // Appointment specific fields
  doctorName: varchar('doctor_name', { length: 200 }),
  location: varchar('location', { length: 300 }),
  appointmentDate: timestamp('appointment_date'),
  
  // Condition specific fields
  severity: varchar('severity', { length: 50 }),
  diagnosedDate: date('diagnosed_date'),
  treatment: text('treatment'),
  
  // Test specific fields
  testType: varchar('test_type', { length: 200 }),
  testResults: text('test_results'),
  labFacility: varchar('lab_facility', { length: 200 }),
  testDate: date('test_date'),
  
  // Vaccination specific fields
  vaccineName: varchar('vaccine_name', { length: 200 }),
  vaccinationDate: date('vaccination_date'),
  nextDueDate: date('next_due_date'),
  vaccineProvider: varchar('vaccine_provider', { length: 200 }),
  
  // Emergency Contact specific fields
  contactName: varchar('contact_name', { length: 200 }),
  contactPhone: varchar('contact_phone', { length: 20 }),
  relationship: varchar('relationship', { length: 100 }),
  
  // Allergy specific fields
  allergen: varchar('allergen', { length: 200 }),
  reaction: text('reaction'),
  allergySeverity: varchar('allergy_severity', { length: 50 }),
  
  // Exercise/Therapy specific fields
  activityType: varchar('activity_type', { length: 200 }),
  duration: varchar('duration', { length: 50 }),
  exerciseFrequency: varchar('exercise_frequency', { length: 100 }),
  therapist: varchar('therapist', { length: 200 }),
  sessionDate: date('session_date'),
  
  // Recurrence fields for recurring activities
  isRecurring: boolean('is_recurring').default(false),
  recurrencePattern: varchar('recurrence_pattern', { length: 20 }), // daily, weekly, monthly, one-time
  recurrenceTime: varchar('recurrence_time', { length: 10 }), // HH:MM format
  startDate: date('start_date'),
  endDate: date('end_date'), // Optional - null means ongoing
  recurrenceDays: varchar('recurrence_days', { length: 50 }), // For weekly: "mon,wed,fri" or daily: null

  createdAt: timestamp('created_at').defaultNow(),
});

// BENEFITS TABLE
export const benefits = pgTable('benefits', {
  id: serial('id').primaryKey(),
  seniorId: integer('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  benefitType: varchar('benefit_type', { length: 100 }).notNull(),
  applicationDate: date('application_date'),
  renewalDate: date('renewal_date'),
  amount: varchar('amount', { length: 50 }),
  status: varchar('status', { length: 50 }),
  caseWorker: varchar('case_worker', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// PROGRAMS TABLE
export const programs = pgTable('programs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  scheduleDays: text('schedule_days'),
  location: varchar('location', { length: 200 }),
  instructor: varchar('instructor', { length: 100 }),
  capacity: integer('capacity').default(20),
  cost: varchar('cost', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ENROLLMENTS TABLE
export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  seniorId: integer('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  programId: integer('program_id').references(() => programs.id, { onDelete: 'cascade' }).notNull(),
  enrollmentDate: date('enrollment_date').defaultNow(),
  status: varchar('status', { length: 50 }).default('active'),
  attendanceCount: integer('attendance_count').default(0),
  completionPercentage: integer('completion_percentage').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// CONTACTS TABLE
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  seniorId: integer('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  relationship: varchar('relationship', { length: 50 }),
  role: varchar('role', { length: 50 }),
  isEmergency: boolean('is_emergency').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});


// REFRESH TOKENS TABLE
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), // references users.id
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// STAFF ASSIGNMENTS TABLE - Simple staff-to-senior assignments
export const staffAssignments = pgTable('staff_assignments', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').notNull(), // references users.id (staff)
  seniorId: integer('senior_id').notNull(), // references users.id (senior)
  assignedBy: integer('assigned_by'), // Keep existing column - admin who made assignment
  assignedAt: timestamp('assigned_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  notes: text('notes'), // Assignment notes
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// REACTIVATION REQUESTS TABLE
export const reactivationRequests = pgTable('reactivation_requests', {
  id: serial('id').primaryKey(),
  requestedBy: integer('requested_by').references(() => users.id, { onDelete: 'cascade' }).notNull(), // Staff who requested
  reason: text('reason').notNull(), // Why reactivation is needed
  status: varchar('status', { length: 20 }).default('pending'), // pending, approved, denied
  reviewedBy: integer('reviewed_by').references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'), // Admin's notes on decision
  requestedAt: timestamp('requested_at').defaultNow(),
});

// USER AUDIT LOG TABLE
export const userAuditLog = pgTable('user_audit_log', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow(),
});