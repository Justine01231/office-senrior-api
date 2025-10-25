CREATE TABLE "staff_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"senior_id" integer NOT NULL,
	"assigned_by" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'senior';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assigned_by" integer;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_senior_id_seniors_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."seniors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");