// src/db/schema.ts
import { pgTable, serial, varchar, text, date, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// USERS TABLE - Authentication (moved to top to avoid circular reference)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('senior'), // admin, staff, senior
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  assignedBy: integer('assigned_by').references(() => users.id), // For staff created by admin
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SENIORS TABLE
export const seniors = pgTable('seniors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  dateOfBirth: date('date_of_birth').notNull(),
  socialSecurity: varchar('social_security', { length: 50 }),
  emergencyContactName: varchar('emergency_contact_name', { length: 100 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  photoPath: varchar('photo_path', { length: 255 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// HEALTH_RECORDS TABLE
export const healthRecords = pgTable('health_records', {
  id: serial('id').primaryKey(),
  seniorId: integer('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  dateTime: timestamp('date_time'),
  reminderTime: varchar('reminder_time', { length: 10 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'),
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
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// STAFF ASSIGNMENTS TABLE - Which staff manages which seniors
export const staffAssignments = pgTable('staff_assignments', {
  id: serial('id').primaryKey(),
  staffId: integer('staff_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seniorId: integer('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  assignedBy: integer('assigned_by').references(() => users.id).notNull(), // Admin who made assignment
  assignedAt: timestamp('assigned_at').defaultNow(),
  isActive: boolean('is_active').default(true),
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