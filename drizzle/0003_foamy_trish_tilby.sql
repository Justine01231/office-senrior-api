ALTER TABLE "seniors" DROP CONSTRAINT "seniors_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "staff_assignments" DROP CONSTRAINT "staff_assignments_senior_id_seniors_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_assigned_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "position" varchar(100);--> statement-breakpoint
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;