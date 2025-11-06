CREATE TABLE "reactivation_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requested_by" integer NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	"requested_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "health_records" DROP CONSTRAINT "health_records_senior_id_seniors_id_fk";
--> statement-breakpoint
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_staff_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_senior_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_assigned_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "seniors" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_assignments" ALTER COLUMN "assigned_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "medicine_name" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "dosage" varchar(100);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "frequency" varchar(100);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "refill_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "doctor_name" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "location" varchar(300);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "appointment_date" timestamp;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "severity" varchar(50);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "diagnosed_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "treatment" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "test_type" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "test_results" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "lab_facility" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "test_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "vaccine_name" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "vaccination_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "next_due_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "vaccine_provider" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "contact_name" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "contact_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "relationship" varchar(100);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "allergen" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "reaction" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "allergy_severity" varchar(50);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "activity_type" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "duration" varchar(50);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "exercise_frequency" varchar(100);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "therapist" varchar(200);--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "session_date" date;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "social_security" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_contact_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_contact_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "photo_path" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approval_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "reactivation_requests" ADD CONSTRAINT "reactivation_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactivation_requests" ADD CONSTRAINT "reactivation_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "last_name";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "date_of_birth";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "social_security";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "emergency_contact_name";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "emergency_contact_phone";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "photo_path";--> statement-breakpoint
ALTER TABLE "seniors" DROP COLUMN "status";