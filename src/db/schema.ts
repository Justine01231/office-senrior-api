// src/db/schema.ts
import { pgTable, uuid, varchar, text, date, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

// ============================================
// 1. SENIORS TABLE
// ============================================
export const seniors = pgTable('seniors', {
    id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
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

// ============================================
// 2. HEALTH_RECORDS TABLE
// ============================================
export const healthRecords = pgTable('health_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  seniorId: uuid('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'condition', 'medication', 'appointment'
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  dateTime: timestamp('date_time'),
  reminderTime: varchar('reminder_time', { length: 10 }), // e.g., "08:00"
  dosage: varchar('dosage', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 3. BENEFITS TABLE
// ============================================
export const benefits = pgTable('benefits', {
  id: uuid('id').primaryKey().defaultRandom(),
  seniorId: uuid('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  benefitType: varchar('benefit_type', { length: 100 }).notNull(),
  applicationDate: date('application_date'),
  renewalDate: date('renewal_date'),
  amount: varchar('amount', { length: 50 }),
  status: varchar('status', { length: 50 }),
  caseWorker: varchar('case_worker', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 4. PROGRAMS TABLE
// ============================================
export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  scheduleDays: text('schedule_days'), // JSON string or comma-separated
  location: varchar('location', { length: 200 }),
  instructor: varchar('instructor', { length: 100 }),
  capacity: integer('capacity').default(20),
  cost: varchar('cost', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 5. ENROLLMENTS TABLE
// ============================================
export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  seniorId: uuid('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }).notNull(),
  enrollmentDate: date('enrollment_date').defaultNow(),
  status: varchar('status', { length: 50 }).default('active'),
  attendanceCount: integer('attendance_count').default(0),
  completionPercentage: integer('completion_percentage').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 6. CONTACTS TABLE
// ============================================
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  seniorId: uuid('senior_id').references(() => seniors.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  relationship: varchar('relationship', { length: 50 }),
  role: varchar('role', { length: 50 }),
  isEmergency: boolean('is_emergency').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// ============================================
// 7. NOTIFICATIONS TABLE
// ============================================
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  seniorId: uuid('senior_id').references(() => seniors.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).default('normal'),
  scheduledTime: timestamp('scheduled_time'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});